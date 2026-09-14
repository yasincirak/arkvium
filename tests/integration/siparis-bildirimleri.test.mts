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
 * İptal / kargo / iade bilgilendirme e-postaları.
 *
 * GERÇEK E-POSTA GÖNDERİLMEZ: `EPOSTA_GONDERIMI_KAPALI=1` ayarlıdır ve
 * her testte gönderici sahte bir fonksiyonla değiştirilir. Sağlayıcıya
 * hiçbir ağ çağrısı çıkmaz.
 *
 * Doğrulananlar:
 *  - Alıcı YALNIZCA sipariş kaydından gelir.
 *  - Gönderim hatası ana işlemi (iptal / kargo geçişi / iade) BOZMAZ.
 *  - Gönderim sonucu `OrderEvent` satırına yazılır (izlenebilirlik).
 *  - E-postada hassas veri (telefon, adres, ödeme referansı) yer almaz.
 *  - Kargo e-postası yalnızca doğrulanmış kargo bilgisini içerir.
 *  - Başarısız iadede müşteriye iade bildirimi GİTMEZ.
 *
 * TÜRKÇE BÜYÜK/KÜÇÜK HARF TUZAĞI: `"İ".toLowerCase()` "i" üretmez.
 * Metin aramalarında `/i` bayrağı kullanılmaz; kalıplar birebir yazılır.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.EPOSTA_GONDERIMI_KAPALI = "1";
process.env.NEXT_PUBLIC_APP_URL = "https://test.invalid";

delete process.env.IYZICO_OTOMATIK_IADE;

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { rezervasyonSonGecerliligi } = await import(
  "../../src/lib/qr-rezervasyon.ts"
);
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");
const { siparisiIptalEt } = await import("../../src/lib/siparis-iptal.ts");
const { siparisDurumunuGuncelle } = await import(
  "../../src/lib/siparis-yonetim.ts"
);
const { KARGO_FIRMALARI } = await import("../../src/lib/kargo.ts");
const { iadeKaydiOlustur, iadeyiSaglayiciyaGonder, manuelIadeyiKaydet } =
  await import("../../src/lib/geri-odeme.ts");
