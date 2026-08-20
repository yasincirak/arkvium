import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Ödeme sonucunun işlenmesi (Checkout Form dönüşü).
 *
 * GÜVENLİK: iyzico'ya HİÇ ağ isteği yapılmaz; doğrulayıcı her testte sahte
 * bir fonksiyonla değiştirilir. Doğrulanan kurallar: yalnızca sağlayıcı
 * doğrulamasıyla "ödendi" olunması, tekrarlanan çağrıların idempotentliği,
 * tutar uyuşmazlığının reddi ve rezervasyon davranışı.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { odemeBaslat, odemeSonucunuIsle } = await import(
  "../../src/lib/odeme-servisi.ts"
);
const { rezervasyonSonGecerliligi } = await import(
  "../../src/lib/qr-rezervasyon.ts"
);
const { SIPARIS_URUNLERI, KARGO_UCRETI_KURUS } = await import(
  "../../src/lib/siparis.ts"
);
const { etiketUret } = await import("../../src/lib/tags.ts");

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

/** Sipariş + başlatılmış ödeme hazırlar; conversationId döner. */
async function odemeHazirla(adet = 1) {
  const siparis = await siparisOlustur({
    sepet: [{ kod: ANAHTARLIK.kod, adet }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });

  const odeme = await odemeBaslat({
    orderId: siparis.id,
    saglayici: async () => ({ token: "sahte-token" }),
  });

  return { siparis, conversationId: odeme.conversationId };
}

/** Sağlayıcı doğrulaması yerine geçen sahte. */
function sahteDogrulayici(alanlar: Record<string, unknown>) {
  return async () => ({ basarili: true, ...alanlar }) as never;
}

/** Sağlayıcının döndürdüğü biçim: "404.00" (kuruş → ondalık metin). */
const BEKLENEN_TUTAR = (adet: number) => {
  const kurus = ANAHTARLIK.fiyatKurus * adet + KARGO_UCRETI_KURUS;

  return `${Math.trunc(kurus / 100)}.${String(kurus % 100).padStart(2, "0")}`;
};

describe("ödeme sonucu — başarılı", () => {
  test("sipariş ve ödeme tek seferde 'ödendi' olur", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    const sonuc = await odemeSonucunuIsle({
      token: "sahte-token",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-1",
        paidPrice: BEKLENEN_TUTAR(1),
        currency: "TRY",
      }),
    });

    assert.equal(sonuc.durum, "odendi");
    assert.equal(sonuc.zatenIslenmis, false);

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true, paidAt: true },
    });

    assert.equal(guncel?.status, "paid");
    assert.ok(guncel?.paidAt, "paidAt yazılmalı");

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true, providerRef: true, confirmedAt: true },
    });

    assert.equal(odeme?.status, "succeeded");
    assert.equal(odeme?.providerRef, "iyz-1");
    assert.ok(odeme?.confirmedAt);
  });

  test("ödenen siparişin QR rezervasyonu korunur", async () => {
    const { siparis, conversationId } = await odemeHazirla(2);

    await odemeSonucunuIsle({
      token: "sahte-token",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-2",
        paidPrice: BEKLENEN_TUTAR(2),
        currency: "TRY",
      }),
    });

    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      2,
      "rezervasyon serbest bırakılmamalı"
    );
  });

  test("'paid' olayı yazılır", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    await odemeSonucunuIsle({
      token: "sahte-token",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-3",
        paidPrice: BEKLENEN_TUTAR(1),
        currency: "TRY",
      }),
    });

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: siparis.id, type: "paid" },
    });

    assert.equal(olaylar.length, 1);
  });
});

