import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Sipariş oluşturma servisi — ödemesiz aşama.
 *
 * Doğrulanan kurallar: misafir ve üye sipariş, tutarların yalnızca sunucudan
 * gelmesi, veritabanı CHECK kısıtlarının sağlanması, qrAdedi kopyası,
 * QR etiketlerine ve ödeme kayıtlarına HİÇ dokunulmaması ve geçersiz
 * girdide kısmi kayıt kalmaması.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { SIPARIS_URUNLERI, KARGO_UCRETI_KURUS } = await import(
  "../../src/lib/siparis.ts"
);
const { etiketUret } = await import("../../src/lib/tags.ts");

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

beforeEach(async () => {
  await veritabaniniTemizle(db);
});

const STICKER = SIPARIS_URUNLERI.find((u) => u.kod === "sticker-seti")!;
const ANAHTARLIK = SIPARIS_URUNLERI.find((u) => u.kod === "metal-anahtarlik")!;

const TESLIMAT = {
  fullName: "Test Müşteri",
  email: "musteri@test.invalid",
  phone: "05551112233",
  addressLine: "Örnek Mahallesi 1. Sokak No 2 Daire 3",
  district: "Kadıköy",
  city: "İstanbul",
  postalCode: "34710",
};

async function kullaniciOlustur(eposta: string) {
  return prisma.user.create({
    data: { email: eposta, passwordHash: "test-hash-kullanilmiyor" },
    select: { id: true },
  });
}

async function etiketOlustur() {
  const uretilen = etiketUret();

  return prisma.tag.create({
    data: {
      code: uretilen.code,
      publicToken: uretilen.publicToken,
      activationCodeHash: uretilen.activationCodeHash,
    },
    select: { id: true, status: true, userId: true },
  });
}

