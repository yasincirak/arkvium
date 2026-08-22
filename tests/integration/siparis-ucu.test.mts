import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
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

  for (let i = 0; i < 12; i += 1) {
    const uretilen = etiketUret();

    await prisma.tag.create({
      data: {
        code: uretilen.code,
        publicToken: uretilen.publicToken,
        activationCodeHash: uretilen.activationCodeHash,
      },
    });
  }
});

async function istek(govde: unknown, ip = rastgeleIp()) {
  const yanit = await siparisUcu(
    new Request("http://localhost/api/siparis", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(govde),
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

      for (let i = 0; i < 12; i += 1) {
        const uretilen = etiketUret();

        await prisma.tag.create({
          data: {
            code: uretilen.code,
            publicToken: uretilen.publicToken,
            activationCodeHash: uretilen.activationCodeHash,
          },
        });
      }

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

  test("OrderConsent kaydı yazılmaz", async () => {
    await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    assert.equal(await prisma.orderConsent.count(), 0);
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
