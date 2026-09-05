import assert from "node:assert/strict";
import { before, describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { zipOku } from "../helpers/zip-okuyucu.mts";

/**
 * Baskıcı paketi API ucu — yetki ve parti doğrulaması.
 *
 * Veritabanına bağlanılmaz: `@/lib/prisma` sahte bir istemciyle
 * değiştirilir ve gerçek kayıt YAZILMAZ. Etiketler sentetiktir.
 *
 * Doğrulanan güvenlik davranışları:
 *  - Yalnızca ADMIN indirebilir.
 *  - İstenen etiketlerin hepsi gerçekten o ürüne ait olmalı.
 *  - QR adresi sunucuda kurulur; istemciden gelen adres kabul edilmez.
 *  - Aktivasyon kodu ne istekte gider ne de sorguda okunur.
 */

const TABAN_ADRES = "https://ornek-arkvium.test";

/** Baskıcı paketi yalnızca araç ürününde üretilir. */
const ARAC_KODU = "arac-stickeri";

/**
 * Baskıya giden adres ortam değişkeninden BAĞIMSIZDIR; her zaman üretim
 * adresidir. `NEXT_PUBLIC_APP_URL` yukarıda bilerek farklı ayarlanıyor ki
 * ortam değişkeninin sızması testte yakalansın.
 */
const URETIM_ADRESI = "https://www.arkvium.com";

/** Sahte veritabanının döndüreceği etiketler. */
let veritabaniEtiketleri: Array<{ code: string; publicToken: string }> = [];

/** prisma.tag.findMany'ye giden son sorgu — sızıntı denetimi için. */
let sonSorgu: any = null;

/** Oturumun döndüreceği yönetici (null = yetkisiz). */
let yonetici: { userId: string; email: string } | null = null;

const AKTIVASYON_KODU = "ZZZZ-XXXX-CCCC";

before(() => {
  process.env.NEXT_PUBLIC_APP_URL = TABAN_ADRES;

  mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
    exports: {
      prisma: {
        tag: {
          async findMany(sorgu: any) {
            sonSorgu = sorgu;

            // Uç iki yolla sorgulayabilir: yeni üretimde token, stoktan
            // seçimde etiket kodu. Sahte veritabanı ikisini de karşılar.
            if (sorgu.where.publicToken) {
              const istenen: string[] = sorgu.where.publicToken.in;

              return veritabaniEtiketleri.filter((e) =>
                istenen.includes(e.publicToken)
              );
            }

            const kodlar: string[] = sorgu.where.code.in;

            return veritabaniEtiketleri.filter((e) => kodlar.includes(e.code));
          },
        },
      },
    },
  });

  mock.module(pathToFileURL(resolve("src/lib/session.ts")).href, {
    exports: {
      async yoneticiErisimi() {
        return yonetici;
      },
    },
  });
});

async function ucuAl() {
  const modul = await import(
    pathToFileURL(
      resolve("src/app/api/admin/tags/baskici-paketi/route.ts")
    ).href
  );

  return modul.POST;
}

function istek(govde: unknown) {
  return new Request("http://localhost/api/admin/tags/baskici-paketi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(govde),
  });
}

const PARTI = [
  { code: "ARKAAAABBBB", publicToken: "token_bir" },
  { code: "ARKCCCCDDDD", publicToken: "token_iki" },
];

describe("baskıcı paketi ucu — yetki", () => {
  test("oturumsuz istek 401 alır", async () => {
    const POST = await ucuAl();

    yonetici = null;
    veritabaniEtiketleri = PARTI;

    const yanit = await POST(
      istek({ productKod: ARAC_KODU, publicTokens: ["token_bir"] })
    );

    assert.equal(yanit.status, 401);
  });

  test("CUSTOMER isteği 401 alır", async () => {
    const POST = await ucuAl();

    // yoneticiErisimi CUSTOMER için null döner — rol denetimi orada yapılır.
    yonetici = null;

    const yanit = await POST(
      istek({ productKod: ARAC_KODU, publicTokens: ["token_bir"] })
    );

    assert.equal(yanit.status, 401);

    const veri = await yanit.json();
    assert.ok(!("etiketler" in veri), "yetkisiz yanıtta veri dönmemeli");
  });

  test("ADMIN isteği başarılı olur", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    const yanit = await POST(
      istek({
        productKod: ARAC_KODU,
        publicTokens: PARTI.map((e) => e.publicToken),
      })
    );

    assert.equal(yanit.status, 200);
    assert.equal(yanit.headers.get("Content-Type"), "application/zip");
    assert.equal(yanit.headers.get("Cache-Control"), "no-store");
  });
});

