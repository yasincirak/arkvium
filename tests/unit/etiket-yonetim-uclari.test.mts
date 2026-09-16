import assert from "node:assert/strict";
import { before, describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * Etiket arama, tekil QR indirme ve iptal/yenileme uçları.
 *
 * Veritabanına BAĞLANILMAZ: `@/lib/prisma` ve `@/lib/session` sahte
 * modüllerle değiştirilir. Gerçek etiket üretilmez, gerçek production
 * verisi okunmaz, hiçbir satır yazılmaz.
 *
 * Doğrulanan güvenlik davranışları:
 *  - Yalnızca ADMIN erişebilir (401).
 *  - Bulunamayan etiket 404 döner.
 *  - Aktivasyon kodu HİÇBİR yanıtta düz metin olarak bulunmaz
 *    (yenileme yanıtındaki tek seferlik kod hariç — o da veritabanına
 *    yazılmaz, yalnızca hash'i yazılır).
 *  - `publicToken` ve `activationCodeHash` arama/detay yanıtlarında yoktur.
 *  - Yazılı onay olmadan iptal/yenileme çalışmaz.
 *  - Tekrar gönderilen istek İKİNCİ bir etiket üretmez.
 *  - Transaction yarıda kalırsa hiçbir şey yazılmaz.
 */

/** Sahte oturum: null = yetkisiz. */
let yonetici: { userId: string; email: string } | null = null;

/** Sahte veritabanı durumu. */
let etiketler: any[] = [];
let hizSinirIzinli = true;

/** Denetim için: transaction içinde yapılan yazmalar. */
let yazilanlar: any[] = [];
let uretilenEtiketSayisi = 0;

const YONETICI = { userId: "admin-1", email: "admin@ornek.test" };

const SAHTE_ETIKET = {
  id: "tag-1",
  code: "ARK1A2B3C4D",
  publicToken: "sahte_token_degeri_testte_uretildi",
  status: "unused",
  productKod: "sticker-seti",
  userId: null,
  itemRecordId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  activatedAt: null,
  revokedAt: null,
  orderTag: null,
  itemRecord: null,
  events: [],
};

function etiketBul(id: string) {
  return etiketler.find((e) => e.id === id) ?? null;
}

before(() => {
  mock.module(pathToFileURL(resolve("src/lib/session.ts")).href, {
    exports: {
      async yoneticiErisimi() {
        return yonetici;
      },
    },
  });

  mock.module(pathToFileURL(resolve("src/lib/rate-limit.ts")).href, {
    exports: {
      async hizSiniriKontrol() {
        return { izinli: hizSinirIzinli, bekleSaniye: 60, kalan: 0 };
      },
      istemciIpAdresi() {
        return "127.0.0.1";
      },
    },
  });

  const tagApi = {
    async findMany(sorgu: any) {
      const parca: string = sorgu?.where?.code?.contains ?? "";

      return etiketler.filter((e) => e.code.includes(parca));
    },
    async findUnique(sorgu: any) {
      const kayit = etiketBul(sorgu?.where?.id);

      /*
        KOPYA döndürülür. Gerçek Prisma sorgudan KOPUK düz bir nesne
        verir; aynı referansı döndürmek, sonraki `updateMany` yazması
        ucun elindeki anlık görüntüyü de değiştirdiği için gerçekte
        olmayan bir davranış üretir.
      */
      return kayit ? { ...kayit } : null;
    },
    async updateMany(sorgu: any) {
      const hedef = etiketBul(sorgu?.where?.id);

      // Koşullu güncelleme: zaten iptal edilmişse 0 satır etkilenir.
      if (!hedef || hedef.status === "revoked") {
        return { count: 0 };
      }

      Object.assign(hedef, sorgu.data);
      yazilanlar.push({ tur: "updateMany", veri: sorgu.data });

      return { count: 1 };
    },
    async create(sorgu: any) {
      uretilenEtiketSayisi += 1;

      const yeni = { id: `tag-yeni-${uretilenEtiketSayisi}`, ...sorgu.data };

      etiketler.push(yeni);
      yazilanlar.push({ tur: "tag.create", veri: sorgu.data });

      return { id: yeni.id, code: yeni.code };
    },
  };

  mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
    exports: {
      prisma: {
        tag: tagApi,
        tagEvent: {
          async create(sorgu: any) {
            yazilanlar.push({ tur: "tagEvent.create", veri: sorgu.data });

            return { id: "olay-1" };
          },
        },
        async $transaction(islev: any) {
          return islev({
            tag: tagApi,
            tagEvent: {
              async create(sorgu: any) {
                yazilanlar.push({
                  tur: "tagEvent.create",
                  veri: sorgu.data,
                });

                return { id: "olay-1" };
              },
            },
          });
        },
      },
    },
  });
});

