import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Ödeme başlatma servisi.
 *
 * GÜVENLİK: Bu testler iyzico'ya HİÇ ağ isteği yapmaz; sağlayıcı çağrısı
 * her testte sahte bir fonksiyonla değiştirilir. Doğrulanan kurallar:
 * tutarın yalnızca veritabanından alınması, sipariş durumunun korunması,
 * ödeme kaydının "ödendi" yapılmaması ve QR rezervasyonunun bozulmaması.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { odemeBaslat } = await import("../../src/lib/odeme-servisi.ts");
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

async function siparisVer(adet = 2) {
  return siparisOlustur({
    sepet: [{ kod: ANAHTARLIK.kod, adet }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });
}

/** Gerçek sağlayıcı yerine geçen sahte; gönderilen isteği kaydeder. */
function sahteSaglayici() {
  const cagrilar: unknown[] = [];

  return {
    cagrilar,
    fn: async (istek: unknown) => {
      cagrilar.push(istek);

      return {
        token: "sahte-token",
        checkoutFormContent: "<div>form</div>",
        paymentPageUrl: "https://ornek.invalid/odeme",
      };
    },
  };
}

describe("ödeme başlatma — kimlik numarası", () => {
  test("sağlayıcıya iletilir ama hiçbir tabloya YAZILMAZ", async () => {
    const siparis = await siparisVer(1);
    const saglayici = sahteSaglayici();
    const KIMLIK = "11111111111";

    await odemeBaslat({
      orderId: siparis.id,
      kimlikNo: KIMLIK,
      saglayici: saglayici.fn,
    });

    // 1) Sağlayıcıya gitti mi? (iyzico buyer.identityNumber alanını zorunlu tutar)
    const istek = saglayici.cagrilar[0] as { alici: { kimlikNo?: string } };

    assert.equal(istek.alici.kimlikNo, KIMLIK);

    // 2) Hiçbir tabloya yazılmadı mı? Kişisel veri saklanmaz.
    const siparisKaydi = await prisma.order.findUniqueOrThrow({
      where: { id: siparis.id },
    });

    assert.ok(
      !JSON.stringify(siparisKaydi).includes(KIMLIK),
      "kimlik numarası Order kaydında bulunmamalı"
    );

    const odemeler = await prisma.payment.findMany({
      where: { orderId: siparis.id },
    });

    assert.ok(
      !JSON.stringify(odemeler).includes(KIMLIK),
      "kimlik numarası Payment kaydında bulunmamalı"
    );

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: siparis.id },
    });

    assert.ok(
      !JSON.stringify(olaylar).includes(KIMLIK),
      "kimlik numarası OrderEvent kaydında bulunmamalı"
    );

    const kalemler = await prisma.orderItem.findMany({
      where: { orderId: siparis.id },
    });

    assert.ok(
      !JSON.stringify(kalemler).includes(KIMLIK),
      "kimlik numarası OrderItem kaydında bulunmamalı"
    );
  });

  test("verilmezse sağlayıcıya tanımsız gider (mevcut davranış korunur)", async () => {
    const siparis = await siparisVer(1);
    const saglayici = sahteSaglayici();

    await odemeBaslat({ orderId: siparis.id, saglayici: saglayici.fn });

    const istek = saglayici.cagrilar[0] as { alici: { kimlikNo?: string } };

    assert.equal(istek.alici.kimlikNo, undefined);
  });
});

