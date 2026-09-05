import { NextResponse } from "next/server";
import { createRequire } from "node:module";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import {
  etiketAdresi,
  etiketKoduBicimle,
  etiketKoduNormalize,
} from "@/lib/tags";
import { baskiciPaketiUretilebilirMi } from "@/lib/baski-yapilandirmasi";
import {
  ARAC_SVG_MM,
  URETIM_TABAN_ADRESI,
  baskiciPaketiOlustur,
  bugununPartiEtiketi,
  paketDosyaAdi,
  svgOlcuUygula,
  uretimNotuMetni,
  type BaskiciEtiketi,
} from "@/lib/baskici-paketi";

/**
 * Baskıcı QR paketi indirme (yalnızca yönetici).
 *
 * ─────────────────────────────────────────────────────────────
 * İSTEMCİ AKTİVASYON KODU GÖNDERMEZ
 *
 * İstek gövdesinde YALNIZCA `publicToken` listesi ve ürün kodu bulunur.
 * Aktivasyon kodu ne istekte gider ne de bu uçta okunur — zaten
 * veritabanında düz metin olarak yoktur, yalnızca SHA-256 özeti vardır.
 *
 * QR ADRESİ YENİDEN TAHMİN EDİLMEZ
 * Adres, üretimde kullanılan `etiketAdresi()` yardımcısıyla ve
 * veritabanındaki gerçek `publicToken` ile kurulur. İstemciden gelen
 * hiçbir adres kabul edilmez; istemci yalnızca hangi etiketleri istediğini
 * söyler, adresin ne olduğunu sunucu bilir.
 *
 * PARTİ DOĞRULAMASI
 * Gönderilen her token veritabanında aranır. Bulunamayan tek bir token
 * varsa istek tamamen reddedilir — yarım paket üretilmez. Ayrıca
 * etiketlerin hepsi istenen ürüne ait olmalıdır; farklı partiden veya
 * farklı üründen etiket karıştırılamaz.
 * ─────────────────────────────────────────────────────────────
 */

/** Tek pakette izin verilen en fazla etiket (üretim üst sınırıyla aynı). */
const EN_FAZLA = 500;

/**
 * Üretilen arşivin üst sınırı.
 *
 * Tarayıcı belleğe alarak indirir; sınırsız bırakılsaydı büyük bir istek
 * hem sunucuyu hem indiren makineyi zorlardı. Sınır aşılırsa paket
 * gönderilmez, daha küçük seçim istenir.
 */
const EN_FAZLA_ZIP_BAYT = 25 * 1024 * 1024;

/** QR sessiz alanı — 30x30 mm baskı akışıyla aynı değer. */
const SESSIZ_ALAN_MODUL = 4;

/** Bu uç Node çalışma zamanı gerektirir (zlib ve react-dom/server). */
export const runtime = "nodejs";

/**
 * QR SVG'sini Node tarafında üretir.
 *
 * NEDEN BU KADAR DOLAMBAÇLI?
 * `qrcode.react` bir React bileşenidir ve içinde `useMemo` kullanır. Route
 * Handler'lar Next'in sunucu katmanında derlendiği için burada iki ayrı
 * tuzak vardır ve İKİSİ DE production'da 500 üretmiştir:
 *
 *  1) Paket route bundle'ına gömülürse `react` Next'in sunucu bileşeni
 *     çalışma zamanına bağlanır; orada hook'lar yoktur ve render sırasında
 *     "Cannot read properties of null (reading 'useMemo')" fırlar.
 *
 *  2) Yalnızca bileşen dışarı alınırsa bu kez İKİ AYRI React KOPYASI oluşur:
 *     bileşen node_modules/react ile çalışır, onu render eden bundle içindeki
 *     react-dom/server ise kendi React kopyasının dispatcher'ını kurar.
 *     Dispatcher eşleşmediği için hook yine null gelir.
 *
 * Çözüm: bileşen de renderer da AYNI gerçek node_modules kopyasından
 * yüklenir. `qrcode.react` next.config.mjs içinde dışarıda bırakılır;
 * Bunun için `qrcode.react` ve `react-dom` next.config.mjs içinde sunucu
 * bundle'ının DIŞINDA bırakılır; dosyaların sunucusuz pakete girmesi
 * `outputFileTracingIncludes` ile garanti altına alınır.
 */
