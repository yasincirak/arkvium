import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Satış analitiği ve yönetici bildirimi.
 *
 * Doğrulanan kurallar (tamamı görev tanımından):
 *  - BAŞARISIZ ÖDEME SATIŞ SAYILMAZ.
 *  - Başarılı sipariş YALNIZCA BİR KEZ sayılır ve TEK bildirim üretir;
 *    aynı bildirim tekrar gelse bile ikinci satır oluşmaz.
 *  - "Ödemeye başlandı" olayındaki ziyaretçi kimliği satış olayına
 *    taşınır (sepeti bırakan hesabı bu yüzden doğru çalışır).
 *  - Ürün ve tarih filtreleri doğru sonucu üretir.
 *  - Gelir ve satış adedi sipariş tablosundan okunur.
 *
 * GÜVENLİK: iyzico'ya hiçbir ağ isteği yapılmaz; sağlayıcı doğrulaması
 * her testte sahte bir fonksiyonla değiştirilir. Web push gönderilmez:
 * VAPID anahtarları tanımsız olduğu için gönderim katmanı sessizce
 * kapalıdır.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.EPOSTA_GONDERIMI_KAPALI = "1";

// Push gönderimi bu dosyada KESİN olarak kapalıdır.
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;

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
const { olayKaydet } = await import("../../src/lib/analitik.ts");
const { bildirimleriGetir, bildirimiOkunduIsaretle } = await import(
  "../../src/lib/bildirim.ts"
);
const { analitikRaporu } = await import("../../src/lib/analitik-rapor.ts");
const { aralikCoz } = await import("../../src/lib/analitik-aralik.ts");

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const ANAHTARLIK = SIPARIS_URUNLERI.find((u) => u.kod === "metal-anahtarlik")!;
const VALIZ = SIPARIS_URUNLERI.find((u) => u.kod === "valiz-etiketi")!;

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

  for (const kod of [ANAHTARLIK.kod, VALIZ.kod]) {
    for (let i = 0; i < 6; i += 1) {
      const uretilen = etiketUret();

      await prisma.tag.create({
        data: {
          code: uretilen.code,
          publicToken: uretilen.publicToken,
          activationCodeHash: uretilen.activationCodeHash,
          productKod: kod,
        },
      });
    }
  }
});

/** Sipariş + başlatılmış ödeme hazırlar. */
async function odemeHazirla(kod: string, adet = 1) {
  const siparis = await siparisOlustur({
    sepet: [{ kod, adet }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });

  const odeme = await odemeBaslat({
    orderId: siparis.id,
    saglayici: async () => ({ token: "sahte-token" }),
  });

  return { siparis, conversationId: odeme.conversationId };
}

function sahteDogrulayici(alanlar: Record<string, unknown>) {
  return async () => ({ basarili: true, ...alanlar }) as never;
}

function beklenenTutar(fiyatKurus: number, adet: number): string {
  const kurus = fiyatKurus * adet + KARGO_UCRETI_KURUS;

  return `${Math.trunc(kurus / 100)}.${String(kurus % 100).padStart(2, "0")}`;
}

/** Ödeme başlatma olayını ziyaretçi kimliğiyle yazar (uç bunu yapar). */
async function odemeBaslatmaOlayiYaz(
  orderId: string,
  visitorId: string,
  productKod: string,
  valueKurus: number
) {
  await olayKaydet({
    type: "checkout_started",
    visitorId,
    orderId,
    productKod,
    valueKurus,
  });
}

const BUGUN = () => aralikCoz({ aralik: "bugun" });

describe("başarısız ödeme satış sayılmaz", () => {
  test("satış olayı ve bildirim ÜRETİLMEZ", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    const sonuc = await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "FAILURE",
        paymentId: "iyz-basarisiz",
      }),
    });

    assert.equal(sonuc.durum, "basarisiz");

    assert.equal(
      await prisma.analyticsEvent.count({ where: { type: "purchase" } }),
      0,
      "başarısız ödeme satış olarak yazılmamalı"
    );

    assert.equal(
      await prisma.adminNotification.count({
        where: { orderId: siparis.id },
      }),
      0,
      "başarısız ödemede bildirim oluşmamalı"
    );

    assert.equal(
      await prisma.analyticsEvent.count({ where: { type: "payment_failed" } }),
      1,
      "başarısız ödeme olayı yazılmalı"
    );
  });

  test("rapor satış adedini ve geliri sıfır gösterir", async () => {
    const { conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "FAILURE",
        paymentId: "iyz-basarisiz-2",
      }),
    });

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.satisAdedi, 0);
    assert.equal(rapor.gelirKurus, 0);
    assert.equal(rapor.basarisizOdeme, 1);
  });

  test("ödeme henüz kesinleşmediyse de satış sayılmaz", async () => {
    const { conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    const sonuc = await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "PENDING",
      }),
    });

    assert.equal(sonuc.durum, "beklemede");

    assert.equal(
      await prisma.analyticsEvent.count({ where: { type: "purchase" } }),
      0
    );

    assert.equal(await prisma.adminNotification.count(), 0);
  });
});