describe("ödeme başlatma", () => {
  test("tutar yalnızca veritabanındaki siparişten alınır", async () => {
    const siparis = await siparisVer(2);
    const saglayici = sahteSaglayici();

    await odemeBaslat({ orderId: siparis.id, saglayici: saglayici.fn });

    const beklenenToplam = ANAHTARLIK.fiyatKurus * 2 + KARGO_UCRETI_KURUS;

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { amountKurus: true, currency: true, provider: true, status: true },
    });

    assert.equal(odeme?.amountKurus, beklenenToplam);
    assert.equal(odeme?.currency, "TRY");
    assert.equal(odeme?.provider, "iyzico");
    assert.equal(odeme?.status, "pending", "ödeme burada 'ödendi' olmamalı");

    const istek = saglayici.cagrilar[0] as { toplamKurus: number };

    assert.equal(istek.toplamKurus, beklenenToplam);
  });

  test("sağlayıcıya giden sepet toplamı sipariş toplamına eşittir", async () => {
    const siparis = await siparisVer(1);
    const saglayici = sahteSaglayici();

    await odemeBaslat({ orderId: siparis.id, saglayici: saglayici.fn });

    const istek = saglayici.cagrilar[0] as {
      toplamKurus: number;
      kalemler: { fiyatKurus: number }[];
    };

    const kalemToplami = istek.kalemler.reduce(
      (t, k) => t + k.fiyatKurus,
      0
    );

    assert.equal(kalemToplami, istek.toplamKurus, "kargo dahil eşit olmalı");
  });

  test("ödeme kaydı ve payment_started olayı oluşur", async () => {
    const siparis = await siparisVer(1);
    const saglayici = sahteSaglayici();

    const sonuc = await odemeBaslat({
      orderId: siparis.id,
      saglayici: saglayici.fn,
    });

    assert.ok(sonuc.paymentId);
    assert.ok(sonuc.conversationId.startsWith(siparis.orderNumber));
    assert.equal(sonuc.paymentPageUrl, "https://ornek.invalid/odeme");

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: siparis.id, type: "payment_started" },
    });

    assert.equal(olaylar.length, 1);
  });

  test("sipariş 'pending' kalır ve rezervasyon korunur", async () => {
    const siparis = await siparisVer(2);
    const saglayici = sahteSaglayici();

    await odemeBaslat({ orderId: siparis.id, saglayici: saglayici.fn });

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true, paidAt: true },
    });

    assert.equal(guncel?.status, "pending");
    assert.equal(guncel?.paidAt, null);
    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      2,
      "rezervasyon bozulmamalı"
    );
  });

  test("olmayan sipariş için ödeme başlatılmaz", async () => {
    const saglayici = sahteSaglayici();

    await assert.rejects(
      () => odemeBaslat({ orderId: "olmayan-id", saglayici: saglayici.fn }),
      /bulunamadı/i
    );

    assert.equal(await prisma.payment.count(), 0);
    assert.equal(saglayici.cagrilar.length, 0, "sağlayıcı çağrılmamalı");
  });

  test("ödenmiş sipariş için ikinci ödeme başlatılamaz", async () => {
    const siparis = await siparisVer(1);

    await prisma.order.update({
      where: { id: siparis.id },
      data: { status: "paid", paidAt: new Date() },
    });

    const saglayici = sahteSaglayici();

    await assert.rejects(
      () => odemeBaslat({ orderId: siparis.id, saglayici: saglayici.fn }),
      /başlatılamıyor/i
    );

    assert.equal(await prisma.payment.count(), 0);
    assert.equal(saglayici.cagrilar.length, 0);
  });

  test("sağlayıcı hata verirse ödeme 'failed' olur, sipariş korunur", async () => {
    const siparis = await siparisVer(1);

    await assert.rejects(
      () =>
        odemeBaslat({
          orderId: siparis.id,
          saglayici: async () => {
            throw new Error("sağlayıcı erişilemedi");
          },
        }),
      /Ödeme başlatılamadı/i
    );

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true },
    });

    assert.equal(odeme?.status, "failed");

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "pending", "sipariş bozulmamalı");
    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      1,
      "rezervasyon serbest bırakılmamalı"
    );

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: siparis.id, type: "payment_failed" },
    });

    assert.equal(olaylar.length, 1);
  });

  test("callback adresi tanımsızsa gerçek sağlayıcı çağrılmadan durur", async () => {
    const siparis = await siparisVer(1);

    const onceki = process.env.IYZICO_CALLBACK_URL;
    delete process.env.IYZICO_CALLBACK_URL;

    try {
      await assert.rejects(
        () => odemeBaslat({ orderId: siparis.id }),
        /kullanılamıyor|başlatılamadı/i
      );
    } finally {
      if (onceki !== undefined) {
        process.env.IYZICO_CALLBACK_URL = onceki;
      }
    }

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true },
    });

    assert.equal(odeme?.status, "failed", "deneme izi kalmalı");

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true },
    });

    assert.equal(guncel?.status, "pending");
  });

  test("kimlik numarası varsayılan olarak gönderilmez", async () => {
    const siparis = await siparisVer(1);
    const saglayici = sahteSaglayici();

    await odemeBaslat({ orderId: siparis.id, saglayici: saglayici.fn });

    const istek = saglayici.cagrilar[0] as { alici: { kimlikNo?: string } };

    assert.equal(istek.alici.kimlikNo, undefined);
  });
});
