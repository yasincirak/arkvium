import { prisma } from "./prisma";

/*
  Giriş doğrulaması ayrı dosyadadır (analitik-dogrulama.ts): o kurallar
  veritabanı bağlantısı kurmadan test edilebilmelidir. Buradan yeniden
  dışa aktarılır, çağıran kod tek yerden import eder.
*/
export {
  ISTEMCIDEN_KABUL_EDILEN,
  istemciOlayTuruMu,
  urunKoduGecerliMi,
  yoluTemizle,
  yolHaricMi,
  type AnalitikOlayTuru,
  type IstemciOlayTuru,
} from "./analitik-dogrulama";

import type { AnalitikOlayTuru } from "./analitik-dogrulama";
import { ANALITIK_SAKLAMA_GUNU } from "./analitik-aralik";

export { ANALITIK_SAKLAMA_GUNU } from "./analitik-aralik";

/**
 * Analitik olay kaydı.
 *
 * ────────────────────────────────────────────────────────────
 * GÜVENLİK SINIRI — bu dosyanın en önemli kuralı
 *
 * "Satın alma" olayı TARAYICIDAN ÜRETİLEMEZ. `ISTEMCIDEN_KABUL_EDILEN`
 * listesi yalnızca görüntüleme ve sepet olaylarını içerir; ödeme
 * başlatma, başarısız ödeme ve satış olayları yalnızca sunucu tarafında,
 * doğrulanmış ödeme sonucundan (`src/lib/odeme-servisi.ts`) yazılır.
 *
 * KİŞİSEL VERİ YAZILMAZ: IP adresi, user-agent, e-posta, telefon, adres,
 * ad-soyad ve kart bilgisi bu katmandan hiçbir şekilde geçmez. `path`
 * alanına yalnızca yol yazılır, SORGU DİZESİ ATILIR (içinde token veya
 * kişisel veri taşıyabilir).
 *
 * BİLDİRİM/ANALİTİK HATASI İŞİ BOZMAZ: kayıt fonksiyonları hata
 * fırlatmaz. Analitik yazımı başarısız olsa bile sipariş ve ödeme akışı
 * olduğu gibi devam eder.
 *
 * SAKLAMA SÜRESİ: kayıtlar süresiz tutulmaz; `ANALITIK_SAKLAMA_GUNU`
 * gününden eski satırlar yazma sırasında otomatik temizlenir.
 * ────────────────────────────────────────────────────────────
 */

/**
 * Saklama süresini aşan olayları temizler.
 *
 * `rate-limit.ts` içindeki kalıbın aynısı: her istekte silme sorgusu
 * çalıştırmamak için olasılığa bağlıdır. Ayrı bir zamanlanmış görev
 * (cron) gerekmez — Vercel'de zamanlanmış görev kurmadan çalışır.
 *
 * Temizlik başarısız olursa olay yazımı ETKİLENMEZ.
 */
async function suresiDolanOlaylariTemizle(): Promise<void> {
  if (Math.random() > 0.01) {
    return;
  }

  try {
    await prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: {
          lt: new Date(
            Date.now() - ANALITIK_SAKLAMA_GUNU * 24 * 60 * 60 * 1000
          ),
        },
      },
    });
  } catch {
    // Temizlik başarısız olsa bile analitik çalışmaya devam etmelidir.
  }
}

export type OlayGirdisi = {
  type: AnalitikOlayTuru;
  visitorId?: string | null;
  path?: string | null;
  productKod?: string | null;
  orderId?: string | null;
  valueKurus?: number | null;
  /**
   * Tekillik anahtarı. Doluysa aynı anahtarla ikinci bir satır YAZILMAZ
   * (veritabanı unique kısıtı). Satış olayında `purchase:<orderId>`.
   */
  uniqueKey?: string | null;
};

/**
 * Tek bir olayı yazar.
 *
 * Hata FIRLATMAZ: analitik yazımı çağıran akışı (sipariş, ödeme, sayfa
 * gösterimi) hiçbir koşulda bozmamalıdır. Tekillik çakışmasında (P2002)
 * sessizce false döner.
 *
 * Dönüş: satır gerçekten yazıldıysa true.
 */
