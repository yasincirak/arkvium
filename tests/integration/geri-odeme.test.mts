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
 * Geri ödeme — veritabanı davranışı.
 *
 * GERÇEK AĞ ÇAĞRISI YOKTUR: sağlayıcı her testte sahte bir fonksiyonla
 * değiştirilir ve özellik bayrağı testten verilir. Hiçbir para hareketi
 * oluşmaz.
 *
 * Doğrulananlar:
 *  - Otomatik iade KAPALIYKEN sağlayıcıya HİÇ çağrı yapılmaz.
 *  - Tutar sunucuda hesaplanır; tahsil edilen tutarı aşamaz.
 *  - Aynı ödeme için ikinci açık iade kaydı oluşmaz.
 *  - Çift gönderimde sağlayıcıya yalnızca bir kez çıkılır.
 *  - Başarısız sağlayıcı yanıtı sipariş ve stok durumunu DEĞİŞTİRMEZ.
 *  - Elle iade kaydı işlem kimliğini saklar.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.EPOSTA_GONDERIMI_KAPALI = "1";

// Otomatik iade bu dosyada ORTAMDAN AÇILMAZ; her test bayrağı kendisi verir.
delete process.env.IYZICO_OTOMATIK_IADE;

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { rezervasyonSonGecerliligi } = await import(
  "../../src/lib/qr-rezervasyon.ts"
);
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");
const {
  iadeKaydiOlustur,
  iadeyiSaglayiciyaGonder,
  manuelIadeyiKaydet,
  siparisIadeleri,
  GeriOdemeHatasi,
} = await import("../../src/lib/geri-odeme.ts");

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

const ADMIN = "yonetici@test.invalid";

beforeEach(async () => {
  await veritabaniniTemizle(db);

  await stokDoldur({
    prisma,
    etiketUret,
    urunKodlari: SIPARIS_URUNLERI.map((u) => u.kod),
    urunBasinaAdet: 8,
  });
});

/** Ödenmiş sipariş ve başarılı ödeme kaydı hazırlar. */
async function odenmisSiparis(providerRef: string | null = "iyz-ref-1") {
  const siparis = await siparisOlustur({
    sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });

  await prisma.order.update({
    where: { id: siparis.id },
    data: { status: "paid", paidAt: new Date() },
  });

  const odeme = await prisma.payment.create({
    data: {
      orderId: siparis.id,
      provider: "iyzico",
      providerConversationId: `konusma-${siparis.id}`,
      providerRef,
      status: "succeeded",
      amountKurus: siparis.totalKurus,
      confirmedAt: new Date(),
    },
    select: { id: true, amountKurus: true },
  });

  return { siparis, odeme };
}

describe("otomatik iade KAPALIYKEN", () => {
  test("sağlayıcıya HİÇ çağrı yapılmaz", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    let cagrildi = false;

    await assert.rejects(
      () =>
        iadeyiSaglayiciyaGonder({
          refundId: kayit.id,
          adminEmail: ADMIN,
          otomatikAcik: false,
          saglayici: async () => {
            cagrildi = true;

            return { basarili: true };
          },
        }),
      /Otomatik iade kapalı/i
    );

    assert.equal(cagrildi, false, "sağlayıcıya çağrı yapılmamalı");

    const guncel = await prisma.refund.findUniqueOrThrow({
      where: { id: kayit.id },
    });

    assert.equal(guncel.status, "requested", "kayıt olduğu gibi kalmalı");
  });

  test("kayıt yöneticiye elle işlem gerektiğini bildirir", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    assert.equal(kayit.manuelIslemGerekli, true);
    assert.equal(kayit.status, "requested");
  });

  test("elle yapılan iade işlem kimliğiyle kaydedilir", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    const kapatilan = await manuelIadeyiKaydet({
      refundId: kayit.id,
      islemKimligi: "iyz-panel-12345",
      adminEmail: ADMIN,
    });

    assert.equal(kapatilan.status, "succeeded");
    assert.equal(kapatilan.manuelIslemKimligi, "iyz-panel-12345");
    assert.ok(kapatilan.completedAt);
  });

  test("işlem kimliği olmadan elle kapatılamaz", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    await assert.rejects(
      () =>
        manuelIadeyiKaydet({
          refundId: kayit.id,
          islemKimligi: "",
          adminEmail: ADMIN,
        }),
      /işlem kimliğini girmelisiniz/i
    );

    const guncel = await prisma.refund.findUniqueOrThrow({
      where: { id: kayit.id },
    });

    assert.equal(guncel.status, "requested");
  });
});

describe("tutar güvenliği", () => {
  test("tutar verilmezse tam iade kaydı açılır", async () => {
    const { siparis, odeme } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    assert.equal(kayit.amountKurus, odeme.amountKurus);
  });

  test("tahsil edilen tutarı AŞAN istek reddedilir", async () => {
    const { siparis, odeme } = await odenmisSiparis();

    await assert.rejects(
      () =>
        iadeKaydiOlustur({
          orderId: siparis.id,
          istenenKurus: odeme.amountKurus + 1,
          adminEmail: ADMIN,
        }),
      /büyük olamaz/i
    );

    assert.equal(await prisma.refund.count(), 0, "kayıt açılmamalı");
  });

  test("uydurma tutar tipleri reddedilir", async () => {
    const { siparis } = await odenmisSiparis();

    for (const istenen of ["999999", 1.5, -100, 0]) {
      await assert.rejects(
        () =>
          iadeKaydiOlustur({
            orderId: siparis.id,
            istenenKurus: istenen,
            adminEmail: ADMIN,
          }),
        GeriOdemeHatasi
      );
    }

    assert.equal(await prisma.refund.count(), 0);
  });

  test("ödemesi olmayan siparişte iade açılamaz", async () => {
    const siparis = await siparisOlustur({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
      teslimat: TESLIMAT,
      rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
    });

    await assert.rejects(
      () => iadeKaydiOlustur({ orderId: siparis.id, adminEmail: ADMIN }),
      /bulunamadı/i
    );
  });
});

