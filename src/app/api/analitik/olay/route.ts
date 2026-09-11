import { NextResponse } from "next/server";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import { getUserSession } from "@/lib/session";
import {
  istemciOlayTuruMu,
  olayKaydet,
  urunKoduGecerliMi,
  yolHaricMi,
  yoluTemizle,
} from "@/lib/analitik";
import {
  ZIYARETCI_COOKIE,
  ziyaretciCookieAyarlari,
  ziyaretciKimligiGecerliMi,
  ziyaretciKimligiUret,
} from "@/lib/analitik-ziyaretci";

/**
 * Müşteri davranışı olay ucu (herkese açık).
 *
 * ────────────────────────────────────────────────────────────
 * GÜVENLİK KURALLARI
 *
 * 1. SATIŞ BU UÇTAN ÜRETİLEMEZ. Yalnızca `page_view`, `product_view`,
 *    `cart_add` ve `cart_remove` kabul edilir. `purchase`,
 *    `checkout_started` ve `payment_failed` türleri REDDEDİLİR (400);
 *    bunlar yalnızca doğrulanmış ödeme sonucundan sunucuda yazılır.
 *
 * 2. YÖNETİCİ ZİYARETLERİ SAYILMAZ. Oturumu ADMIN olan istekte hiçbir
 *    satır yazılmaz ve yanıt yine 200 döner (istemciye bilgi sızmaz).
 *
 * 3. KİŞİSEL VERİ YAZILMAZ. IP adresi yalnızca hız sınırında kullanılır
 *    ve orada da HMAC özeti olarak saklanır (bkz. rate-limit.ts).
 *    User-agent, referrer, e-posta ve konum hiçbir yere yazılmaz.
 *
 * 4. Sorgu dizesi atılır; yalnızca yol kaydedilir.
 *
 * 5. Ziyaretçi kimliği rastgeledir ve kişisel veriden türetilmez.
 *    İstemcinin çereze yazdığı bozuk değer kabul edilmez, yenisi üretilir.
 * ────────────────────────────────────────────────────────────
 *
 * ────────────────────────────────────────────────────────────
 * HIZ SINIRI — İKİ KATMANLI
 *
 * Tek başına IP sınırı PAYLAŞILAN AĞLARDA EKSİK SAYIM üretir: aynı
 * kurumsal ağın veya mobil operatör NAT'ının arkasındaki yüzlerce
 * ziyaretçi tek bir IP olarak görünür ve sınırı hızla doldurup
 * sayılamaz hâle gelirdi.
 *
 * Bu yüzden sınır ikiye ayrıldı:
 *
 *  - ZİYARETÇİ sınırı (`ZIYARETCI_SAATLIK_SINIR`): asıl sınır budur.
 *    Tarayıcı başına uygulanır, paylaşılan IP'den etkilenmez.
 *  - IP tavanı (`IP_SAATLIK_SINIR`): kötüye kullanım tavanı. Yüksek
 *    tutulur ki meşru paylaşılan ağlar takılmasın, ama çerezi sürekli
 *    değiştirerek ziyaretçi sınırından kaçan bir istemci yine de
 *    sınırsız yazamaz.
 *
 * İki sınır BİRLİKTE uygulanır: çerezi olmayan istekte yalnızca IP
 * tavanı geçerlidir.
 * ────────────────────────────────────────────────────────────
 *
 * Sınır aşıldığında 429 döner; sayfa akışı bundan etkilenmez (istemci
 * yanıtı yok sayar).
 */

export const dynamic = "force-dynamic";

/**
 * Bir tarayıcının saatte gönderebileceği en fazla olay sayısı.
 *
 * Normal gezinmede bir ziyaretçi saatte onlarca olay üretir; bu değer
 * meşru kullanımın çok üstünde, kötüye kullanımın çok altındadır.
 */
const ZIYARETCI_SAATLIK_SINIR = 200;

/**
 * Bir IP'nin saatte gönderebileceği en fazla olay sayısı.
 *
 * Paylaşılan ağların (kurumsal NAT, mobil operatör) arkasındaki çok
 * sayıda meşru ziyaretçiyi kapsayacak kadar yüksek tutulur.
 */
const IP_SAATLIK_SINIR = 3000;