describe("başarılı sipariş bir kez sayılır", () => {
  test("tek satış olayı ve TEK bildirim üretilir", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    const dogrulayici = sahteDogrulayici({
      conversationId,
      paymentStatus: "SUCCESS",
      paymentId: "iyz-basarili",
      paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
      currency: "TRY",
    });

    // Sağlayıcı dönüşü ÜÇ KEZ işlenir (tarayıcı yenileme, tekrar bildirim).
    await odemeSonucunuIsle({ token: "t", dogrulayici });
    await odemeSonucunuIsle({ token: "t", dogrulayici });
    await odemeSonucunuIsle({ token: "t", dogrulayici });

    assert.equal(
      await prisma.analyticsEvent.count({
        where: { type: "purchase", orderId: siparis.id },
      }),
      1,
      "sipariş yalnızca bir kez satış sayılmalı"
    );

    assert.equal(
      await prisma.adminNotification.count({ where: { orderId: siparis.id } }),
      1,
      "sipariş başına tek bildirim olmalı"
    );

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.satisAdedi, 1);
    assert.equal(
      rapor.gelirKurus,
      ANAHTARLIK.fiyatKurus + KARGO_UCRETI_KURUS,
      "gelir sipariş toplamından okunmalı"
    );
  });

  test("bildirim okunmamış başlar ve sipariş kimliğini taşır", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-bildirim",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const bildirim = await prisma.adminNotification.findFirst({
      where: { orderId: siparis.id },
    });

    assert.ok(bildirim, "bildirim oluşmalı");
    assert.equal(bildirim?.readAt, null, "yeni bildirim okunmamış olmalı");
    assert.equal(bildirim?.type, "yeni_siparis");
    assert.ok(
      bildirim?.metin.includes(siparis.orderNumber),
      "bildirim sipariş numarasını içermeli"
    );

    // Bildirim metninde KİŞİSEL VERİ bulunmamalı.
    for (const alan of [bildirim!.baslik, bildirim!.metin]) {
      assert.ok(!alan.includes(TESLIMAT.fullName));
      assert.ok(!alan.includes(TESLIMAT.email));
      assert.ok(!alan.includes(TESLIMAT.phone));
      assert.ok(!alan.includes(TESLIMAT.addressLine));
    }
  });

  test("satış olayında kişisel veri saklanmaz", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-gizlilik",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const olay = await prisma.analyticsEvent.findFirst({
      where: { type: "purchase", orderId: siparis.id },
    });

    assert.ok(olay);

    const metin = JSON.stringify(olay);

    for (const kisisel of [
      TESLIMAT.fullName,
      TESLIMAT.email,
      TESLIMAT.phone,
      TESLIMAT.addressLine,
      TESLIMAT.city,
    ]) {
      assert.ok(
        !metin.includes(kisisel),
        `analitik satırında kişisel veri bulunmamalı: ${kisisel}`
      );
    }
  });
});