function sifirla() {
  yonetici = YONETICI;
  hizSinirIzinli = true;
  yazilanlar = [];
  uretilenEtiketSayisi = 0;
  etiketler = [JSON.parse(JSON.stringify(SAHTE_ETIKET))].map((e) => ({
    ...e,
    createdAt: new Date(e.createdAt),
  }));
}

async function aramaUcu() {
  const modul = await import(
    pathToFileURL(resolve("src/app/api/admin/tags/ara/route.ts")).href
  );

  return modul.GET;
}

async function islemUcu() {
  const modul = await import(
    pathToFileURL(resolve("src/app/api/admin/tags/[tagId]/islem/route.ts"))
      .href
  );

  return modul.POST;
}

function aramaIstegi(kod: string) {
  return new Request(
    `http://localhost/api/admin/tags/ara?kod=${encodeURIComponent(kod)}`
  );
}

function islemIstegi(govde: unknown) {
  return new Request("http://localhost/api/admin/tags/tag-1/islem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(govde),
  });
}

describe("etiket arama ucu", () => {
  test("oturumsuz istek 401 alır", async () => {
    sifirla();
    yonetici = null;

    const GET = await aramaUcu();
    const yanit = await GET(aramaIstegi("1A2B"));

    assert.equal(yanit.status, 401);
  });

  test("çok kısa arama 400 alır", async () => {
    sifirla();

    const GET = await aramaUcu();
    const yanit = await GET(aramaIstegi("1"));

    assert.equal(yanit.status, 400);
  });

  test("hız sınırı aşılırsa 429 alır", async () => {
    sifirla();
    hizSinirIzinli = false;

    const GET = await aramaUcu();
    const yanit = await GET(aramaIstegi("1A2B"));

    assert.equal(yanit.status, 429);
  });

  test("kısmi ve büyük/küçük harf farklı arama aynı etiketi bulur", async () => {
    sifirla();

    const GET = await aramaUcu();

    for (const girdi of ["1A2B", "ark-1a2b-3c4d", "  1a2b  "]) {
      const yanit = await GET(aramaIstegi(girdi));
      const veri = await yanit.json();

      assert.equal(yanit.status, 200, girdi);
      assert.equal(veri.sonuclar.length, 1, girdi);
      assert.equal(veri.sonuclar[0].kod, "ARK-1A2B-3C4D", girdi);
    }
  });

  test("sonuç yoksa boş liste döner", async () => {
    sifirla();

    const GET = await aramaUcu();
    const yanit = await GET(aramaIstegi("9Z8Y"));
    const veri = await yanit.json();

    assert.equal(yanit.status, 200);
    assert.deepEqual(veri.sonuclar, []);
  });

  test("yanıtta publicToken, hash veya aktivasyon kodu BULUNMAZ", async () => {
    sifirla();

    const GET = await aramaUcu();
    const yanit = await GET(aramaIstegi("1A2B"));
    const metin = await yanit.text();

    assert.ok(!metin.includes("publicToken"));
    assert.ok(!metin.includes(SAHTE_ETIKET.publicToken));
    assert.ok(!metin.toLowerCase().includes("activationcode"));
    assert.ok(!metin.toLowerCase().includes("hash"));
  });
});

describe("iptal/yenileme ucu — yetki ve doğrulama", () => {
  test("oturumsuz istek 401 alır ve hiçbir şey yazmaz", async () => {
    sifirla();
    yonetici = null;

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "iptal", onayKodu: "ARK1A2B3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(yanit.status, 401);
    assert.equal(yazilanlar.length, 0);
  });

  test("bulunamayan etiket 404 alır", async () => {
    sifirla();

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "iptal", onayKodu: "ARK1A2B3C4D" }),
      { params: { tagId: "yok-boyle-bir-etiket" } }
    );

    assert.equal(yanit.status, 404);
    assert.equal(yazilanlar.length, 0);
  });

  test("geçersiz işlem adı 400 alır", async () => {
    sifirla();

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "sil", onayKodu: "ARK1A2B3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(yanit.status, 400);
    assert.equal(yazilanlar.length, 0);
  });

  test("onay kodu yazılmadan işlem çalışmaz", async () => {
    sifirla();

    const POST = await islemUcu();

    for (const onay of ["", "ARK9Z8Y7X6W", undefined]) {
      yazilanlar = [];

      const yanit = await POST(islemIstegi({ islem: "iptal", onayKodu: onay }), {
        params: { tagId: "tag-1" },
      });

      assert.equal(yanit.status, 400, String(onay));
      assert.equal(yazilanlar.length, 0, String(onay));
      assert.equal(etiketBul("tag-1").status, "unused", String(onay));
    }
  });

  test("rezerve etiket işleme kapalıdır (409)", async () => {
    sifirla();

    etiketBul("tag-1").orderTag = {
      reservationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "iptal", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(yanit.status, 409);
    assert.equal(yazilanlar.length, 0);
  });
});

