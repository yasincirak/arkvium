import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  stokDoldur,
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Sipariş iptali — veritabanı davranışı.
 *
 * Doğrulananlar:
 *  - İzin verilen durumlarda sipariş `cancelled` olur ve QR stoğu döner.
 *  - Kargoya verilmiş sipariş iptal EDİLMEZ ve stok geri dönmez.
 *  - Çift iptal ikinci bir olay yazmaz ve stoğu ikinci kez döndürmez.
 *  - İptal reddedildiğinde hiçbir kayıt değişmez.
 *  - Ödeme kayıtlarına ve tutarlara dokunulmaz.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.EPOSTA_GONDERIMI_KAPALI = "1";

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { rezervasyonSonGecerliligi } = await import(
  "../../src/lib/qr-rezervasyon.ts"
);
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");
const { SIPARIS_ONAY_BELGELERI } = await import(
  "../../src/lib/hukuki-belgeler.ts"
);
const { siparisiIptalEt, SiparisIptalHatasi } = await import(
  "../../src/lib/siparis-iptal.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const ANAHTARLIK = SIPARIS_URUNLERI.find((u) => u.kod === "metal-anahtarlik")!;

const TESLIMAT = {
  fullName: "Test Müşteri",
  email: "musteri@test.invalid",
  phone: "05551112233",
  addressLine: "Örnek Mahallesi 1. Sokak No 2",
  district: "Kadıköy",
  city: "İstanbul",
  postalCode: "34710",
};

beforeEach(async () => {
  await veritabaniniTemizle(db);

  await stokDoldur({
    prisma,
    etiketUret,
    urunKodlari: SIPARIS_URUNLERI.map((u) => u.kod),
    urunBasinaAdet: 8,
  });
});

/** Sipariş oluşturur ve istenen duruma getirir. */
async function siparisHazirla(durum: string) {
  const siparis = await siparisOlustur({
    sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
    onaylar: SIPARIS_ONAY_BELGELERI.map((b) => ({
      belge: b.onayBelgeKodu as string,
      surum: b.surum,
    })),
  });

  if (durum !== "pending") {
    await prisma.order.update({
      where: { id: siparis.id },
      data: {
        status: durum as never,
        ...(durum === "paid" || durum === "preparing" || durum === "shipped"
          ? { paidAt: new Date() }
          : {}),
      },
    });
  }

  return siparis;
}

describe("iptal edilebilen durumlar", () => {
  for (const durum of ["pending", "paid", "preparing"]) {
    test(`${durum}: sipariş iptal olur ve QR stoğu döner`, async () => {
      const siparis = await siparisHazirla(durum);

      const oncekiRezervasyon = await prisma.orderTag.count({
        where: { orderId: siparis.id },
      });

      assert.ok(oncekiRezervasyon > 0, "önce rezervasyon olmalı");

      const sonuc = await siparisiIptalEt({
        orderId: siparis.id,
        adminEmail: "yonetici@test.invalid",
        not: "test",
      });

      assert.equal(sonuc.serbestBirakilanEtiket, oncekiRezervasyon);

      const guncel = await prisma.order.findUnique({
        where: { id: siparis.id },
        select: { status: true, cancelledAt: true },
      });

      assert.equal(guncel?.status, "cancelled");
      assert.ok(guncel?.cancelledAt, "iptal zamanı yazılmalı");

      assert.equal(
        await prisma.orderTag.count({ where: { orderId: siparis.id } }),
        0,
        "rezervasyon serbest bırakılmalı"
      );
    });
  }

  test("pending iptalinde para iadesi GEREKMEZ", async () => {
    const siparis = await siparisHazirla("pending");

    const sonuc = await siparisiIptalEt({ orderId: siparis.id });

    assert.equal(sonuc.paraIadesiGerekir, false);
  });

  test("paid iptalinde para iadesi GEREKİR", async () => {
    const siparis = await siparisHazirla("paid");

    const sonuc = await siparisiIptalEt({ orderId: siparis.id });

    assert.equal(sonuc.paraIadesiGerekir, true);
  });

  test("iptal olayı tek kez yazılır", async () => {
    const siparis = await siparisHazirla("paid");

    await siparisiIptalEt({ orderId: siparis.id });

    assert.equal(
      await prisma.orderEvent.count({
        where: { orderId: siparis.id, type: "cancelled" },
      }),
      1
    );
  });
});

describe("iptal edilemeyen durumlar", () => {
  test("shipped: REDDEDİLİR, stok geri DÖNMEZ", async () => {
    const siparis = await siparisHazirla("shipped");

    const oncekiRezervasyon = await prisma.orderTag.count({
      where: { orderId: siparis.id },
    });

    await assert.rejects(
      () => siparisiIptalEt({ orderId: siparis.id }),
      /iade talebi/i
    );

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true, cancelledAt: true },
    });

    assert.equal(guncel?.status, "shipped", "durum değişmemeli");
    assert.equal(guncel?.cancelledAt, null);

    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      oncekiRezervasyon,
      "etiketler müşteriye gitti; stoğa dönmemeli"
    );
  });

  test("cancelled: ikinci iptal reddedilir", async () => {
    const siparis = await siparisHazirla("paid");

    await siparisiIptalEt({ orderId: siparis.id });

    await assert.rejects(
      () => siparisiIptalEt({ orderId: siparis.id }),
      /zaten iptal/i
    );

    assert.equal(
      await prisma.orderEvent.count({
        where: { orderId: siparis.id, type: "cancelled" },
      }),
      1,
      "ikinci iptal olayı yazılmamalı"
    );
  });

  test("failed: reddedilir ve durum değişmez", async () => {
    const siparis = await siparisHazirla("failed");

    await assert.rejects(
      () => siparisiIptalEt({ orderId: siparis.id }),
      /geçerli değildir/i
    );

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "failed");
  });

  test("bilinmeyen sipariş reddedilir", async () => {
    await assert.rejects(
      () => siparisiIptalEt({ orderId: "olmayan-siparis" }),
      SiparisIptalHatasi
    );
  });
});

describe("iptal ödeme kayıtlarına dokunmaz", () => {
  test("tutarlar ve ödeme kaydı değişmez", async () => {
    const siparis = await siparisHazirla("paid");

    await prisma.payment.create({
      data: {
        orderId: siparis.id,
        provider: "iyzico",
        providerConversationId: `test-${siparis.id}`,
        status: "succeeded",
        amountKurus: siparis.totalKurus,
      },
    });

    await siparisiIptalEt({ orderId: siparis.id });

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true, amountKurus: true },
    });

    assert.equal(odeme?.status, "succeeded", "ödeme durumu değişmemeli");
    assert.equal(odeme?.amountKurus, siparis.totalKurus);

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { totalKurus: true, subtotalKurus: true, shippingKurus: true },
    });

    assert.equal(guncel?.totalKurus, siparis.totalKurus, "tutar değişmemeli");
    assert.equal(guncel?.subtotalKurus, siparis.subtotalKurus);
    assert.equal(guncel?.shippingKurus, siparis.shippingKurus);
  });

  test("iptal edilen siparişin etiketleri yeniden sipariş edilebilir", async () => {
    const ilk = await siparisHazirla("pending");

    await siparisiIptalEt({ orderId: ilk.id });

    // Stoğa dönen etiketlerle yeni sipariş oluşabilmeli.
    const ikinci = await siparisOlustur({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
      teslimat: TESLIMAT,
      rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
    });

    assert.ok(
      (await prisma.orderTag.count({ where: { orderId: ikinci.id } })) > 0
    );
  });
});