const nodeRequire = createRequire(import.meta.url);

function qrSvgUret(adres: string): string {
  const React = nodeRequire("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server");
  const { QRCodeSVG } = nodeRequire("qrcode.react");

  return renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: adres,
      level: "M",
      marginSize: SESSIZ_ALAN_MODUL,
      bgColor: "#ffffff",
      fgColor: "#000000",
    })
  );
}

/** QR dosyası üretilemediğinde fırlatılır; mesajı yalnızca teknik sebeptir. */
class QrUretilemedi extends Error {}

function hata(mesaj: string, durum: number) {
  // Mesajlar sabittir; sistem detayı, token veya kayıt bilgisi taşımaz.
  return NextResponse.json({ error: mesaj }, { status: durum });
}

/**
 * İstemcinin gönderdiği seçimi çözer.
 *
 * İki giriş biçimi vardır ve YALNIZCA BİRİ kullanılabilir:
 *   - `publicTokens` : etiketler yeni üretildi, tokenlar hâlâ bellekte.
 *   - `tagKodlari`   : stoktan seçim; ekranda token gösterilmez, basılan
 *                      etiket kodu (ARK-XXXX-XXXX) kullanılır.
 *
 * Her iki durumda da değerler tekilleştirilir ve boş değerler atılır.
 */
function secimiCoz(govde: unknown): {
  alan: "publicToken" | "code";
  degerler: string[];
} | null {
  const kayit = (govde ?? {}) as Record<string, unknown>;

  const tokenlar = Array.isArray(kayit.publicTokens) ? kayit.publicTokens : null;
  const kodlar = Array.isArray(kayit.tagKodlari) ? kayit.tagKodlari : null;

  if ((tokenlar && kodlar) || (!tokenlar && !kodlar)) {
    return null;
  }

  const ham: unknown[] = tokenlar ?? kodlar ?? [];

  /*
    Tekilleştirme NORMALLEŞTİRMEDEN SONRA yapılır. Önce yapılsaydı
    "ARK-AAAA-BBBB" ile "ark aaaa bbbb" ayrı iki değer sayılır, sorgudan tek
    satır dönerdi ve istek "etiket bu partiye ait değil" diye reddedilirdi.
  */
  const degerler = Array.from(
    new Set(
      ham
        .map((deger) => String(deger ?? "").trim())
        .filter((deger) => deger.length > 0)
        // Etiket kodu veritabanında normalleştirilmiş (tiresiz) durur.
        .map((deger) => (tokenlar ? deger : etiketKoduNormalize(deger)))
    )
  );

  if (degerler.length === 0) {
    return null;
  }

  return { alan: tokenlar ? "publicToken" : "code", degerler };
}

/**
 * Tek etiketin baskıya hazır SVG'sini üretir.
 *
 * Hata durumunda sebep TEKNİK metinle sarmalanır; QR adresi, token veya
 * etiket kodu hata metnine KONMAZ (log ve yanıt bu metinden beslenir).
 */