describe("baskıcı paketi ucu — parti doğrulaması", () => {
  test("başka partiye ait token pakete giremez", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    const yanit = await POST(
      istek({
        productKod: ARAC_KODU,
        publicTokens: ["token_bir", "baska_partiden_token"],
      })
    );

    assert.equal(yanit.status, 409);

    const veri = await yanit.json();
    assert.ok(!veri.error.includes("baska_partiden_token"), "hata token sızdırıyor");
  });

  test("sorgu ürün koduna göre daraltılır", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    await POST(
      istek({
        productKod: ARAC_KODU,
        publicTokens: PARTI.map((e) => e.publicToken),
      })
    );

    assert.equal(sonSorgu.where.productKod, ARAC_KODU);
  });

  test("sorgu yalnızca kod ve token alanlarını ister", async () => {
    // Dar `select`, kullanıcı/sipariş alanlarının kazara pakete girmesini
    // yapısal olarak engeller.
    assert.deepEqual(Object.keys(sonSorgu.select).sort(), [
      "code",
      "publicToken",
    ]);
    assert.ok(!("activationCodeHash" in sonSorgu.select));
    assert.ok(!("userId" in sonSorgu.select));
  });

  test("geçersiz ürün kodu 400 alır", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };

    const yanit = await POST(
      istek({ productKod: "olmayan-urun", publicTokens: ["token_bir"] })
    );

    assert.equal(yanit.status, 400);
  });

  test("boş liste 400 alır", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };

    const yanit = await POST(
      istek({ productKod: ARAC_KODU, publicTokens: [] })
    );

    assert.equal(yanit.status, 400);
  });
});

describe("baskıcı paketi ucu — üretilen içerik", () => {
  async function paketiAl() {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    const yanit = await POST(
      istek({
        productKod: ARAC_KODU,
        // İstemci aktivasyon kodu gönderse bile sunucu onu OKUMAZ.
        activationCodes: [AKTIVASYON_KODU],
        publicTokens: PARTI.map((e) => e.publicToken),
      })
    );

    return Buffer.from(await yanit.arrayBuffer());
  }

  test("ZIP her etiket için bir SVG ve tek CSV içerir", async () => {
    const dosyalar = zipOku(await paketiAl());

    assert.equal(dosyalar.filter((d) => d.ad.endsWith(".svg")).length, 2);
    assert.equal(dosyalar.filter((d) => d.ad.endsWith(".csv")).length, 1);
  });

  test("QR adresi sunucudaki gerçek token ile kurulur", async () => {
    const dosyalar = zipOku(await paketiAl());

    const csv = dosyalar
      .find((d) => d.ad.endsWith(".csv"))!
      .icerik.toString("utf8");

    for (const etiket of PARTI) {
      assert.ok(
        csv.includes(`${URETIM_ADRESI}/t/${etiket.publicToken}`),
        `${etiket.publicToken} için doğru adres yok`
      );
    }

    // Ortam değişkeni sızmamalı: localhost/önizleme adresi baskıya gidemez.
    assert.ok(!csv.includes(TABAN_ADRES), "ortam değişkeni adrese sızmış");
  });

  test("SVG gerçek QR çizimi içerir ve sessiz alanı korur", async () => {
    const dosyalar = zipOku(await paketiAl());
    const svg = dosyalar
      .find((d) => d.ad.endsWith(".svg"))!
      .icerik.toString("utf8");

    assert.ok(svg.startsWith("<svg"), "SVG değil");
    assert.ok(svg.includes("#ffffff"), "beyaz zemin yok");
    assert.ok(svg.includes("#000000"), "siyah QR yok");

    /*
      Sessiz alan SABİT BİR MODÜL SAYISIYLA doğrulanamaz: QR sürümü adres
      uzunluğuna göre değişir (kısa test adresi 29 modül, canlı adres 37).
      Bu yüzden ölçülen şey oran değil, KENAR BOŞLUĞU: siyah çizimin
      kutunun kenarından kaç modül içeride başladığı.
    */
    const kutu = Number(svg.match(/viewBox="0 0 (\d+) \1"/)?.[1]);
    assert.ok(Number.isInteger(kutu) && kutu > 0, "viewBox okunamadı");

    const siyahYol = svg.match(/fill="#000000" d="([^"]+)"/)?.[1] ?? "";
    const koordinatlar = [...siyahYol.matchAll(/M(\d+) (\d+)h(\d+)/g)].map(
      (m) => ({ x: Number(m[1]), y: Number(m[2]), en: Number(m[3]) })
    );

    assert.ok(koordinatlar.length > 0, "QR çizimi bulunamadı");

    const enKucukX = Math.min(...koordinatlar.map((k) => k.x));
    const enKucukY = Math.min(...koordinatlar.map((k) => k.y));
    const enBuyukX = Math.max(...koordinatlar.map((k) => k.x + k.en));
    const enBuyukY = Math.max(...koordinatlar.map((k) => k.y + 1));

    assert.ok(enKucukX >= 4, `sol sessiz alan ${enKucukX} modül, 4 olmalı`);
    assert.ok(enKucukY >= 4, `üst sessiz alan ${enKucukY} modül, 4 olmalı`);
    assert.ok(
      kutu - enBuyukX >= 4,
      `sağ sessiz alan ${kutu - enBuyukX} modül, 4 olmalı`
    );
    assert.ok(
      kutu - enBuyukY >= 4,
      `alt sessiz alan ${kutu - enBuyukY} modül, 4 olmalı`
    );
  });

  test("istemcinin gönderdiği aktivasyon kodu pakete girmez", async () => {
    const zip = await paketiAl();

    assert.ok(
      !zip.toString("latin1").includes(AKTIVASYON_KODU),
      "istemciden gelen aktivasyon kodu pakete sızmış"
    );
  });

  test("etiket kodu okunabilir biçimde yazılır", async () => {
    const dosyalar = zipOku(await paketiAl());

    assert.ok(dosyalar.some((d) => d.ad === "ARK-AAAA-BBBB.svg"));
    assert.ok(dosyalar.some((d) => d.ad === "ARK-CCCC-DDDD.svg"));
  });
});