describe("huni ve sepeti bırakanlar", () => {
  test("ödemeye başlayan ziyaretçi satış olayına taşınır", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    const ziyaretci = "a".repeat(32);

    await odemeBaslatmaOlayiYaz(
      siparis.id,
      ziyaretci,
      ANAHTARLIK.kod,
      ANAHTARLIK.fiyatKurus + KARGO_UCRETI_KURUS
    );

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-huni",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const satis = await prisma.analyticsEvent.findFirst({
      where: { type: "purchase", orderId: siparis.id },
      select: { visitorId: true },
    });

    assert.equal(satis?.visitorId, ziyaretci);
  });

  test("sepete ekleyip satın almayan doğru sayılır", async () => {
    const alan = "a".repeat(32);
    const almayan = "b".repeat(32);

    for (const ziyaretci of [alan, almayan]) {
      await olayKaydet({
        type: "cart_add",
        visitorId: ziyaretci,
        productKod: ANAHTARLIK.kod,
        path: "/",
      });
    }

    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeBaslatmaOlayiYaz(
      siparis.id,
      alan,
      ANAHTARLIK.kod,
      ANAHTARLIK.fiyatKurus + KARGO_UCRETI_KURUS
    );

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-birakan",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.sepeteEkleme, 2);
    assert.equal(rapor.sepetiBirakan, 1, "yalnızca bir ziyaretçi bırakmalı");
    assert.equal(rapor.huni.sepeteEkleyen, 2);
    assert.equal(rapor.huni.satinAlan, 1);
  });

  test("huni adımları hiçbir zaman artan sırada olamaz", async () => {
    /*
      Sepete ekleme olayı ürün kartı tıklamasında, ürün görüntüleme ise
      sipariş sayfası açılışında yazılır. Yönlendirme yarıda kesilirse
      ziyaretçinin YALNIZCA sepete ekleme olayı olur. Huni "en az bu
      aşamaya ulaşan" mantığıyla saydığı için bu ziyaretçi görüntüleyen
      sayısına da girer ve oran %100'ü aşamaz.
    */
    const yarimKalan = "f".repeat(32);

    await olayKaydet({
      type: "cart_add",
      visitorId: yarimKalan,
      productKod: ANAHTARLIK.kod,
      path: "/",
    });

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(
      rapor.urunGoruntuleme,
      0,
      "ürün görüntüleme olayı hiç yazılmadı"
    );

    assert.equal(
      rapor.huni.goruntuleyen,
      1,
      "sepete ekleyen ziyaretçi görüntüleyen sayısına da girmeli"
    );

    assert.ok(
      rapor.huni.goruntuleyen >= rapor.huni.sepeteEkleyen &&
        rapor.huni.sepeteEkleyen >= rapor.huni.odemeBaslatan &&
        rapor.huni.odemeBaslatan >= rapor.huni.satinAlan,
      "huni adımları azalan sırada olmalı"
    );
  });

  test("satın alan ziyaretçi huninin tüm adımlarında sayılır", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    const ziyaretci = "9".repeat(32);

    await odemeBaslatmaOlayiYaz(
      siparis.id,
      ziyaretci,
      ANAHTARLIK.kod,
      ANAHTARLIK.fiyatKurus + KARGO_UCRETI_KURUS
    );

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-huni-monoton",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.huni.satinAlan, 1);
    assert.equal(rapor.huni.odemeBaslatan, 1);
    assert.equal(rapor.huni.sepeteEkleyen, 1, "satın alan sepete de eklemiştir");
    assert.equal(rapor.huni.goruntuleyen, 1, "satın alan ürünü de görmüştür");
  });

  test("aynı ziyaretçinin tekrar eden olayları tekil sayılır", async () => {
    const ziyaretci = "c".repeat(32);

    for (let i = 0; i < 5; i += 1) {
      await olayKaydet({
        type: "product_view",
        visitorId: ziyaretci,
        productKod: ANAHTARLIK.kod,
        path: "/siparis",
      });
    }

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.urunGoruntuleme, 5, "olay sayısı 5 olmalı");
    assert.equal(rapor.tekilZiyaretci, 1, "tekil ziyaretçi 1 olmalı");
    assert.equal(rapor.huni.goruntuleyen, 1);
  });
});

describe("ürün filtresi", () => {
  test("yalnızca seçili ürünün sayıları döner", async () => {
    await olayKaydet({
      type: "product_view",
      visitorId: "d".repeat(32),
      productKod: ANAHTARLIK.kod,
    });

    await olayKaydet({
      type: "product_view",
      visitorId: "e".repeat(32),
      productKod: VALIZ.kod,
    });

    const anahtarlik = await analitikRaporu(BUGUN(), ANAHTARLIK.kod);
    const valiz = await analitikRaporu(BUGUN(), VALIZ.kod);
    const tumu = await analitikRaporu(BUGUN());

    assert.equal(anahtarlik.urunGoruntuleme, 1);
    assert.equal(valiz.urunGoruntuleme, 1);
    assert.equal(tumu.urunGoruntuleme, 2);

    assert.equal(anahtarlik.urunler.length, 1);
    assert.equal(anahtarlik.urunler[0].kod, ANAHTARLIK.kod);
  });

  test("ürün filtresinde gelir o ürünün satır toplamıdır", async () => {
    const { conversationId } = await odemeHazirla(VALIZ.kod, 2);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-urun-filtre",
        paidPrice: beklenenTutar(VALIZ.fiyatKurus, 2),
        currency: "TRY",
      }),
    });

    const valiz = await analitikRaporu(BUGUN(), VALIZ.kod);
    const anahtarlik = await analitikRaporu(BUGUN(), ANAHTARLIK.kod);

    assert.equal(valiz.satisAdedi, 1, "bir sipariş");
    assert.equal(
      valiz.gelirKurus,
      VALIZ.fiyatKurus * 2,
      "kargo hariç, ürünün satır toplamı"
    );

    assert.equal(anahtarlik.satisAdedi, 0, "diğer ürün etkilenmemeli");
    assert.equal(anahtarlik.gelirKurus, 0);
  });

  test("ürün bazlı dönüşüm oranı hesaplanır", async () => {
    for (let i = 0; i < 4; i += 1) {
      await olayKaydet({
        type: "product_view",
        visitorId: String(i).repeat(32).slice(0, 32),
        productKod: VALIZ.kod,
      });
    }

    const { conversationId } = await odemeHazirla(VALIZ.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-donusum",
        paidPrice: beklenenTutar(VALIZ.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const rapor = await analitikRaporu(BUGUN(), VALIZ.kod);
    const satir = rapor.urunler[0];

    assert.equal(satir.goruntuleme, 4);
    assert.equal(satir.satisAdedi, 1);
    assert.equal(satir.donusumYuzde, 25);
  });

  test("görüntülemesi olmayan üründe dönüşüm boş döner", async () => {
    const rapor = await analitikRaporu(BUGUN(), VALIZ.kod);

    assert.equal(rapor.urunler[0].donusumYuzde, null);
  });
});