const { BILDIRIM_OLAY_TURU } = await import(
  "../../src/lib/siparis-bildirim.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const ANAHTARLIK = SIPARIS_URUNLERI.find((u) => u.kod === "metal-anahtarlik")!;
const ADMIN = "yonetici@test.invalid";
const GECERLI_FIRMA = KARGO_FIRMALARI[0].kod;

const TELEFON = "05551112233";
const ADRES = "Örnek Mahallesi 1. Sokak No 2";

const TESLIMAT = {
  fullName: "Test Müşteri",
  email: "musteri@test.invalid",
  phone: TELEFON,
  addressLine: ADRES,
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

type YakalananEposta = { alici: string; konu: string; metin: string };

/** Gönderilen e-postaları toplayan sahte gönderici. */
function sahteGonderici() {
  const kutu: YakalananEposta[] = [];

  return {
    kutu,
    gonder: async (icerik: YakalananEposta) => {
      kutu.push(icerik);

      return { gonderildi: true };
    },
  };
}

/** Her çağrıda patlayan gönderici; ana işlemi bozmamalı. */
async function patlayanGonderici(): Promise<never> {
  throw new Error("sağlayıcı çöktü");
}

/** Sipariş oluşturup istenen duruma getirir. */
async function siparisHazirla(
  durum: "pending" | "paid" | "preparing",
  odemeVar = true
) {
  const siparis = await siparisOlustur({
    sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });

  if (durum !== "pending") {
    await prisma.order.update({
      where: { id: siparis.id },
      data: { status: durum, paidAt: new Date() },
    });
  }

  if (odemeVar) {
    await prisma.payment.create({
      data: {
        orderId: siparis.id,
        provider: "iyzico",
        providerConversationId: `konusma-${siparis.id}`,
        // `Payment.providerRef` BENZERSİZDİR; aynı testte iki sipariş
        // oluşturulabildiği için sipariş kimliğinden türetilir.
        providerRef: `iyz-ref-${siparis.id}`,
        status: durum === "pending" ? "pending" : "succeeded",
        amountKurus: siparis.totalKurus,
        confirmedAt: durum === "pending" ? null : new Date(),
      },
    });
  }

  return siparis;
}

/** Bildirim olaylarının notlarını verir. */
async function bildirimNotlari(orderId: string): Promise<string[]> {
  const olaylar = await prisma.orderEvent.findMany({
    where: { orderId, type: BILDIRIM_OLAY_TURU },
    orderBy: { createdAt: "asc" },
    select: { note: true },
  });

  return olaylar.map((olay) => olay.note ?? "");
}

describe("iptal bildirimi", () => {
  test("alıcı SİPARİŞ KAYDINDAN gelir ve sonuç olaya yazılır", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    await siparisiIptalEt({
      orderId: siparis.id,
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 1);
    assert.equal(posta.kutu[0].alici, TESLIMAT.email);
    assert.ok(posta.kutu[0].konu.includes(siparis.orderNumber));

    assert.deepEqual(await bildirimNotlari(siparis.id), [
      "İptal bilgilendirme e-postası gönderildi.",
    ]);
  });

  test("ödenmiş siparişte iade süreci bildirilir", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    await siparisiIptalEt({
      orderId: siparis.id,
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.ok(posta.kutu[0].metin.includes("iade süreci"));
  });

  test("ÖDENMEMİŞ siparişte iade sözü verilmez", async () => {
    const siparis = await siparisHazirla("pending");
    const posta = sahteGonderici();

    await siparisiIptalEt({
      orderId: siparis.id,
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.ok(posta.kutu[0].metin.includes("iade\nişlemi yapılmayacaktır"));
  });

  test("GÖNDERİM HATASI İPTALİ GERİ ALMAZ", async () => {
    const siparis = await siparisHazirla("paid");

    const sonuc = await siparisiIptalEt({
      orderId: siparis.id,
      adminEmail: ADMIN,
      epostaGonderici: patlayanGonderici,
    });

    const kayit = await prisma.order.findUniqueOrThrow({
      where: { id: siparis.id },
      select: { status: true, cancelledAt: true },
    });

    assert.equal(kayit.status, "cancelled");
    assert.ok(kayit.cancelledAt instanceof Date);
    assert.ok(sonuc.serbestBirakilanEtiket > 0, "stok geri dönmeli");

    // Hata sessizce yutulmaz; olay kaydına düşer.
    assert.deepEqual(await bildirimNotlari(siparis.id), [
      "İptal bilgilendirme e-postası gönderilemedi.",
    ]);
  });

  test("iptal gerekçesi bildirim yüzünden KAYBOLMAZ", async () => {
    /*
      Bildirim sonucu ayrı bir olaya yazılır; iptal olayının notu
      ezilmemelidir.
    */
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    await siparisiIptalEt({
      orderId: siparis.id,
      adminEmail: ADMIN,
      not: "musteri talebi",
      epostaGonderici: posta.gonder,
    });

    const iptalOlayi = await prisma.orderEvent.findFirstOrThrow({
      where: { orderId: siparis.id, type: "cancelled" },
      select: { note: true },
    });

    assert.equal(iptalOlayi.note, "musteri talebi");
  });

  test("ikinci iptal denemesi ikinci e-posta ÜRETMEZ", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    await siparisiIptalEt({
      orderId: siparis.id,
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    await assert.rejects(
      siparisiIptalEt({
        orderId: siparis.id,
        adminEmail: ADMIN,
        epostaGonderici: posta.gonder,
      })
    );

    assert.equal(posta.kutu.length, 1);
  });
});

describe("kargo bildirimi", () => {
  test("doğrulanmış kargo bilgisi e-postaya girer", async () => {
    const siparis = await siparisHazirla("preparing");
    const posta = sahteGonderici();

    await siparisDurumunuGuncelle({
      orderId: siparis.id,
      hedefDurum: "shipped",
      adminEmail: ADMIN,
      kargoFirmaKod: GECERLI_FIRMA,
      kargoTakipNo: "AB-1234567890",
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 1);
    assert.equal(posta.kutu[0].alici, TESLIMAT.email);
    assert.ok(posta.kutu[0].metin.includes("AB-1234567890"));
  });

  test("kargo bilgisi yoksa UYDURULMAZ", async () => {
    const siparis = await siparisHazirla("preparing");
    const posta = sahteGonderici();

    await siparisDurumunuGuncelle({
      orderId: siparis.id,
      hedefDurum: "shipped",
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 1);
    assert.ok(
      posta.kutu[0].metin.includes("Kargo firması ve takip numarası eklendiğinde")
    );
    assert.ok(!posta.kutu[0].metin.includes("Takip numarası:"));
  });

  test("HAZIRLIĞA ALMA geçişinde e-posta gönderilmez", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    await siparisDurumunuGuncelle({
      orderId: siparis.id,
      hedefDurum: "preparing",
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 0);
    assert.deepEqual(await bildirimNotlari(siparis.id), []);
  });

  test("GÖNDERİM HATASI KARGO GEÇİŞİNİ GERİ ALMAZ", async () => {
    const siparis = await siparisHazirla("preparing");

    await siparisDurumunuGuncelle({
      orderId: siparis.id,
      hedefDurum: "shipped",
      adminEmail: ADMIN,
      kargoFirmaKod: GECERLI_FIRMA,
      kargoTakipNo: "AB-1234567890",
      epostaGonderici: patlayanGonderici,
    });

    const kayit = await prisma.order.findUniqueOrThrow({
      where: { id: siparis.id },
      select: { status: true, shippedAt: true, kargoTakipNo: true },
    });

    assert.equal(kayit.status, "shipped");
    assert.ok(kayit.shippedAt instanceof Date);
    assert.equal(kayit.kargoTakipNo, "AB-1234567890");

    assert.deepEqual(await bildirimNotlari(siparis.id), [
      "Kargo bilgilendirme e-postası gönderilemedi.",
    ]);
  });

  test("ikinci kargolama denemesi ikinci e-posta ÜRETMEZ", async () => {
    const siparis = await siparisHazirla("preparing");
    const posta = sahteGonderici();

    await siparisDurumunuGuncelle({
      orderId: siparis.id,
      hedefDurum: "shipped",
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    await assert.rejects(
      siparisDurumunuGuncelle({
        orderId: siparis.id,
        hedefDurum: "shipped",
        adminEmail: ADMIN,
        epostaGonderici: posta.gonder,
      })
    );

    assert.equal(posta.kutu.length, 1);
  });
});

describe("iade bildirimi", () => {
  test("elle kaydedilen iade müşteriye bildirilir", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    // İade kaydı AÇMAK tek başına e-posta göndermez.
    assert.equal(posta.kutu.length, 0);

    await manuelIadeyiKaydet({
      refundId: kayit.id,
      islemKimligi: "panel-islem-1",
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 1);
    assert.equal(posta.kutu[0].alici, TESLIMAT.email);
    assert.ok(posta.kutu[0].konu.includes(siparis.orderNumber));

    assert.deepEqual(await bildirimNotlari(siparis.id), [
      "İade bilgilendirme e-postası gönderildi.",
    ]);
  });

  test("iade e-postasında sağlayıcı işlem kimliği YER ALMAZ", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    await manuelIadeyiKaydet({
      refundId: kayit.id,
      islemKimligi: "panel-islem-1",
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    const metin = posta.kutu[0].metin;

    assert.ok(!metin.includes("panel-islem-1"));
    assert.ok(!metin.includes("iyz-ref-"));
  });

  test("BAŞARISIZ sağlayıcı yanıtında iade bildirimi GİTMEZ", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => ({ basarili: false, hataKodu: "test" }),
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 0, "başarısız iade bildirilmemeli");
    assert.deepEqual(await bildirimNotlari(siparis.id), []);
  });

  test("BAŞARILI sağlayıcı yanıtında tek bildirim gider", async () => {
    const siparis = await siparisHazirla("paid");
    const posta = sahteGonderici();

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: ADMIN,
      otomatikAcik: true,
      saglayici: async () => ({
        basarili: true,
        saglayiciIslemKimligi: "iade-1",
      }),
      epostaGonderici: posta.gonder,
    });

    assert.equal(posta.kutu.length, 1);
    assert.ok(!posta.kutu[0].metin.includes("iade-1"));
  });

  test("GÖNDERİM HATASI İADE KAYDINI BOZMAZ", async () => {
    const siparis = await siparisHazirla("paid");

    const kayit = await iadeKaydiOlustur({
      orderId: siparis.id,
      adminEmail: ADMIN,
    });

    const sonuc = await manuelIadeyiKaydet({
      refundId: kayit.id,
      islemKimligi: "panel-islem-1",
      adminEmail: ADMIN,
      epostaGonderici: patlayanGonderici,
    });

    assert.equal(sonuc.status, "succeeded");
    assert.equal(sonuc.manuelIslemKimligi, "panel-islem-1");

    assert.deepEqual(await bildirimNotlari(siparis.id), [
      "İade bilgilendirme e-postası gönderilemedi.",
    ]);
  });
});

describe("hiçbir bildirimde hassas veri yoktur", () => {
  test("telefon, adres ve ödeme referansı e-postaya girmez", async () => {
    const siparis = await siparisHazirla("preparing");
    const posta = sahteGonderici();

    await siparisDurumunuGuncelle({
      orderId: siparis.id,
      hedefDurum: "shipped",
      adminEmail: ADMIN,
      kargoFirmaKod: GECERLI_FIRMA,
      kargoTakipNo: "AB-1234567890",
      epostaGonderici: posta.gonder,
    });

    const iptalSiparis = await siparisHazirla("paid");

    await siparisiIptalEt({
      orderId: iptalSiparis.id,
      adminEmail: ADMIN,
      epostaGonderici: posta.gonder,
    });

    assert.ok(posta.kutu.length >= 2);

    for (const eposta of posta.kutu) {
      for (const gizli of [TELEFON, ADRES, "iyz-ref-", "34710"]) {
        assert.ok(
          !eposta.metin.includes(gizli),
          `"${gizli}" e-postaya girmemeli`
        );
      }
    }
  });
});