describe("ödeme sonucu — idempotency", () => {
  test("aynı bildirim ikinci kez çift kayıt oluşturmaz", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    const dogrulayici = sahteDogrulayici({
      conversationId,
      paymentStatus: "SUCCESS",
      paymentId: "iyz-tekrar",
      paidPrice: BEKLENEN_TUTAR(1),
      currency: "TRY",
    });

    const birinci = await odemeSonucunuIsle({ token: "t", dogrulayici });
    const ikinci = await odemeSonucunuIsle({ token: "t", dogrulayici });
    const ucuncu = await odemeSonucunuIsle({ token: "t", dogrulayici });

    assert.equal(birinci.zatenIslenmis, false);
    assert.equal(ikinci.zatenIslenmis, true);
    assert.equal(ucuncu.zatenIslenmis, true);
    assert.equal(ikinci.durum, "odendi");

    assert.equal(await prisma.paymentEvent.count(), 1, "tek olay kaydı");
    assert.equal(await prisma.payment.count(), 1, "tek ödeme kaydı");

    const paidOlaylari = await prisma.orderEvent.findMany({
      where: { orderId: siparis.id, type: "paid" },
    });

    assert.equal(paidOlaylari.length, 1, "çift 'paid' olayı olmamalı");

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "paid");
  });

  test("tekrar eden başarısız bildirim rezervasyonu iki kez bırakmaz", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    const dogrulayici = sahteDogrulayici({
      conversationId,
      paymentStatus: "FAILURE",
      paymentId: "iyz-basarisiz",
    });

    await odemeSonucunuIsle({ token: "t", dogrulayici });
    const ikinci = await odemeSonucunuIsle({ token: "t", dogrulayici });

    assert.equal(ikinci.zatenIslenmis, true);

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: siparis.id, type: "tags_released" },
    });

    assert.equal(olaylar.length, 1, "tek serbest bırakma olayı");
  });
});

describe("ödeme sonucu — başarısız ve beklemede", () => {
  test("nihai başarısızlıkta sipariş 'failed' olur ve etiketler serbest kalır", async () => {
    const { siparis, conversationId } = await odemeHazirla(2);

    const sonuc = await odemeSonucunuIsle({
      token: "sahte-token",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "FAILURE",
        paymentId: "iyz-4",
      }),
    });

    assert.equal(sonuc.durum, "basarisiz");

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true, paidAt: true },
    });

    assert.equal(guncel?.status, "failed");
    assert.equal(guncel?.paidAt, null);

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true },
    });

    assert.equal(odeme?.status, "failed");
    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      0,
      "etiketler stoğa dönmeli"
    );
  });

  test("kesinleşmemiş durumda sipariş ve rezervasyon korunur", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    const sonuc = await odemeSonucunuIsle({
      token: "sahte-token",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "CALLBACK_THREEDS",
      }),
    });

    assert.equal(sonuc.durum, "beklemede");

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "pending", "sipariş bekleyen kalmalı");

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true },
    });

    assert.equal(odeme?.status, "pending");
    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      1,
      "rezervasyon korunmalı"
    );
  });
});

describe("ödeme sonucu — doğrulama", () => {
  test("tutar uyuşmazsa sipariş ödenmiş sayılmaz", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    await assert.rejects(
      () =>
        odemeSonucunuIsle({
          token: "sahte-token",
          dogrulayici: sahteDogrulayici({
            conversationId,
            paymentStatus: "SUCCESS",
            paymentId: "iyz-5",
            paidPrice: "1.00",
            currency: "TRY",
          }),
        }),
      /doğrulanamadı/i
    );

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "pending");
  });

  test("para birimi uyuşmazsa sipariş ödenmiş sayılmaz", async () => {
    const { siparis, conversationId } = await odemeHazirla(1);

    await assert.rejects(
      () =>
        odemeSonucunuIsle({
          token: "sahte-token",
          dogrulayici: sahteDogrulayici({
            conversationId,
            paymentStatus: "SUCCESS",
            paymentId: "iyz-6",
            paidPrice: BEKLENEN_TUTAR(1),
            currency: "USD",
          }),
        }),
      /doğrulanamadı/i
    );

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "pending");
  });

  test("bilinmeyen referans reddedilir", async () => {
    await odemeHazirla(1);

    await assert.rejects(
      () =>
        odemeSonucunuIsle({
          token: "sahte-token",
          dogrulayici: sahteDogrulayici({
            conversationId: "baska-siparis-referansi",
            paymentStatus: "SUCCESS",
            paymentId: "iyz-7",
          }),
        }),
      /doğrulanamadı/i
    );

    assert.equal(await prisma.paymentEvent.count(), 0);
  });

  test("sağlayıcı doğrulaması başarısızsa hiçbir durum değişmez", async () => {
    const { siparis } = await odemeHazirla(1);

    await assert.rejects(
      () =>
        odemeSonucunuIsle({
          token: "sahte-token",
          dogrulayici: async () => ({ basarili: false }) as never,
        }),
      /doğrulanamadı/i
    );

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "pending");
    assert.equal(await prisma.paymentEvent.count(), 0);
  });

  test("boş token reddedilir", async () => {
    await assert.rejects(
      () => odemeSonucunuIsle({ token: "   " }),
      /doğrulanamadı/i
    );
  });
});