describe("tarih filtresi", () => {
  test("aralık dışındaki olay ve satış rapora girmez", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-tarih",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    // Satışı ve olayı 40 gün geriye taşı.
    const eski = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

    await prisma.order.update({
      where: { id: siparis.id },
      data: { paidAt: eski },
    });

    await prisma.analyticsEvent.updateMany({
      where: { orderId: siparis.id },
      data: { createdAt: eski },
    });

    const bugun = await analitikRaporu(aralikCoz({ aralik: "bugun" }));
    const otuzGun = await analitikRaporu(aralikCoz({ aralik: "30g" }));

    assert.equal(bugun.satisAdedi, 0, "bugün raporunda görünmemeli");
    assert.equal(otuzGun.satisAdedi, 0, "30 gün raporunda da görünmemeli");

    const genis = await analitikRaporu(
      aralikCoz({
        aralik: "ozel",
        bas: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        bit: new Date().toISOString().slice(0, 10),
      })
    );

    assert.equal(genis.satisAdedi, 1, "geniş aralıkta görünmeli");
  });

  test("bugünkü satış 7 ve 30 günlük raporda da yer alır", async () => {
    const { conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-tarih-2",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    for (const anahtar of ["bugun", "7g", "30g"] as const) {
      const rapor = await analitikRaporu(aralikCoz({ aralik: anahtar }));

      assert.equal(rapor.satisAdedi, 1, `${anahtar} raporunda görünmeli`);
    }
  });
});

describe("mevcut ödeme akışı bozulmadı", () => {
  test("ödenen siparişin durumu, ödemesi ve QR rezervasyonu korunur", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod, 2);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-regresyon",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 2),
        currency: "TRY",
      }),
    });

    const guncel = await prisma.order.findUnique({
      where: { id: siparis.id },
      select: { status: true, paidAt: true },
    });

    assert.equal(guncel?.status, "paid");
    assert.ok(guncel?.paidAt);

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true, providerRef: true },
    });

    assert.equal(odeme?.status, "succeeded");
    assert.equal(odeme?.providerRef, "iyz-regresyon");

    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      2,
      "ödenen siparişin rezervasyonu korunmalı"
    );

    assert.equal(
      await prisma.orderEvent.count({
        where: { orderId: siparis.id, type: "paid" },
      }),
      1,
      "tek 'paid' olayı olmalı"
    );
  });

  test("başarısız ödemede etiketler stoğa döner", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod, 2);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "FAILURE",
        paymentId: "iyz-regresyon-2",
      }),
    });

    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      0,
      "başarısız ödemede rezervasyon serbest bırakılmalı"
    );
  });
});