describe("baskıcı paketi ucu — ürün türü kapısı", () => {
  test("ölçüsü tanımlanmamış üründe paket üretilmez", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    for (const kod of [
      "metal-anahtarlik",
      "evcil-hayvan-kunyesi",
      "valiz-etiketi",
    ]) {
      const yanit = await POST(
        istek({ productKod: kod, publicTokens: ["token_bir"] })
      );

      assert.equal(yanit.status, 400, `${kod} için paket üretilmemeliydi`);

      const govde = await yanit.json();

      assert.match(govde.error, /tanımlanmadı/i);
    }
  });

  test("30×30 mm ürününde de baskıcı paketi üretilmez", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };

    const yanit = await POST(
      istek({ productKod: "sticker-seti", publicTokens: ["token_bir"] })
    );

    assert.equal(yanit.status, 400);
  });
});

describe("baskıcı paketi ucu — stoktan yeniden indirme", () => {
  async function stokPaketi(kodlar: string[]) {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    return POST(istek({ productKod: ARAC_KODU, tagKodlari: kodlar }));
  }

  test("daha önce üretilmiş etiket kodlarıyla paket alınabilir", async () => {
    const yanit = await stokPaketi(["ARK-AAAA-BBBB", "ARK-CCCC-DDDD"]);

    assert.equal(yanit.status, 200);

    const dosyalar = zipOku(Buffer.from(await yanit.arrayBuffer()));

    assert.equal(dosyalar.filter((d) => d.ad.endsWith(".svg")).length, 2);
  });

  test("etiket kodu tireli veya küçük harfli yazılsa da eşleşir", async () => {
    const yanit = await stokPaketi(["ark-aaaa-bbbb"]);

    assert.equal(yanit.status, 200);
    assert.equal(sonSorgu.where.code.in[0], "ARKAAAABBBB");
  });

  test("yinelenen seçim tekilleştirilir", async () => {
    const yanit = await stokPaketi([
      "ARK-AAAA-BBBB",
      "ARK-AAAA-BBBB",
      "ark aaaa bbbb",
    ]);

    assert.equal(yanit.status, 200);

    const dosyalar = zipOku(Buffer.from(await yanit.arrayBuffer()));

    assert.equal(
      dosyalar.filter((d) => d.ad.endsWith(".svg")).length,
      1,
      "aynı etiket birden fazla kez pakete girmiş"
    );
  });

  test("stok sorgusu da yalnızca kod ve token alanlarını ister", async () => {
    await stokPaketi(["ARK-AAAA-BBBB"]);

    assert.deepEqual(sonSorgu.select, { code: true, publicToken: true });
  });

  test("iki seçim biçimi birlikte gönderilemez", async () => {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };

    const yanit = await POST(
      istek({
        productKod: ARAC_KODU,
        publicTokens: ["token_bir"],
        tagKodlari: ["ARK-AAAA-BBBB"],
      })
    );

    assert.equal(yanit.status, 400);
  });

  test("stokta olmayan kod istenirse paket üretilmez", async () => {
    const yanit = await stokPaketi(["ARK-ZZZZ-ZZZZ"]);

    assert.equal(yanit.status, 409);
  });

  test("oturumsuz stok isteği reddedilir", async () => {
    const POST = await ucuAl();

    yonetici = null;

    const yanit = await POST(
      istek({ productKod: ARAC_KODU, tagKodlari: ["ARK-AAAA-BBBB"] })
    );

    assert.equal(yanit.status, 401);
  });
});

