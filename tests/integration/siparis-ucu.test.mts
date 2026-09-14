import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
  stokDoldur,
} from "../helpers/test-ortami.mts";

/**
 * Herkese açık sipariş ucu (`/api/siparis`).
 *
 * Doğrulanan kurallar: oturum GEREKMEMESİ (misafir sipariş), tutarların
 * yalnızca sunucu kataloğundan gelmesi, adedin her zaman 1 olması,
 * geçersiz ürün ve eksik alanın reddi, hız sınırı ve `OrderConsent`
 * kaydının yazılmaması.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.RATE_LIMIT_SECRET = "test-hiz-siniri-" + "r".repeat(32);

const { prisma } = await import("../../src/lib/prisma.ts");
const { SIPARIS_ONAY_BELGELERI, HUKUKI_BELGELER_YAYINDA } = await import(
  "../../src/lib/hukuki-belgeler.ts"
);
const { SIPARIS_URUNLERI, KARGO_UCRETI_KURUS } = await import(
  "../../src/lib/siparis.ts"
);
const { etiketUret } = await import("../../src/lib/tags.ts");
const { POST: siparisUcu } = await import(
  "../../src/app/api/siparis/route.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const STICKER = SIPARIS_URUNLERI.find((u) => u.kod === "sticker-seti")!;

const TESLIMAT = {
  fullName: "Test Musteri",
  email: "musteri@test.invalid",
  phone: "05551112233",
  addressLine: "Örnek Mahallesi 1. Sokak No 2",
  district: "Kadıköy",
  city: "İstanbul",
  postalCode: "34710",
};

/** Her testin kendi IP'si olsun: hız sınırı testleri birbirini etkilemesin. */
function rastgeleIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 250)}`;
}

beforeEach(async () => {
  await veritabaniniTemizle(db);

  await stokDoldur({
    prisma,
    etiketUret,
    urunKodlari: SIPARIS_URUNLERI.map((u) => u.kod),
    urunBasinaAdet: 12,
  });
});

/** Zorunlu belgelerin tamamının onaylandığı kod listesi. */
const TUM_ONAYLAR = SIPARIS_ONAY_BELGELERI.map(
  (belge) => belge.onayBelgeKodu
);

/**
 * Sipariş ucuna istek gönderir.
 *
 * Onay kodları varsayılan olarak EKSİKSİZ gönderilir; onay kapısının
 * kendisi ayrı testlerde `onaylar` alanı geçersiz kılınarak doğrulanır.
 */
async function istek(
  govde: Record<string, unknown>,
  ip = rastgeleIp()
) {
  const yanit = await siparisUcu(
    new Request("http://localhost/api/siparis", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ onaylar: TUM_ONAYLAR, ...govde }),
    })
  );

  return { yanit, govde: await yanit.json() };
}

describe("herkese açık sipariş ucu", () => {
  test("oturum olmadan misafir sipariş oluşur", async () => {
    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
    });

    assert.equal(yanit.status, 200, "oturum istenmemeli");

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: govde.orderId },
      select: { userId: true, status: true },
    });

    assert.equal(siparis.userId, null, "misafir sipariş kullanıcıya bağlanmaz");
    assert.equal(siparis.status, "pending");
  });

  test("tutar sunucu kataloğundan gelir; istemci fiyatı yok sayılır", async () => {
    const { govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      fiyatKurus: 1,
      totalKurus: 1,
      shippingKurus: 0,
      adet: 99,
      quantity: 99,
    });

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: govde.orderId },
      select: {
        subtotalKurus: true,
        shippingKurus: true,
        totalKurus: true,
        items: { select: { quantity: true } },
      },
    });

    assert.equal(siparis.subtotalKurus, STICKER.fiyatKurus);
    assert.equal(siparis.shippingKurus, KARGO_UCRETI_KURUS);
    assert.equal(siparis.totalKurus, STICKER.fiyatKurus + KARGO_UCRETI_KURUS);
    assert.equal(siparis.items[0].quantity, 1, "adet her zaman 1");
  });

  test("her ürün kendi fiyatıyla sipariş edilebilir", async () => {
    for (const urun of SIPARIS_URUNLERI.slice(0, 3)) {
      await veritabaniniTemizle(db);

      await stokDoldur({
        prisma,
        etiketUret,
        urunKodlari: SIPARIS_URUNLERI.map((u) => u.kod),
        urunBasinaAdet: 12,
      });

      const { yanit, govde } = await istek({
        urunKodu: urun.kod,
        ...TESLIMAT,
      });

      assert.equal(yanit.status, 200, `${urun.kod} sipariş edilebilmeli`);
      assert.equal(
        govde.totalKurus,
        urun.fiyatKurus + KARGO_UCRETI_KURUS,
        `${urun.kod} tutarı katalogla eşleşmeli`
      );

      const kalem = await prisma.orderItem.findFirstOrThrow({
        where: { orderId: govde.orderId },
        select: { productKod: true, qrAdedi: true },
      });

      assert.equal(kalem.productKod, urun.kod, "doğru ürün türü kaydedilmeli");
      assert.equal(kalem.qrAdedi, urun.qrAdedi);
    }
  });

  test("geçersiz ürün kodu reddedilir ve sipariş oluşmaz", async () => {
    const { yanit } = await istek({ urunKodu: "olmayan", ...TESLIMAT });

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.order.count(), 0);
    assert.equal(await prisma.orderTag.count(), 0);
  });

  test("eksik teslimat alanı reddedilir", async () => {
    const { yanit } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      city: "",
    });

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.order.count(), 0);
  });

  test("OrderConsent kaydı yayınlanmış belge sayısı kadar yazılır", async () => {
    /*
      Taslak kilidi kapalıyken yayınlanmış belge yoktur ve SAHTE ONAY
      KAYDI ÜRETİLMEZ: sayı sıfırdır. Kilit açıldığında aynı test
      yayınlanmış belge sayısını doğrular.
    */
    const { govde } = await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    assert.equal(
      await prisma.orderConsent.count({ where: { orderId: govde.orderId } }),
      SIPARIS_ONAY_BELGELERI.length
    );
  });

  test("aynı IP'den aşırı istek 429 alır (stok kilitleme koruması)", async () => {
    const ip = rastgeleIp();
    let sonDurum = 0;

    // Sınır saatte 10; 11. istek reddedilmeli.
    for (let i = 0; i < 11; i += 1) {
      const { yanit } = await istek({ urunKodu: STICKER.kod, ...TESLIMAT }, ip);

      sonDurum = yanit.status;
    }

    assert.equal(sonDurum, 429, "hız sınırı devreye girmeli");
  });
});

describe("hukuki onay kapısı", () => {
  /*
    Bu blok YALNIZCA taslak kilidi AÇIKKEN anlamlıdır: onaylatılacak
    yayınlanmış belge yoksa "eksik onay" diye bir durum oluşmaz.
  */
  test("onay gönderilmezse sipariş OLUŞMAZ", async (t) => {
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — onay kapısı devre dışı");

      return;
    }

    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      onaylar: [],
    });

    assert.equal(yanit.status, 400);
    assert.match(govde.error, /onaylamanız gerekiyor/i);

    assert.equal(await prisma.order.count(), 0, "sipariş yazılmamalı");
    assert.equal(
      await prisma.orderTag.count(),
      0,
      "etiket rezerve edilmemeli"
    );
    assert.equal(await prisma.orderConsent.count(), 0);
  });

  test("eksik onayda hata mesajı eksik belgeyi söyler", async (t) => {
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — onay kapısı devre dışı");

      return;
    }

    const eksik = TUM_ONAYLAR.slice(1);

    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      onaylar: eksik,
    });

    assert.equal(yanit.status, 400);
    assert.ok(
      govde.error.includes(SIPARIS_ONAY_BELGELERI[0].baslik),
      "eksik belgenin başlığı mesajda olmalı"
    );

    assert.equal(await prisma.order.count(), 0);
  });

  test("onay alanı hiç gönderilmezse sipariş oluşmaz", async (t) => {
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — onay kapısı devre dışı");

      return;
    }

    const yanit = await siparisUcu(
      new Request("http://localhost/api/siparis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": rastgeleIp(),
        },
        body: JSON.stringify({ urunKodu: STICKER.kod, ...TESLIMAT }),
      })
    );

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.order.count(), 0);
  });
});

describe("OrderConsent kaydı", () => {
  test("onaylar siparişle birlikte kaydedilir", async () => {
    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
    });

    assert.equal(yanit.status, 200);

    const onaylar = await prisma.orderConsent.findMany({
      where: { orderId: govde.orderId },
      select: { belge: true, surum: true, onaylandiAt: true },
      orderBy: { belge: "asc" },
    });

    assert.equal(onaylar.length, SIPARIS_ONAY_BELGELERI.length);

    for (const onay of onaylar) {
      const belge = SIPARIS_ONAY_BELGELERI.find(
        (b) => b.onayBelgeKodu === onay.belge
      );

      assert.ok(belge, `tanınmayan belge kodu: ${onay.belge}`);
      assert.equal(onay.surum, belge?.surum, "sürüm kayıt defterinden gelmeli");
      assert.ok(onay.onaylandiAt, "kabul zamanı yazılmalı");
    }
  });

  test("SÜRÜM istemciden gelen değere göre YAZILMAZ", async () => {
    /*
      İstemci yalnızca belge kodu gönderir. Uydurma bir sürüm
      göndermeye çalışsa bile kayıt defterindeki sürüm yazılır.
    */
    const { govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      onaylar: TUM_ONAYLAR,
      surum: "99.9",
    });

    const onaylar = await prisma.orderConsent.findMany({
      where: { orderId: govde.orderId },
      select: { surum: true },
    });

    for (const onay of onaylar) {
      assert.notEqual(onay.surum, "99.9");
    }
  });

  test("tekrarlanan kodlar MÜKERRER kayıt üretmez", async () => {
    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      onaylar: [...TUM_ONAYLAR, ...TUM_ONAYLAR, ...TUM_ONAYLAR],
    });

    assert.equal(yanit.status, 200);

    assert.equal(
      await prisma.orderConsent.count({ where: { orderId: govde.orderId } }),
      SIPARIS_ONAY_BELGELERI.length,
      "her belge için tek satır olmalı"
    );
  });

  test("iki ayrı sipariş kendi onaylarını alır", async () => {
    const birinci = await istek({ urunKodu: STICKER.kod, ...TESLIMAT });
    const ikinci = await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    assert.notEqual(birinci.govde.orderId, ikinci.govde.orderId);

    for (const siparis of [birinci, ikinci]) {
      assert.equal(
        await prisma.orderConsent.count({
          where: { orderId: siparis.govde.orderId },
        }),
        SIPARIS_ONAY_BELGELERI.length
      );
    }
  });

  test("sipariş başarısız olursa onay kaydı da kalmaz", async () => {
    // Stok yok: sipariş transaction'ı düşer, onaylar da yazılmamalı.
    await prisma.tag.deleteMany({});

    const { yanit } = await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.order.count(), 0);
    assert.equal(
      await prisma.orderConsent.count(),
      0,
      "sipariş yoksa onay da olmamalı"
    );
  });
});

describe("TASLAK KİLİDİ KAPALI — sipariş akışı korunur", () => {
  test("onay gönderilmeden sipariş OLUŞUR", async (t) => {
    /*
      En kritik kural: hukuki metinler yayından kaldırıldı diye satış
      durmamalıdır. Müşteri, açılamayan bir belgeyi onaylamak zorunda
      bırakılmaz.
    */
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık — onay zorunludur");

      return;
    }

    const yanit = await siparisUcu(
      new Request("http://localhost/api/siparis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": rastgeleIp(),
        },
        body: JSON.stringify({ urunKodu: STICKER.kod, ...TESLIMAT }),
      })
    );

    assert.equal(yanit.status, 200, "sipariş oluşmalı");
    assert.equal(await prisma.order.count(), 1);
  });

  test("SAHTE ONAY KAYDI yazılmaz", async (t) => {
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    assert.equal(
      await prisma.orderConsent.count(),
      0,
      "yayınlanmamış belgeye onay kaydı üretilmemeli"
    );
  });

  test("UYDURMA onay kodu gönderilse bile kayda girmez", async (t) => {
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      onaylar: ["mesafeli_satis", "kvkk_aydinlatma", "uydurma_belge"],
    });

    assert.equal(await prisma.orderConsent.count(), 0);
  });
});