describe("sipariş oluşturma", () => {
  test("misafir sipariş oluşur ve kullanıcıya bağlanmaz", async () => {
    const sonuc = await siparisOlustur({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const siparis = await prisma.order.findUnique({
      where: { id: sonuc.id },
      select: {
        userId: true,
        status: true,
        orderNumber: true,
        publicToken: true,
        email: true,
      },
    });

    assert.equal(siparis?.userId, null, "misafir siparişte kullanıcı olmamalı");
    assert.equal(siparis?.status, "pending");
    assert.ok(siparis?.orderNumber.startsWith("ARK-"));
    assert.ok((siparis?.publicToken.length ?? 0) >= 32, "token yeterince uzun");
    assert.equal(siparis?.email, TESLIMAT.email);
  });

  test("üye siparişi kullanıcıya bağlanır", async () => {
    const kullanici = await kullaniciOlustur("uye@test.invalid");

    const sonuc = await siparisOlustur({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 2 }],
      teslimat: TESLIMAT,
      userId: kullanici.id,
    });

    const siparis = await prisma.order.findUnique({
      where: { id: sonuc.id },
      select: { userId: true },
    });

    assert.equal(siparis?.userId, kullanici.id);
  });

  test("sipariş numarası ve public token benzersizdir", async () => {
    const birinci = await siparisOlustur({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const ikinci = await siparisOlustur({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    assert.notEqual(birinci.orderNumber, ikinci.orderNumber);
    assert.notEqual(birinci.publicToken, ikinci.publicToken);
  });

  test("tutarlar sunucudaki ürün kaynağından hesaplanır", async () => {
    const sonuc = await siparisOlustur({
      sepet: [
        { kod: STICKER.kod, adet: 2 },
        { kod: ANAHTARLIK.kod, adet: 1 },
      ],
      teslimat: TESLIMAT,
    });

    const beklenenAraToplam = STICKER.fiyatKurus * 2 + ANAHTARLIK.fiyatKurus;

    const siparis = await prisma.order.findUnique({
      where: { id: sonuc.id },
      select: {
        subtotalKurus: true,
        shippingKurus: true,
        totalKurus: true,
        currency: true,
      },
    });

    assert.equal(siparis?.subtotalKurus, beklenenAraToplam);
    assert.equal(siparis?.shippingKurus, KARGO_UCRETI_KURUS);
    assert.equal(siparis?.totalKurus, beklenenAraToplam + KARGO_UCRETI_KURUS);
    assert.equal(siparis?.currency, "TRY");
  });

  test("istemciden gelen sahte fiyat yok sayılır", async () => {
    const sonuc = await siparisOlustur({
      sepet: [
        {
          kod: STICKER.kod,
          adet: 1,
          unitPriceKurus: 1,
          lineTotalKurus: 1,
        } as never,
      ],
      teslimat: TESLIMAT,
    });

    const kalem = await prisma.orderItem.findFirst({
      where: { orderId: sonuc.id },
      select: { unitPriceKurus: true, lineTotalKurus: true },
    });

    assert.equal(kalem?.unitPriceKurus, STICKER.fiyatKurus);
    assert.equal(kalem?.lineTotalKurus, STICKER.fiyatKurus);
  });

  test("kalem ve sipariş toplamları CHECK kısıtlarıyla tutarlıdır", async () => {
    const sonuc = await siparisOlustur({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 3 }],
      teslimat: TESLIMAT,
    });

    const siparis = await prisma.order.findUnique({
      where: { id: sonuc.id },
      select: {
        subtotalKurus: true,
        shippingKurus: true,
        totalKurus: true,
        items: {
          select: {
            quantity: true,
            unitPriceKurus: true,
            lineTotalKurus: true,
          },
        },
      },
    });

    for (const kalem of siparis?.items ?? []) {
      assert.equal(
        kalem.lineTotalKurus,
        kalem.quantity * kalem.unitPriceKurus,
        "satır toplamı tutarlı olmalı"
      );
    }

    assert.equal(
      siparis?.totalKurus,
      (siparis?.subtotalKurus ?? 0) + (siparis?.shippingKurus ?? 0)
    );
  });

  test("qrAdedi ürün tanımından kopyalanır", async () => {
    const sonuc = await siparisOlustur({
      sepet: [
        { kod: STICKER.kod, adet: 2 },
        { kod: ANAHTARLIK.kod, adet: 1 },
      ],
      teslimat: TESLIMAT,
    });

    const kalemler = await prisma.orderItem.findMany({
      where: { orderId: sonuc.id },
      select: { productKod: true, quantity: true, qrAdedi: true },
    });

    const sticker = kalemler.find((k) => k.productKod === STICKER.kod);
    const anahtarlik = kalemler.find((k) => k.productKod === ANAHTARLIK.kod);

    assert.equal(sticker?.qrAdedi, 3, "3'lü set 3 etiket gerektirir");
    assert.equal(anahtarlik?.qrAdedi, 1);

    // 2 * 3 + 1 * 1 = 7
    assert.equal(sonuc.toplamQrAdedi, 7);
  });

  test("ürün adı sipariş anında kopyalanır", async () => {
    const sonuc = await siparisOlustur({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const kalem = await prisma.orderItem.findFirst({
      where: { orderId: sonuc.id },
      select: { productAdi: true, secenek: true },
    });

    assert.equal(kalem?.productAdi, STICKER.ad);
    assert.equal(kalem?.secenek, null, "bugün ürün seçeneği yok");
  });

  test("her siparişte tek 'created' olayı yazılır", async () => {
    const sonuc = await siparisOlustur({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: sonuc.id },
      select: { type: true, actorAdminEmail: true },
    });

    assert.equal(olaylar.length, 1);
    assert.equal(olaylar[0].type, "created");
    assert.equal(olaylar[0].actorAdminEmail, null);
  });

  test("sipariş QR etiketi ayırmaz ve ödeme kaydı oluşturmaz", async () => {
    const etiket = await etiketOlustur();

    const sonuc = await siparisOlustur({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    assert.equal(await prisma.orderTag.count(), 0, "rezervasyon yazılmamalı");
    assert.equal(await prisma.payment.count(), 0, "ödeme kaydı olmamalı");

    const sonrakiEtiket = await prisma.tag.findUnique({
      where: { id: etiket.id },
      select: { status: true, userId: true, itemRecordId: true },
    });

    assert.equal(sonrakiEtiket?.status, "unused", "etiket durumu değişmemeli");
    assert.equal(sonrakiEtiket?.userId, null, "etiket sahiplenilmemeli");
    assert.equal(sonrakiEtiket?.itemRecordId, null);
    assert.ok(sonuc.id, "sipariş yine de oluşmuş olmalı");
  });
});

describe("sipariş oluşturma — geçersiz girdi", () => {
  async function kayitYokMu() {
    assert.equal(await prisma.order.count(), 0, "sipariş yazılmamalı");
    assert.equal(await prisma.orderItem.count(), 0, "kalem yazılmamalı");
    assert.equal(await prisma.orderEvent.count(), 0, "olay yazılmamalı");
  }

  test("bilinmeyen ürün kodu reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: "olmayan-urun", adet: 1 }],
          teslimat: TESLIMAT,
        }),
      /bulunamadı/i
    );

    await kayitYokMu();
  });

  test("sıfır adet reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 0 }],
          teslimat: TESLIMAT,
        }),
      /en az 1/i
    );

    await kayitYokMu();
  });

  test("tam sayı olmayan adet reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 2.5 }],
          teslimat: TESLIMAT,
        }),
      /tam sayı/i
    );

    await kayitYokMu();
  });

  test("boş sepet reddedilir", async () => {
    await assert.rejects(
      () => siparisOlustur({ sepet: [], teslimat: TESLIMAT }),
      /boş/i
    );

    await kayitYokMu();
  });

  test("eksik teslimat alanı reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: { ...TESLIMAT, city: "   " },
        }),
      /zorunludur/i
    );

    await kayitYokMu();
  });

  test("geçersiz e-posta reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: { ...TESLIMAT, email: "gecersiz-adres" },
        }),
      /e-posta/i
    );

    await kayitYokMu();
  });

  test("geçersiz telefon reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: { ...TESLIMAT, phone: "123" },
        }),
      /telefon/i
    );

    await kayitYokMu();
  });

  test("çok uzun adres reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: { ...TESLIMAT, addressLine: "a".repeat(301) },
        }),
      /uzunluğu/i
    );

    await kayitYokMu();
  });

  test("var olmayan kullanıcıya sipariş yazılamaz", async () => {
    await assert.rejects(() =>
      siparisOlustur({
        sepet: [{ kod: STICKER.kod, adet: 1 }],
        teslimat: TESLIMAT,
        userId: randomUUID(),
      })
    );

    await kayitYokMu();
  });
});