describe("baskıcı paketi ucu — araç paketi içeriği", () => {
  async function aracPaketi() {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    veritabaniEtiketleri = PARTI;

    const yanit = await POST(
      istek({
        productKod: ARAC_KODU,
        publicTokens: PARTI.map((e) => e.publicToken),
      })
    );

    return { yanit, zip: Buffer.from(await yanit.arrayBuffer()) };
  }

  test("ZIP üretim notunu içerir", async () => {
    const { zip } = await aracPaketi();
    const dosyalar = zipOku(zip);

    const not = dosyalar.find((d) => d.ad === "URETIM-NOTU.txt");

    assert.ok(not, "URETIM-NOTU.txt yok");

    const metin = not.icerik.toString("utf8");

    assert.match(metin, /60 x 80 mm/);
    assert.match(metin, /40 x 40 mm/);
    assert.match(metin, /TERS BASKI/);
  });

  test("SVG dosyaları 40 mm ölçüsüyle yazılır", async () => {
    const { zip } = await aracPaketi();

    for (const dosya of zipOku(zip).filter((d) => d.ad.endsWith(".svg"))) {
      const svg = dosya.icerik.toString("utf8");

      assert.match(svg, /width="40mm"/);
      assert.match(svg, /height="40mm"/);
      assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    }
  });

  test("indirilen dosya adı tarih taşır", async () => {
    const { yanit } = await aracPaketi();

    const ad = yanit.headers
      .get("Content-Disposition")
      ?.match(/filename="([^"]+)"/)?.[1];

    assert.match(
      ad ?? "",
      /^arkvium-baskici-arac-stickeri-\d{4}-\d{2}-\d{2}-2etiket\.zip$/
    );
  });

  test("arşivde yalnızca beklenen dosyalar bulunur", async () => {
    const { zip } = await aracPaketi();

    const adlar = zipOku(zip).map((d) => d.ad).sort();

    assert.deepEqual(adlar, [
      "ARK-AAAA-BBBB.svg",
      "ARK-CCCC-DDDD.svg",
      "URETIM-NOTU.txt",
      "baskici-listesi.csv",
    ]);
  });
});