describe("idempotency — çift iade engellenir", () => {
  test("aynı ödeme için ikinci AÇIK kayıt oluşmaz", async () => {
    const { siparis } = await odenmisSiparis();

    await iadeKaydiOlustur({ orderId: siparis.id, adminEmail: ADMIN });

    await assert.rejects(
      () => iadeKaydiOlustur({ orderId: siparis.id, adminEmail: ADMIN }),
      /zaten açık bir iade/i
    );

    assert.equal(await prisma.refund.count(), 1);
  });

  test("çift gönderimde sağlayıcıya YALNIZCA BİR KEZ çıkılır", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    let cagriSayisi = 0;

    const saglayici = async () => {
      cagriSayisi += 1;

      return { basarili: true, saglayiciIslemKimligi: "iyz-iade-1" };
    };

    await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici,
    });

    await assert.rejects(
      () =>
        iadeyiSaglayiciyaGonder({
          refundId: kayit.id,
          adminEmail: ADMIN,
          otomatikAcik: true,
          saglayici,
        }),
      /zaten sonuçlanmış/i
    );

    assert.equal(cagriSayisi, 1, "sağlayıcıya tek çağrı");
  });

  test("başarılı iadeden sonra kalan tutar için yeni kayıt açılabilir", async () => {
    const { siparis, odeme } = await odenmisSiparis();

    const ilk = await iadeKaydiOlustur({
      orderId: siparis.id,
      istenenKurus: 10000,
      adminEmail: ADMIN,
    });

    await iadeyiSaglayiciyaGonder({
      refundId: ilk.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => ({ basarili: true }),
    });

    const ikinci = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    assert.equal(
      ikinci.amountKurus,
      odeme.amountKurus - 10000,
      "kalan tutar iade edilmeli"
    );
  });
});

describe("başarısız sağlayıcı yanıtı", () => {
  test("sipariş ve stok durumu DEĞİŞMEZ", async () => {
    const { siparis } = await odenmisSiparis();

    const oncekiRezervasyon = await prisma.orderTag.count({
      where: { orderId: siparis.id },
    });

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    const sonuc = await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => ({ basarili: false, hataKodu: "5001" }),
    });

    assert.equal(sonuc.status, "failed");
    assert.equal(sonuc.errorCode, "5001");

    const guncelSiparis = await prisma.order.findUniqueOrThrow({
      where: { id: siparis.id },
      select: { status: true, totalKurus: true },
    });

    assert.equal(guncelSiparis.status, "paid", "sipariş durumu değişmemeli");
    assert.equal(guncelSiparis.totalKurus, siparis.totalKurus);

    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      oncekiRezervasyon,
      "stok değişmemeli"
    );

    const odeme = await prisma.payment.findFirstOrThrow({
      where: { orderId: siparis.id },
    });

    assert.equal(odeme.status, "succeeded", "ödeme durumu değişmemeli");
  });

  test("sağlayıcı istisna atarsa kayıt başarısız kapanır", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    const sonuc = await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => {
        throw new Error("ag hatasi");
      },
    });

    assert.equal(sonuc.status, "failed");
    assert.equal(sonuc.errorCode, "istisna");
  });

  test("başarısız iade yeniden denenebilir", async () => {
    const { siparis } = await odenmisSiparis();

    const ilk = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    await iadeyiSaglayiciyaGonder({
      refundId: ilk.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => ({ basarili: false, hataKodu: "5001" }),
    });

    // Anahtar boşaldığı için yeni kayıt açılabilmeli.
    const ikinci = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    assert.ok(ikinci.id);
    assert.equal(await prisma.refund.count(), 2);
  });

  test("sağlayıcı referansı yoksa çağrı yapılmaz", async () => {
    const { siparis } = await odenmisSiparis(null);

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    let cagrildi = false;

    await assert.rejects(
      () =>
        iadeyiSaglayiciyaGonder({
          refundId: kayit.id,
          adminEmail: ADMIN,
          otomatikAcik: true,
          saglayici: async () => {
            cagrildi = true;

            return { basarili: true };
          },
        }),
      /sağlayıcı referansı yok/i
    );

    assert.equal(cagrildi, false);
  });
});

describe("başarılı iade", () => {
  test("sağlayıcı işlem kimliği kaydedilir", async () => {
    const { siparis } = await odenmisSiparis();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    const sonuc = await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => ({
        basarili: true,
        saglayiciIslemKimligi: "iyz-iade-999",
      }),
    });

    assert.equal(sonuc.status, "succeeded");
    assert.equal(sonuc.providerRefundId, "iyz-iade-999");
    assert.equal(sonuc.errorCode, null);
    assert.ok(sonuc.completedAt);
  });

  test("sipariş iadeleri listelenebilir", async () => {
    const { siparis } = await odenmisSiparis();

    await iadeKaydiOlustur({ orderId: siparis.id, adminEmail: ADMIN });

    const liste = await siparisIadeleri(siparis.id);

    assert.equal(liste.length, 1);
    assert.equal(liste[0].orderId, siparis.id);
  });
});
