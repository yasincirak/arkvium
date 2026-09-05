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
import { baskiciAyariAl } from "@/lib/baski-yapilandirmasi";
import {
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
 * ETİKET KODUNDA İKİ ADAY ARANIR.
 * Kodlar normalde `etiketKoduNormalize` biçiminde saklanır. Ancak elle
 * eklenmiş veya eski kayıtlarda ham değer bu biçime UYMAYABİLİR (örneğin
 * I/L harfleri normalleştirmede 1'e döner). Tek biçimle arandığında böyle
 * bir kayıt ekranda görünüp seçildiğinde "bulunamadı" hatası veriyordu.
 * Bu yüzden her seçim için hem normalleştirilmiş hem ham (yalnızca boşluk
 * ve tire temizlenmiş) biçim aday olarak aranır.
 *
 * Tekilleştirme adaylara göre yapılır; aynı etiketin farklı yazımları tek
 * seçim sayılır.
 */
type Secim = {
  alan: "publicToken" | "code";
  /** Her seçim için kabul edilebilir değerler. */
  secimler: { girdi: string; adaylar: string[] }[];
  /** Veritabanı sorgusuna girecek tüm adaylar. */
  tumAdaylar: string[];
};

function secimiCoz(govde: unknown): Secim | null {
  const kayit = (govde ?? {}) as Record<string, unknown>;

  const tokenlar = Array.isArray(kayit.publicTokens) ? kayit.publicTokens : null;
  const kodlar = Array.isArray(kayit.tagKodlari) ? kayit.tagKodlari : null;

  if ((tokenlar && kodlar) || (!tokenlar && !kodlar)) {
    return null;
  }

  const ham: unknown[] = tokenlar ?? kodlar ?? [];

  const girdiler = ham
    .map((deger) => String(deger ?? "").trim())
    .filter((deger) => deger.length > 0);

  const secimler: Secim["secimler"] = [];
  const gorulen = new Set<string>();

  for (const girdi of girdiler) {
    const adaylar = tokenlar
      ? [girdi]
      : Array.from(
          new Set([
            etiketKoduNormalize(girdi),
            girdi.toUpperCase().replace(/[\s-]/g, ""),
          ])
        );

    // Aynı etiketin farklı yazımı tek seçim sayılır.
    const anahtar = adaylar.join("|");

    if (gorulen.has(anahtar)) {
      continue;
    }

    gorulen.add(anahtar);
    secimler.push({ girdi, adaylar });
  }

  if (secimler.length === 0) {
    return null;
  }

  return {
    alan: tokenlar ? "publicToken" : "code",
    secimler,
    tumAdaylar: Array.from(new Set(secimler.flatMap((s) => s.adaylar))),
  };
}

/**
 * Tek etiketin baskıya hazır SVG'sini üretir.
 *
 * Hata durumunda sebep TEKNİK metinle sarmalanır; QR adresi, token veya
 * etiket kodu hata metnine KONMAZ (log ve yanıt bu metinden beslenir).
 */
function qrDosyasiUret(
  qrAdresi: string,
  ayar: { qrMm: number; enAzSessizAlanMm: number }
): string {
  try {
    return svgOlcuUygula(qrSvgUret(qrAdresi), ayar.qrMm, ayar.enAzSessizAlanMm);
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
    const ayar = baskiciAyariAl(urun.kod);

    if (!ayar) {
      return hata(
        "Bu ürün için baskı ölçüsü henüz tanımlanmadı; paket üretilemez.",
        400
      );
    }

    const secim = secimiCoz(body);

    if (!secim) {
      return hata("Paket için etiket listesi boş olamaz.", 400);
    }

    if (secim.secimler.length > EN_FAZLA) {
      return hata(`Tek pakette en fazla ${EN_FAZLA} etiket olabilir.`, 400);
    }

    /*
      Yalnızca istenen ürüne ait ve gerçekten var olan etiketler.
      `select` dar tutulur: e-posta, sipariş, kullanıcı gibi alanlar
      sorgudan hiç dönmez, bu yüzden yanlışlıkla pakete sızamazlar.
      Sorgu SALT OKUNURDUR; hiçbir kayıt değiştirilmez.
    */
    const bulunanlar = await prisma.tag.findMany({
      where:
        secim.alan === "publicToken"
          ? { publicToken: { in: secim.tumAdaylar }, productKod: urun.kod }
          : { code: { in: secim.tumAdaylar }, productKod: urun.kod },
      select: { code: true, publicToken: true },
      orderBy: { createdAt: "asc" },
    });

    /*
      TAM EŞLEŞME ŞARTI.

      Her seçim TEK bir kayda karşılık gelmeli; bir kayıt da yalnızca bir
      seçime bağlanmalıdır. Tek bir seçim bile karşılıksızsa paket
      ÜRETİLMEZ: eksik listeyle devam etmek, üreticiye "yanlış ama geçerli
      görünen" bir paket göndermek demektir.
    */
    const eslesenler = new Map<string, (typeof bulunanlar)[number]>();
    const eksikler: string[] = [];

    for (const secilen of secim.secimler) {
      const kayit = bulunanlar.find((aday) => {
        const deger = secim.alan === "publicToken" ? aday.publicToken : aday.code;

        return secilen.adaylar.includes(deger);
      });

      if (!kayit || eslesenler.has(kayit.publicToken)) {
        eksikler.push(secilen.girdi);

        continue;
      }

      eslesenler.set(kayit.publicToken, kayit);
    }

    if (eksikler.length > 0) {
      // publicToken gizlidir; yalnızca SAYISI bildirilir. Etiket kodu ise
      // etiketin üzerinde basılıdır, yöneticinin görmesi gerekir.
      const ayrinti =
        secim.alan === "code"
          ? ` Eşleşmeyen kod: ${eksikler.slice(0, 5).join(", ")}`
          : ` ${eksikler.length} etiket bulunamadı.`;

      return hata(
        `Seçilen etiketlerin hepsi bu ürüne ait değil; paket oluşturulmadı.${ayrinti}`,
        409
      );
    }

    const etiketler = Array.from(eslesenler.values());

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
        qrSvg: qrDosyasiUret(qrAdresi, ayar),
      };
    });

    const zip = baskiciPaketiOlustur(paketEtiketleri, urun.ad, {
      uretimNotu: uretimNotuMetni({
        urunAdi: urun.ad,
        govde: ayar.govde,
        qrMm: ayar.qrMm,
        yontem: ayar.yontem,
      }),
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
          bugununPartiEtiketi(),
          paketEtiketleri.length
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