export async function olayKaydet(girdi: OlayGirdisi): Promise<boolean> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: girdi.type,
        visitorId: girdi.visitorId ?? null,
        path: girdi.path ?? null,
        productKod: girdi.productKod ?? null,
        orderId: girdi.orderId ?? null,
        valueKurus: girdi.valueKurus ?? null,
        uniqueKey: girdi.uniqueKey ?? null,
      },
      select: { id: true },
    });

    // Temizlik yazma işleminden SONRA yapılır: olayın kaydı temizliğin
    // süresine bağlı kalmaz.
    await suresiDolanOlaylariTemizle();

    return true;
  } catch (hata) {
    // Tekillik çakışması beklenen bir durumdur: aynı satış iki kez
    // sayılmaya çalışılmıştır ve engellenmiştir.
    if ((hata as { code?: string })?.code === "P2002") {
      return false;
    }

    console.error("Analitik olayı yazılamadı:", (hata as Error)?.name);

    return false;
  }
}

/**
 * Ödeme başlatma olayı (sunucu tarafı).
 *
 * `/api/payment/start` içinden, ödeme oturumu sağlayıcıda gerçekten
 * açıldıktan SONRA çağrılır.
 */
export async function odemeBaslatmaOlayi(girdi: {
  visitorId: string | null;
  orderId: string;
  productKod: string | null;
  valueKurus: number;
}): Promise<void> {
  await olayKaydet({
    type: "checkout_started",
    visitorId: girdi.visitorId,
    orderId: girdi.orderId,
    productKod: girdi.productKod,
    valueKurus: girdi.valueKurus,
  });
}

/**
 * Satış olayının tekillik anahtarı.
 *
 * Bir sipariş için EN FAZLA BİR satış satırı oluşabilmesinin tek gerçek
 * garantisi budur (veritabanı unique kısıtı).
 */
export function satisAnahtari(orderId: string): string {
  return `purchase:${orderId}`;
}

/**
 * Başarılı satın alma olayı (yalnızca sunucu tarafı).
 *
 * Ziyaretçi kimliği sağlayıcı dönüşünde ÇEREZLE GELMEZ (çapraz site
 * POST). Bu yüzden aynı siparişin `checkout_started` olayındaki
 * ziyaretçi kimliği kullanılır; böylece "sepete ekleyip satın almayan"
 * hesabı doğru çalışır.
 */
export async function satinAlmaOlayi(girdi: {
  orderId: string;
  productKod: string | null;
  valueKurus: number;
}): Promise<boolean> {
  let visitorId: string | null = null;

  try {
    const baslatma = await prisma.analyticsEvent.findFirst({
      where: {
        orderId: girdi.orderId,
        type: "checkout_started",
        visitorId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { visitorId: true },
    });

    visitorId = baslatma?.visitorId ?? null;
  } catch (hata) {
    console.error(
      "Satış olayı için ziyaretçi eşleştirilemedi:",
      (hata as Error)?.name
    );
  }

  return olayKaydet({
    type: "purchase",
    visitorId,
    orderId: girdi.orderId,
    productKod: girdi.productKod,
    valueKurus: girdi.valueKurus,
    uniqueKey: satisAnahtari(girdi.orderId),
  });
}

/** Başarısız ödeme olayı (yalnızca sunucu tarafı). */
export async function odemeBasarisizOlayi(girdi: {
  orderId: string;
  productKod: string | null;
  paymentId: string;
}): Promise<void> {
  await olayKaydet({
    type: "payment_failed",
    orderId: girdi.orderId,
    productKod: girdi.productKod,
    // Aynı ödeme denemesi için tek satır; tekrar gelen bildirim
    // başarısızlığı ikinci kez saymaz.
    uniqueKey: `payment_failed:${girdi.paymentId}`,
  });
}

/**
 * Siparişin tek ürün kodunu döndürür.
 *
 * Sipariş birden çok farklı ürün içeriyorsa null döner: tek bir olay
 * satırına birden çok ürün yazılamaz ve yanlış ürüne satış yazmak
 * ürün bazlı dönüşümü bozardı. Ürün bazlı satış ve gelir raporu zaten
 * `OrderItem` tablosundan hesaplanır.
 */
export async function siparisinTekUrunKodu(
  orderId: string
): Promise<string | null> {
  try {
    const kalemler = await prisma.orderItem.findMany({
      where: { orderId },
      select: { productKod: true },
      take: 2,
    });

    return kalemler.length === 1 ? kalemler[0].productKod : null;
  } catch {
    return null;
  }
}
