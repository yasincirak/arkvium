import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
  yoneticiOturumuKur,
} from "../helpers/test-ortami.mts";
import { cerezAyarla, cerezleriTemizle } from "../helpers/next-taklit.mjs";

/**
 * Admin Sandbox ödeme testi ucu (`/api/admin/odeme-testi/siparis`).
 *
 * Doğrulanan kurallar: yönetici oturumu olmadan hiçbir sipariş oluşmaması,
 * tutarların YALNIZCA sunucu kataloğundan gelmesi (istemciden gelen fiyat
 * yok sayılır), adedin her zaman 1 olması, siparişin MİSAFİR kalması ve
 * `OrderConsent` kaydının HİÇ yazılmaması.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const { prisma } = await import("../../src/lib/prisma.ts");
const { SIPARIS_URUNLERI, KARGO_UCRETI_KURUS } = await import(
  "../../src/lib/siparis.ts"
);
const { etiketUret } = await import("../../src/lib/tags.ts");
const { POST: siparisUcu } = await import(
  "../../src/app/api/admin/odeme-testi/siparis/route.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const STICKER = SIPARIS_URUNLERI.find((u) => u.kod === "sticker-seti")!;

const TESLIMAT = {
  fullName: "Test Yonetici",
  email: "test@test.invalid",
  phone: "05551112233",
  addressLine: "Örnek Mahallesi 1. Sokak No 2",
  district: "Kadıköy",
  city: "İstanbul",
  postalCode: "34710",
};

beforeEach(async () => {
  await veritabaniniTemizle(db);
  cerezleriTemizle();

  for (let i = 0; i < 10; i += 1) {
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

async function yoneticiOturumuAc() {
  await yoneticiOturumuKur({ prisma, cerezAyarla });
}

async function istek(govde: unknown) {
  const yanit = await siparisUcu(
    new Request("http://localhost/api/admin/odeme-testi/siparis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
    })
  );

  return { yanit, govde: await yanit.json() };
}

describe("admin sandbox ödeme testi ucu — yetki", () => {
  test("yönetici oturumu olmadan 401 döner ve sipariş oluşmaz", async () => {
    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
    });

    assert.equal(yanit.status, 401);
    assert.ok(govde.error);
    assert.equal(await prisma.order.count(), 0, "sipariş oluşmamalı");
    assert.equal(await prisma.orderTag.count(), 0, "etiket rezerve edilmemeli");
  });
});

describe("admin sandbox ödeme testi ucu — tutarlar", () => {
  test("tutarlar sunucu kataloğundan hesaplanır", async () => {
    await yoneticiOturumuAc();

    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
    });

    assert.equal(yanit.status, 200);

    const beklenenToplam = STICKER.fiyatKurus + KARGO_UCRETI_KURUS;

    assert.equal(govde.totalKurus, beklenenToplam);

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: govde.orderId },
      select: {
        subtotalKurus: true,
        shippingKurus: true,
        totalKurus: true,
        status: true,
        userId: true,
        items: { select: { quantity: true, unitPriceKurus: true } },
      },
    });

    assert.equal(siparis.subtotalKurus, STICKER.fiyatKurus);
    assert.equal(siparis.shippingKurus, KARGO_UCRETI_KURUS);
    assert.equal(siparis.totalKurus, beklenenToplam);
    assert.equal(siparis.status, "pending");
    assert.equal(siparis.items.length, 1);
    assert.equal(siparis.items[0].quantity, 1, "adet her zaman 1 olmalı");
    assert.equal(siparis.items[0].unitPriceKurus, STICKER.fiyatKurus);
  });

  test("istemciden gelen fiyat ve toplam YOK SAYILIR", async () => {
    await yoneticiOturumuAc();

    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      // Kötü niyetli/yanlış istemci alanları:
      fiyatKurus: 1,
      unitPriceKurus: 1,
      subtotalKurus: 1,
      shippingKurus: 0,
      totalKurus: 1,
      adet: 99,
      quantity: 99,
    });

    assert.equal(yanit.status, 200);

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
    assert.equal(siparis.items[0].quantity, 1, "istemci adedi kabul edilmemeli");
  });
});

describe("admin sandbox ödeme testi ucu — kapsam sınırları", () => {
  test("sipariş MİSAFİR kalır; yönetici hesabına bağlanmaz", async () => {
    await yoneticiOturumuAc();

    const { govde } = await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: govde.orderId },
      select: { userId: true },
    });

    assert.equal(siparis.userId, null);
  });

  test("OrderConsent kaydı YAZILMAZ", async () => {
    await yoneticiOturumuAc();

    await istek({ urunKodu: STICKER.kod, ...TESLIMAT });

    assert.equal(
      await prisma.orderConsent.count(),
      0,
      "sahte hukuki onay kaydı üretilmemeli"
    );
  });

  test("geçersiz ürün kodu reddedilir ve sipariş oluşmaz", async () => {
    await yoneticiOturumuAc();

    const { yanit } = await istek({
      urunKodu: "olmayan-urun",
      ...TESLIMAT,
    });

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.order.count(), 0);
    assert.equal(await prisma.orderTag.count(), 0);
  });

  test("eksik teslimat alanı reddedilir ve sipariş oluşmaz", async () => {
    await yoneticiOturumuAc();

    const { yanit } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      city: "",
    });

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.order.count(), 0);
  });

  test("posta kodu boş bırakılabilir", async () => {
    await yoneticiOturumuAc();

    const { yanit, govde } = await istek({
      urunKodu: STICKER.kod,
      ...TESLIMAT,
      postalCode: "",
    });

    assert.equal(yanit.status, 200);

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: govde.orderId },
      select: { postalCode: true },
    });

    assert.equal(siparis.postalCode, null);
  });
});