/** İsteğin çerez başlığından ziyaretçi kimliğini okur. */
function ziyaretciCereziniOku(request: Request): string | null {
  const deger = request.headers
    .get("cookie")
    ?.split(";")
    .map((parca) => parca.trim())
    .find((parca) => parca.startsWith(`${ZIYARETCI_COOKIE}=`))
    ?.slice(ZIYARETCI_COOKIE.length + 1);

  return ziyaretciKimligiGecerliMi(deger) ? deger : null;
}

function cokFazlaIstek(bekleSaniye: number): NextResponse {
  return NextResponse.json(
    { error: "Çok fazla istek." },
    {
      status: 429,
      headers: { "Retry-After": String(bekleSaniye) },
    }
  );
}

export async function POST(request: Request) {
  try {
    /*
      SIRA ÖNEMLİ: veritabanına dokunmayan denetimler önce yapılır.
      Geçersiz veya sayılmayacak istekler tek bir sorgu bile üretmeden
      elenir; hız sınırı sayaçları da boşuna şişmez.
    */
    const body = await request.json().catch(() => null);
    const tur = body?.tur;

    if (!istemciOlayTuruMu(tur)) {
      return NextResponse.json({ error: "Geçersiz olay." }, { status: 400 });
    }

    const yol = yoluTemizle(body?.yol);

    if (yolHaricMi(yol)) {
      // Yönetim ve hesap alanı müşteri istatistiğine girmez.
      return NextResponse.json({ success: true, kaydedildi: false });
    }

    const urunKodu = urunKoduGecerliMi(body?.urunKodu) ? body.urunKodu : null;

    // Ürün olaylarında geçerli bir ürün kodu zorunludur; aksi hâlde
    // ürün bazlı rapor "bilinmeyen" satırlarla kirlenir.
    if (
      (tur === "product_view" || tur === "cart_add" || tur === "cart_remove") &&
      !urunKodu
    ) {
      return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
    }

    /*
      Yönetici denetimi hız sınırından ÖNCE yapılır: oturum çerezi
      olmayan ziyaretçi için `getUserSession` hiç sorgu üretmez (token
      yoksa doğrudan null döner), yönetici ise sayaçları boşuna
      harcamaz.
    */
    const oturum = await getUserSession();

    if (oturum?.role === "ADMIN") {
      // Yönetici ziyareti sayılmaz. Yanıt ayırt edilemez tutulur.
      return NextResponse.json({ success: true, kaydedildi: false });
    }

    const mevcutKimlik = ziyaretciCereziniOku(request);

    // 1. katman: tarayıcı başına sınır (paylaşılan IP'den etkilenmez).
    if (mevcutKimlik) {
      const ziyaretciSiniri = await hizSiniriKontrol({
        kapsam: "analitik-olay-ziyaretci",
        tanimlayici: mevcutKimlik,
        limit: ZIYARETCI_SAATLIK_SINIR,
        pencereSaniye: 60 * 60,
      });

      if (!ziyaretciSiniri.izinli) {
        return cokFazlaIstek(ziyaretciSiniri.bekleSaniye);
      }
    }

    // 2. katman: IP tavanı (çerez döndürerek kaçmaya karşı).
    const ipSiniri = await hizSiniriKontrol({
      kapsam: "analitik-olay-ip",
      tanimlayici: istemciIpAdresi(request.headers),
      limit: IP_SAATLIK_SINIR,
      pencereSaniye: 60 * 60,
    });

    if (!ipSiniri.izinli) {
      return cokFazlaIstek(ipSiniri.bekleSaniye);
    }

    const visitorId = mevcutKimlik ?? ziyaretciKimligiUret();

    await olayKaydet({
      type: tur,
      visitorId,
      path: yol,
      productKod: urunKodu,
    });

    const yanit = NextResponse.json({ success: true, kaydedildi: true });

    if (!mevcutKimlik) {
      yanit.cookies.set(ZIYARETCI_COOKIE, visitorId, ziyaretciCookieAyarlari);
    }

    return yanit;
  } catch (hata) {
    console.error("Analitik olay ucu hatası:", (hata as Error)?.name);

    // Analitik hatası ziyaretçiye gösterilmez ve sayfa akışını bozmaz.
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