describe("bildirim içeriği", () => {
  test("bildirim sipariş ayrıntılarını siparişten okur", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod, 2);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-bildirim-icerik",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 2),
        currency: "TRY",
      }),
    });

    const liste = await bildirimleriGetir();

    assert.equal(liste.bildirimler.length, 1);

    const bildirim = liste.bildirimler[0];

    assert.equal(bildirim.orderNumber, siparis.orderNumber);
    assert.equal(bildirim.musteriAdi, TESLIMAT.fullName);
    assert.equal(bildirim.eposta, TESLIMAT.email);
    assert.equal(bildirim.telefon, TESLIMAT.phone);
    assert.equal(
      bildirim.totalKurus,
      ANAHTARLIK.fiyatKurus * 2 + KARGO_UCRETI_KURUS
    );
    assert.ok(bildirim.siparisTarihi, "sipariş tarihi olmalı");
    assert.ok(bildirim.odemeTarihi, "ödeme tarihi olmalı");

    assert.equal(bildirim.kalemler.length, 1);
    assert.equal(bildirim.kalemler[0].ad, ANAHTARLIK.ad);
    assert.equal(bildirim.kalemler[0].adet, 2);
  });

  test("kişisel veri bildirim SATIRINA kopyalanmaz", async () => {
    const { siparis, conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-bildirim-gizlilik",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const satir = await prisma.adminNotification.findFirst({
      where: { orderId: siparis.id },
    });

    const metin = JSON.stringify(satir);

    for (const kisisel of [
      TESLIMAT.fullName,
      TESLIMAT.email,
      TESLIMAT.phone,
      TESLIMAT.addressLine,
    ]) {
      assert.ok(
        !metin.includes(kisisel),
        `bildirim satırına kopyalanmamalı: ${kisisel}`
      );
    }
  });

  test("okunmamış sayacı ve okundu işaretleme çalışır", async () => {
    const { conversationId } = await odemeHazirla(ANAHTARLIK.kod);

    await odemeSonucunuIsle({
      token: "t",
      dogrulayici: sahteDogrulayici({
        conversationId,
        paymentStatus: "SUCCESS",
        paymentId: "iyz-okundu",
        paidPrice: beklenenTutar(ANAHTARLIK.fiyatKurus, 1),
        currency: "TRY",
      }),
    });

    const once = await bildirimleriGetir();

    assert.equal(once.okunmamis, 1);
    assert.equal(once.bildirimler[0].okundu, false);

    await bildirimiOkunduIsaretle(once.bildirimler[0].id);

    const sonra = await bildirimleriGetir();

    assert.equal(sonra.okunmamis, 0);
    assert.equal(sonra.bildirimler[0].okundu, true);
  });
});

describe("toplam ziyaret ve kullanıcı ilişkisi", () => {
  test("tekil ziyaretçi ile toplam ziyaret ayrı sayılır", async () => {
    const ziyaretci = "d".repeat(32);

    for (const ziyaret of ["1".repeat(32), "1".repeat(32), "2".repeat(32)]) {
      await olayKaydet({
        type: "page_view",
        visitorId: ziyaretci,
        sessionId: ziyaret,
        path: "/",
      });
    }

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.tekilZiyaretci, 1, "tek kişi");
    assert.equal(rapor.toplamZiyaret, 2, "iki ayrı ziyaret");
    assert.equal(rapor.sayfaGoruntuleme, 3, "üç görüntüleme");
  });

  test("giriş yapan kullanıcı hesabıyla tekil sayılır", async () => {
    // Aynı kullanıcı iki farklı cihazdan (iki ziyaret) geliyor.
    for (const ziyaret of ["3".repeat(32), "4".repeat(32)]) {
      await olayKaydet({
        type: "product_view",
        userId: "kullanici-1",
        visitorId: "yok-sayilmali".padEnd(32, "x"),
        sessionId: ziyaret,
        productKod: ANAHTARLIK.kod,
      });
    }

    const olaylar = await prisma.analyticsEvent.findMany({
      select: { userId: true, visitorId: true },
    });

    for (const olay of olaylar) {
      assert.equal(olay.userId, "kullanici-1");
      assert.equal(olay.visitorId, null, "anonim kimlik yazılmamalı");
    }

    const rapor = await analitikRaporu(BUGUN());

    assert.equal(rapor.tekilZiyaretci, 1, "iki cihaz tek kişi sayılmalı");
    assert.equal(rapor.toplamZiyaret, 2);
  });

  test("ürün bazlı huni oranları hesaplanır", async () => {
    for (let i = 0; i < 4; i += 1) {
      await olayKaydet({
        type: "product_view",
        visitorId: String(i).repeat(32).slice(0, 32),
        productKod: VALIZ.kod,
      });
    }

    await olayKaydet({
      type: "cart_add",
      visitorId: "5".repeat(32),
      productKod: VALIZ.kod,
    });

    await olayKaydet({
      type: "cart_remove",
      visitorId: "5".repeat(32),
      productKod: VALIZ.kod,
    });

    const rapor = await analitikRaporu(BUGUN(), VALIZ.kod);
    const satir = rapor.urunler[0];

    assert.equal(satir.goruntuleme, 4);
    assert.equal(satir.sepeteEkleme, 1);
    assert.equal(satir.sepettenCikarma, 1);
    assert.equal(satir.goruntulemedenSepeteYuzde, 25);
    assert.equal(satir.sepettenSatisaYuzde, 0);
  });
});