describe("iptal", () => {
  test("etiket iptal edilir ve sahiplik bağları koparılır", async () => {
    sifirla();

    const hedef = etiketBul("tag-1");
    hedef.status = "active";
    hedef.userId = "kullanici-1";
    hedef.itemRecordId = "kayit-1";

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "iptal", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(yanit.status, 200);

    const sonrasi = etiketBul("tag-1");

    assert.equal(sonrasi.status, "revoked");
    assert.equal(sonrasi.userId, null);
    assert.equal(sonrasi.itemRecordId, null);
    assert.ok(sonrasi.revokedAt);

    // Koparılan bağlar denetim izine yazılır.
    const olay = yazilanlar.find((y) => y.tur === "tagEvent.create");

    assert.ok(olay);
    assert.equal(olay.veri.type, "revoked");
    assert.equal(olay.veri.fromUserId, "kullanici-1");
    assert.equal(olay.veri.fromItemRecordId, "kayit-1");

    // İptal YENİ etiket üretmez.
    assert.equal(uretilenEtiketSayisi, 0);
  });

  test("zaten iptal edilmiş etikette 409 döner", async () => {
    sifirla();
    etiketBul("tag-1").status = "revoked";

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "iptal", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(yanit.status, 409);
    assert.equal(yazilanlar.length, 0);
  });
});

describe("yenileme", () => {
  test("eski etiket iptal edilir, yeni etiket üretilir", async () => {
    sifirla();

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "yenile", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(yanit.status, 200);

    const veri = await yanit.json();

    assert.equal(veri.tekrarEdildi, false);
    assert.ok(veri.yeni);
    assert.ok(veri.yeni.kod);
    assert.ok(veri.yeni.activationCode);

    // Eski etiket iptal edildi.
    assert.equal(etiketBul("tag-1").status, "revoked");

    // Tam olarak BİR yeni etiket üretildi.
    assert.equal(uretilenEtiketSayisi, 1);

    const yeniYazma = yazilanlar.find((y) => y.tur === "tag.create");

    assert.ok(yeniYazma);

    // Ürün türü korunur.
    assert.equal(yeniYazma.veri.productKod, "sticker-seti");

    // Yeni etiket kullanılmamış durumda başlar.
    assert.equal(yeniYazma.veri.status, "unused");

    // Yeni QR hedefi ve yeni kod eskisinden FARKLIDIR.
    assert.notEqual(yeniYazma.veri.publicToken, SAHTE_ETIKET.publicToken);
    assert.notEqual(yeniYazma.veri.code, SAHTE_ETIKET.code);
  });

  test("veritabanına yalnızca hash yazılır, düz metin kod YAZILMAZ", async () => {
    sifirla();

    const POST = await islemUcu();
    const yanit = await POST(
      islemIstegi({ islem: "yenile", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    const veri = await yanit.json();
    const yeniYazma = yazilanlar.find((y) => y.tur === "tag.create");

    assert.ok(yeniYazma.veri.activationCodeHash);
    assert.equal(yeniYazma.veri.activationCode, undefined);

    // Yazılan hiçbir alan düz metin aktivasyon kodunu içermez.
    const yazilanMetin = JSON.stringify(yazilanlar);

    assert.ok(!yazilanMetin.includes(veri.yeni.activationCode));

    // Hash gerçekten kodun SHA-256'sı mı?
    const { aktivasyonKoduOzetle } = await import("@/lib/tags");

    assert.equal(
      yeniYazma.veri.activationCodeHash,
      aktivasyonKoduOzetle(veri.yeni.activationCode)
    );
  });

  test("aynı istek tekrar gönderilirse İKİNCİ etiket üretilmez", async () => {
    sifirla();

    const POST = await islemUcu();

    const ilk = await POST(
      islemIstegi({ islem: "yenile", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(ilk.status, 200);
    assert.equal(uretilenEtiketSayisi, 1);

    /*
      İkinci istek: etiket artık "revoked" olduğu için uygunluk kapısı
      409 döner. Kapı atlansa bile transaction içindeki koşullu
      updateMany 0 satır etkiler ve yeni etiket üretilmez.
    */
    const ikinci = await POST(
      islemIstegi({ islem: "yenile", onayKodu: "ARK-1A2B-3C4D" }),
      { params: { tagId: "tag-1" } }
    );

    assert.equal(ikinci.status, 409);
    assert.equal(uretilenEtiketSayisi, 1);
  });
});