function qrDosyasiUret(qrAdresi: string): string {
  try {
    return svgOlcuUygula(qrSvgUret(qrAdresi), ARAC_SVG_MM);
  } catch (sebep) {
    throw new QrUretilemedi(
      sebep instanceof Error ? sebep.message : "bilinmeyen hata"
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await yoneticiErisimi();

    if (!admin) {
      return hata("Bu işlem için yönetici girişi gerekiyor.", 401);
    }

    const body = await request.json();

    const productKod = String(body.productKod || "").trim();
    const urun = SIPARIS_URUNLERI.find((u) => u.kod === productKod);

    if (!urun) {
      return hata("Geçerli bir ürün türü seçin.", 400);
    }

    /*
      Baskı kararı tek merkezden gelir (src/lib/baski-yapilandirmasi.ts).
      Ölçüsü tanımlanmamış ürünler için paket üretilmez; aksi hâlde yanlış
      ölçüde basılmış etiketler ortaya çıkardı.
    */
    if (!baskiciPaketiUretilebilirMi(urun.kod)) {
      return hata(
        "Bu ürün için baskı ölçüsü henüz tanımlanmadı; paket üretilemez.",
        400
      );
    }

    const secim = secimiCoz(body);

    if (!secim) {
      return hata("Paket için etiket listesi boş olamaz.", 400);
    }

    if (secim.degerler.length > EN_FAZLA) {
      return hata(`Tek pakette en fazla ${EN_FAZLA} etiket olabilir.`, 400);
    }

    /*
      Yalnızca istenen ürüne ait ve gerçekten var olan etiketler.
      `select` dar tutulur: e-posta, sipariş, kullanıcı gibi alanlar
      sorgudan hiç dönmez, bu yüzden yanlışlıkla pakete sızamazlar.
      Sorgu SALT OKUNURDUR; hiçbir kayıt değiştirilmez.
    */
    const etiketler = await prisma.tag.findMany({
      where:
        secim.alan === "publicToken"
          ? { publicToken: { in: secim.degerler }, productKod: urun.kod }
          : { code: { in: secim.degerler }, productKod: urun.kod },
      select: { code: true, publicToken: true },
      orderBy: { createdAt: "asc" },
    });

    if (etiketler.length !== secim.degerler.length) {
      return hata(
        "Seçilen etiketler bu partiye ait değil. Paket oluşturulmadı.",
        409
      );
    }

    const paketEtiketleri: BaskiciEtiketi[] = etiketler.map((etiket) => {
      /*
        Adres ORTAM DEĞİŞKENİNDEN değil, sabit üretim adresinden kurulur.
        Baskıya giden QR'ın localhost veya önizleme adresine gitmesi geri
        alınamaz bir hatadır.
      */
      const qrAdresi = etiketAdresi(etiket.publicToken, URETIM_TABAN_ADRESI);

      return {
        etiketKodu: etiketKoduBicimle(etiket.code),
        qrAdresi,
        // Fiziksel ölçü SVG'nin içine yazılır; matbaa elle ölçeklemez.
        qrSvg: qrDosyasiUret(qrAdresi),
      };
    });

    const zip = baskiciPaketiOlustur(paketEtiketleri, urun.ad, {
      uretimNotu: uretimNotuMetni(),
    });

    if (zip.length > EN_FAZLA_ZIP_BAYT) {
      return hata(
        "Paket çok büyük. Daha az etiket seçip tekrar deneyin.",
        413
      );
    }

    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${paketDosyaAdi(
          urun.kod,
          bugununPartiEtiketi()
        )}"`,
        "Content-Length": String(zip.length),
        // Paket önbelleğe alınmaz; ara sunucularda kopyası kalmasın.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    /*
      Kayda YALNIZCA hata metni yazılır. Yığın izi, QR adresi, publicToken,
      çerez ve aktivasyon kodu loglanmaz — bu uç yönetici içindir ama log
      kayıtları daha geniş bir çevrede saklanır.
    */
    const sebep = error instanceof Error ? error.message : "bilinmeyen hata";

    console.error("Baskıcı paketi hatası:", sebep);

    if (error instanceof QrUretilemedi) {
      return hata(
        `QR dosyası üretilemedi, paket oluşturulmadı (${sebep}). Etiketler değişmedi.`,
        500
      );
    }

    return hata(
      "Baskı paketi oluşturulamadı. Etiketler ve stok değişmedi; tekrar deneyebilirsiniz.",
      500
    );
  }
}
