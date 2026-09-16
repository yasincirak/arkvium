import assert from "node:assert/strict";
import { before, describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * Tekil etiket QR indirme ucu ve "Ürün Sayfasını Aç" adresi.
 *
 * Veritabanına bağlanılmaz; `@/lib/prisma` ve `@/lib/session` sahte
 * modüllerle değiştirilir. Gerçek etiket veya production verisi
 * kullanılmaz.
 *
 * Doğrulanan davranışlar:
 *  - Yalnızca ADMIN indirebilir (401).
 *  - Bulunamayan etiket 404.
 *  - 30×30 mm akışı tanımlı olmayan ürün 400.
 *  - İptal edilmiş etiketin QR'ı üretilmez (409).
 *  - Çıktı yalnızca herkese açık `/t/<token>` hedefini taşır; aktivasyon
 *    kodu, hash veya kişisel veri içermez.
 *  - Dosya adı etiket koduyla izlenebilir.
 */

const URETIM_ADRESI = "https://www.arkvium.com";

let yonetici: { userId: string; email: string } | null = null;
let etiket: any = null;

const TOKEN = "testte_uretilmis_sahte_public_token_degeri";

before(() => {
  mock.module(pathToFileURL(resolve("src/lib/session.ts")).href, {
    exports: {
      async yoneticiErisimi() {
        return yonetici;
      },
    },
  });

  mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
    exports: {
      prisma: {
        tag: {
          async findUnique() {
            return etiket ? { ...etiket } : null;
          },
        },
      },
    },
  });
});

function sifirla() {
  yonetici = { userId: "admin-1", email: "admin@ornek.test" };

  etiket = {
    code: "ARK1A2B3C4D",
    publicToken: TOKEN,
    productKod: "sticker-seti",
    status: "unused",
  };
}

async function ucuAl() {
  const modul = await import(
    pathToFileURL(resolve("src/app/api/admin/tags/[tagId]/qr/route.ts")).href
  );

  return modul.GET;
}

function istek() {
  return new Request("http://localhost/api/admin/tags/tag-1/qr");
}

describe("tekil QR ucu — yetki ve durum", () => {
  test("oturumsuz istek 401 alır", async () => {
    sifirla();
    yonetici = null;

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "tag-1" } });

    assert.equal(yanit.status, 401);
  });

  test("bulunamayan etiket 404 alır", async () => {
    sifirla();
    etiket = null;

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "yok" } });

    assert.equal(yanit.status, 404);
  });

  test("30x30 akışı olmayan üründe 400 alır", async () => {
    sifirla();
    // Araç sticker'ı baskıcı ZIP paketi kullanır, 30x30 sayfası değil.
    etiket.productKod = "arac-stickeri";

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "tag-1" } });

    assert.equal(yanit.status, 400);
  });

  test("türü atanmamış etikette 400 alır", async () => {
    sifirla();
    etiket.productKod = null;

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "tag-1" } });

    assert.equal(yanit.status, 400);
  });

  test("iptal edilmiş etiketin QR'ı üretilmez (409)", async () => {
    sifirla();
    etiket.status = "revoked";

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "tag-1" } });

    assert.equal(yanit.status, 409);
  });
});

describe("tekil QR ucu — çıktı", () => {
  test("SVG döner ve dosya adı etiket koduyla izlenebilir", async () => {
    sifirla();

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "tag-1" } });

    assert.equal(yanit.status, 200);
    assert.match(yanit.headers.get("content-type") ?? "", /image\/svg\+xml/);

    const dosya = yanit.headers.get("content-disposition") ?? "";

    assert.ok(dosya.includes("attachment"));
    assert.ok(dosya.includes("ARK-1A2B-3C4D"));
    assert.ok(dosya.includes(".svg"));

    // Yönetim çıktısı önbelleğe alınmaz.
    assert.equal(yanit.headers.get("cache-control"), "no-store");
  });

  test("çıktı yalnızca herkese açık QR hedefini taşır", async () => {
    sifirla();

    const GET = await ucuAl();
    const yanit = await GET(istek(), { params: { tagId: "tag-1" } });
    const svg = await yanit.text();

    // Gerçek bir SVG mi?
    assert.match(svg, /^<svg\b/);

    // Ölçü 30x30 mm etiket standardından gelir (mm biriminde yazılır).
    assert.match(svg, /width="[\d.]+mm"/);
    assert.match(svg, /height="[\d.]+mm"/);

    /*
      QR modülleri adresi GÖRÜNÜR metin olarak taşımaz; adresin doğruluğu
      ucun `etiketAdresi()` ile kurduğu değerden gelir. Burada asıl
      denetim, çıktının GİZLİ hiçbir şey taşımamasıdır.
    */
    assert.ok(!svg.includes("activationCode"));
    assert.ok(!svg.includes("activationCodeHash"));
    assert.ok(!svg.toLowerCase().includes("aktivasyon"));
  });

  test("üretim adresi ortam değişkeninden değil sabit kaynaktan gelir", async () => {
    sifirla();
    process.env.NEXT_PUBLIC_APP_URL = "https://yanlis-adres.test";

    const { URETIM_TABAN_ADRESI } = await import("@/lib/baskici-paketi");
    const { etiketAdresi } = await import("@/lib/tags");

    assert.equal(URETIM_TABAN_ADRESI, URETIM_ADRESI);
    assert.equal(
      etiketAdresi(TOKEN, URETIM_TABAN_ADRESI),
      `${URETIM_ADRESI}/t/${TOKEN}`
    );
  });
});

describe("Ürün Sayfasını Aç adresi", () => {
  test("etiketi olan kayıt canonical /t/<token> sayfasına gider", async () => {
    const { urunSayfasiAdresi } = await import(
      "@/lib/etiket-yonetim-kurallari"
    );

    assert.equal(
      urunSayfasiAdresi({ kayitId: "kayit-1", publicToken: TOKEN }),
      `/t/${TOKEN}`
    );
  });

  test("etiketi olmayan eski kayıtta /item/<id> korunur", async () => {
    const { urunSayfasiAdresi } = await import(
      "@/lib/etiket-yonetim-kurallari"
    );

    assert.equal(
      urunSayfasiAdresi({ kayitId: "kayit-1", publicToken: null }),
      "/item/kayit-1"
    );
    assert.equal(
      urunSayfasiAdresi({ kayitId: "kayit-1", publicToken: "   " }),
      "/item/kayit-1"
    );
  });
});