describe("baskıcı paketi ucu — TAM etiket eşleşmesi", () => {
  /**
   * Bu blok gerçek bir production şikâyetinden doğdu: indirilen ZIP'te
   * yeni üretilen etiket yerine ESKİ bir etiket çıktı. Aşağıdaki testler
   * "istenen etiket ne ise pakete tam olarak o girer" kuralını, veritabanında
   * BAŞKA etiketler de varken doğrular.
   */
  const YENI = { code: "ARKN1XXQWDP", publicToken: "token_yeni" };
  const ESKI = { code: "ARKKX2AZZVE", publicToken: "token_eski" };
  const UCUNCU = { code: "ARKTTTT2345", publicToken: "token_ucuncu" };

  async function paket(govde: Record<string, unknown>) {
    const POST = await ucuAl();

    yonetici = { userId: "y1", email: "yonetici@ornek.test" };
    // Veritabanında birden fazla araç etiketi var.
    veritabaniEtiketleri = [ESKI, YENI, UCUNCU];

    return POST(istek({ productKod: ARAC_KODU, ...govde }));
  }

  async function svgAdlari(yanit: Response) {
    return zipOku(Buffer.from(await yanit.arrayBuffer()))
      .filter((d) => d.ad.endsWith(".svg"))
      .map((d) => d.ad)
      .sort();
  }

  test("yeni üretilen tek etiketin tokenı gönderilince yalnızca o etiket paketlenir", async () => {
    const yanit = await paket({ publicTokens: [YENI.publicToken] });

    assert.equal(yanit.status, 200);
    assert.deepEqual(await svgAdlari(yanit), ["ARK-N1XX-QWDP.svg"]);
  });

  test("ARK-N1XX-QWDP istendiğinde ARK-KX2A-ZZVE pakete GİRMEZ", async () => {
    const yanit = await paket({ tagKodlari: ["ARK-N1XX-QWDP"] });

    assert.equal(yanit.status, 200);

    const adlar = await svgAdlari(yanit);

    assert.deepEqual(adlar, ["ARK-N1XX-QWDP.svg"]);
    assert.ok(
      !adlar.includes("ARK-KX2A-ZZVE.svg"),
      "eski etiket pakete sızmış"
    );
  });

  test("iki belirli etiket seçilince yalnızca o ikisi paketlenir", async () => {
    const yanit = await paket({
      tagKodlari: ["ARK-N1XX-QWDP", "ARK-TTTT-2345"],
    });

    assert.equal(yanit.status, 200);
    assert.deepEqual(await svgAdlari(yanit), [
      "ARK-N1XX-QWDP.svg",
      "ARK-TTTT-2345.svg",
    ]);
  });

  test("CSV'deki kodlar SVG dosya adlarıyla birebir eşleşir", async () => {
    const yanit = await paket({
      tagKodlari: ["ARK-N1XX-QWDP", "ARK-TTTT-2345"],
    });

    const dosyalar = zipOku(Buffer.from(await yanit.arrayBuffer()));

    const csv = dosyalar
      .find((d) => d.ad === "baskici-listesi.csv")!
      .icerik.toString("utf8")
      .replace(/^﻿/, "");

    const satirlar = csv.trim().split("\r\n").slice(1);

    assert.equal(satirlar.length, 2);

    for (const satir of satirlar) {
      const alanlar = satir.split(";").map((a) => a.replace(/^"|"$/g, ""));
      const [, etiketKodu, , qrDosyasi] = alanlar;

      assert.equal(qrDosyasi, `${etiketKodu}.svg`);
      assert.ok(
        dosyalar.some((d) => d.ad === qrDosyasi),
        `${qrDosyasi} arşivde yok`
      );
    }
  });

  test("bilinmeyen kod istenirse paket üretilmez ve eşleşmeyen kod bildirilir", async () => {
    const yanit = await paket({ tagKodlari: ["ARK-0000-0000"] });

    assert.equal(yanit.status, 409);

    const govde = await yanit.json();

    assert.match(govde.error, /ARK-0000-0000/);
  });

  test("var olan ve olmayan kod birlikte gönderilirse hiç paket üretilmez", async () => {
    const yanit = await paket({
      tagKodlari: ["ARK-N1XX-QWDP", "ARK-0000-0000"],
    });

    assert.equal(yanit.status, 409);
  });

  test("boş seçim reddedilir", async () => {
    assert.equal((await paket({ tagKodlari: [] })).status, 400);
    assert.equal((await paket({ publicTokens: [] })).status, 400);
  });

  test("yinelenen seçim tek etiket üretir", async () => {
    const yanit = await paket({
      tagKodlari: ["ARK-N1XX-QWDP", "ark n1xx qwdp", "ARKN1XXQWDP"],
    });

    assert.equal(yanit.status, 200);
    assert.deepEqual(await svgAdlari(yanit), ["ARK-N1XX-QWDP.svg"]);
  });

  test("dosya adında seçilen etiket sayısı bulunur", async () => {
    const tek = await paket({ tagKodlari: ["ARK-N1XX-QWDP"] });
    const cift = await paket({
      tagKodlari: ["ARK-N1XX-QWDP", "ARK-TTTT-2345"],
    });

    const ad = (yanit: Response) =>
      yanit.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1];

    assert.match(ad(tek) ?? "", /-1etiket\.zip$/);
    assert.match(ad(cift) ?? "", /-2etiket\.zip$/);
    assert.notEqual(ad(tek), ad(cift), "iki paket aynı adı taşıyor");
  });
});
