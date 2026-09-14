import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  stokDoldur,
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
  yoneticiOturumuKur,
} from "../helpers/test-ortami.mts";

/**
 * Müşteri iptal/iade talepleri — veritabanı ve yetkilendirme.
 *
 * Doğrulananlar:
 *  - Talep YALNIZCA `publicToken` ile açılır; sipariş kimliği kabul
 *    edilmez.
 *  - BAŞKA MÜŞTERİNİN siparişine erişilemez.
 *  - Aynı sipariş için ikinci bekleyen talep açılamaz.
 *  - Yönetici uçları oturumsuz ve CUSTOMER rolünde 401 döner.
 *  - Karar siparişi DEĞİŞTİRMEZ (iptal etmez, para iadesi yapmaz).
 *  - Reddetme gerekçe ister.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.USER_SESSION_SECRET = "test-kullanici-anahtari-" + "u".repeat(32);
process.env.EPOSTA_GONDERIMI_KAPALI = "1";

const { prisma } = await import("../../src/lib/prisma.ts");
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { rezervasyonSonGecerliligi } = await import(
  "../../src/lib/qr-rezervasyon.ts"
);
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");
const { POST: talepUcu } = await import(
  "../../src/app/api/siparis/talep/route.ts"
);
const { GET: listeUcu } = await import(
  "../../src/app/api/admin/talepler/route.ts"
);
const { POST: kararUcu } = await import(
  "../../src/app/api/admin/talepler/[id]/karar/route.ts"
);
const { cerezAyarla, cerezleriTemizle } = await import(
  "../helpers/next-taklit.mjs"
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
  cerezleriTemizle();

  await stokDoldur({
    prisma,
    etiketUret,
    urunKodlari: SIPARIS_URUNLERI.map((u) => u.kod),
    urunBasinaAdet: 8,
  });
});

async function siparisHazirla(durum = "paid") {
  const siparis = await siparisOlustur({
    sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });

  if (durum !== "pending") {
    await prisma.order.update({
      where: { id: siparis.id },
      data: { status: durum as never, paidAt: new Date() },
    });
  }

  return siparis;
}

function talepIstegi(govde: unknown): Request {
  return new Request("http://localhost/api/siparis/talep", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `198.51.100.${1 + Math.floor(Math.random() * 250)}`,
    },
    body: JSON.stringify(govde),
  });
}

const GEREKCE = "Yanlış ürün sipariş ettim, iptal etmek istiyorum.";

describe("talep oluşturma", () => {
  test("publicToken ile talep açılır", async () => {
    const siparis = await siparisHazirla("paid");

    const yanit = await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(yanit.status, 200);

    const talep = await prisma.orderRequest.findFirst({
      where: { orderId: siparis.id },
      select: { type: true, status: true, gerekce: true, aktifAnahtar: true },
    });

    assert.equal(talep?.type, "cancel");
    assert.equal(talep?.status, "pending");
    assert.equal(talep?.gerekce, GEREKCE);
    assert.equal(talep?.aktifAnahtar, siparis.id, "aktif anahtar yazılmalı");
  });

  test("SİPARİŞ KİMLİĞİ ile talep açılamaz", async () => {
    const siparis = await siparisHazirla("paid");

    // Sipariş kimliği token yerine gönderilirse sipariş bulunamaz.
    const yanit = await talepUcu(
      talepIstegi({
        publicToken: siparis.id,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.orderRequest.count(), 0);
  });

  test("BAŞKA MÜŞTERİNİN siparişine erişilemez", async () => {
    const benim = await siparisHazirla("paid");
    const digeri = await siparisHazirla("paid");

    // Kendi tokenımla talep açınca yalnızca KENDİ siparişime yazılır.
    await talepUcu(
      talepIstegi({
        publicToken: benim.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(
      await prisma.orderRequest.count({ where: { orderId: digeri.id } }),
      0,
      "diğer siparişe talep yazılmamalı"
    );
  });

  test("uydurma token reddedilir", async () => {
    await talepUcu(
      talepIstegi({
        publicToken: "uydurma-token-degeri",
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(await prisma.orderRequest.count(), 0);
  });

  test("kısa gerekçe reddedilir", async () => {
    const siparis = await siparisHazirla("paid");

    const yanit = await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: "kısa",
      })
    );

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.orderRequest.count(), 0);
  });

  test("yanlış tür sipariş durumuna göre reddedilir", async () => {
    const siparis = await siparisHazirla("paid");

    // Kargolanmamış siparişte iade talebi açılamaz.
    const yanit = await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "refund",
        gerekce: GEREKCE,
      })
    );

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.orderRequest.count(), 0);
  });

  test("ÇAKIŞAN ikinci bekleyen talep açılamaz", async () => {
    const siparis = await siparisHazirla("paid");

    const ilk = await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(ilk.status, 200);

    const ikinci = await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(ikinci.status, 400);
    assert.match((await ikinci.json()).error, /bekleyen bir talebiniz/i);

    assert.equal(
      await prisma.orderRequest.count({ where: { orderId: siparis.id } }),
      1,
      "tek talep kalmalı"
    );
  });
});

describe("yönetici yetkilendirmesi", () => {
  test("oturumsuz liste ucu 401 döner", async () => {
    const yanit = await listeUcu(
      new Request("http://localhost/api/admin/talepler")
    );

    assert.equal(yanit.status, 401);
  });

  test("CUSTOMER rolü liste ucuna erişemez", async () => {
    await yoneticiOturumuKur({
      prisma,
      cerezAyarla,
      eposta: "musteri-rol@test.invalid",
      rol: "CUSTOMER",
    });

    const yanit = await listeUcu(
      new Request("http://localhost/api/admin/talepler")
    );

    assert.equal(yanit.status, 401);
  });

  test("oturumsuz karar ucu 401 döner ve talep değişmez", async () => {
    const siparis = await siparisHazirla("paid");

    await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    const talep = await prisma.orderRequest.findFirstOrThrow({
      where: { orderId: siparis.id },
    });

    const yanit = await kararUcu(
      new Request("http://localhost/api/admin/talepler/x/karar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ karar: "approved" }),
      }),
      { params: { id: talep.id } }
    );

    assert.equal(yanit.status, 401);

    const guncel = await prisma.orderRequest.findUniqueOrThrow({
      where: { id: talep.id },
    });

    assert.equal(guncel.status, "pending", "talep değişmemeli");
  });

  test("ADMIN talepleri listeleyebilir", async () => {
    const siparis = await siparisHazirla("paid");

    await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    await yoneticiOturumuKur({ prisma, cerezAyarla });

    const yanit = await listeUcu(
      new Request("http://localhost/api/admin/talepler")
    );

    assert.equal(yanit.status, 200);

    const veri = await yanit.json();

    assert.equal(veri.talepler.length, 1);
    assert.equal(veri.talepler[0].orderNumber, siparis.orderNumber);
  });
});

describe("yönetici kararı", () => {
  async function bekleyenTalep() {
    const siparis = await siparisHazirla("paid");

    await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    await yoneticiOturumuKur({ prisma, cerezAyarla });

    const talep = await prisma.orderRequest.findFirstOrThrow({
      where: { orderId: siparis.id },
    });

    return { siparis, talep };
  }

  function kararIstegi(govde: unknown): Request {
    return new Request("http://localhost/api/admin/talepler/x/karar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
    });
  }

  test("onay talebi sonuçlandırır ve aktif anahtarı boşaltır", async () => {
    const { talep } = await bekleyenTalep();

    const yanit = await kararUcu(kararIstegi({ karar: "approved" }), {
      params: { id: talep.id },
    });

    assert.equal(yanit.status, 200);

    const guncel = await prisma.orderRequest.findUniqueOrThrow({
      where: { id: talep.id },
    });

    assert.equal(guncel.status, "approved");
    assert.ok(guncel.resolvedAt);
    assert.equal(guncel.aktifAnahtar, null, "yeni talep açılabilmeli");
    assert.ok(guncel.actorAdminEmail, "karar veren yazılmalı");
  });

  test("ONAY SİPARİŞİ DEĞİŞTİRMEZ", async () => {
    const { siparis, talep } = await bekleyenTalep();

    const oncekiRezervasyon = await prisma.orderTag.count({
      where: { orderId: siparis.id },
    });

    await kararUcu(kararIstegi({ karar: "approved" }), {
      params: { id: talep.id },
    });

    const guncel = await prisma.order.findUniqueOrThrow({
      where: { id: siparis.id },
      select: { status: true, cancelledAt: true },
    });

    assert.equal(guncel.status, "paid", "sipariş iptal edilmemeli");
    assert.equal(guncel.cancelledAt, null);

    assert.equal(
      await prisma.orderTag.count({ where: { orderId: siparis.id } }),
      oncekiRezervasyon,
      "stok değişmemeli"
    );

    assert.equal(
      await prisma.refund.count(),
      0,
      "onay para iadesi başlatmamalı"
    );
  });

  test("reddetme GEREKÇE ister", async () => {
    const { talep } = await bekleyenTalep();

    const yanit = await kararUcu(kararIstegi({ karar: "rejected" }), {
      params: { id: talep.id },
    });

    assert.equal(yanit.status, 400);

    const guncel = await prisma.orderRequest.findUniqueOrThrow({
      where: { id: talep.id },
    });

    assert.equal(guncel.status, "pending", "talep değişmemeli");
  });

  test("gerekçeli reddetme müşteriye not bırakır", async () => {
    const { talep } = await bekleyenTalep();

    const not = "Sipariş hazırlanma aşamasını geçtiği için iptal edilemedi.";

    await kararUcu(kararIstegi({ karar: "rejected", yoneticiNotu: not }), {
      params: { id: talep.id },
    });

    const guncel = await prisma.orderRequest.findUniqueOrThrow({
      where: { id: talep.id },
    });

    assert.equal(guncel.status, "rejected");
    assert.equal(guncel.yoneticiNotu, not);
  });

  test("ikinci karar reddedilir (çift sonuçlandırma)", async () => {
    const { talep } = await bekleyenTalep();

    await kararUcu(kararIstegi({ karar: "approved" }), {
      params: { id: talep.id },
    });

    const ikinci = await kararUcu(kararIstegi({ karar: "rejected", yoneticiNotu: "x".repeat(20) }), {
      params: { id: talep.id },
    });

    assert.equal(ikinci.status, 400);

    const guncel = await prisma.orderRequest.findUniqueOrThrow({
      where: { id: talep.id },
    });

    assert.equal(guncel.status, "approved", "ilk karar korunmalı");
  });

  test("sonuçlanan talepten sonra yeni talep açılabilir", async () => {
    const { siparis, talep } = await bekleyenTalep();

    await kararUcu(
      kararIstegi({ karar: "rejected", yoneticiNotu: "Uygun bulunmadı." }),
      { params: { id: talep.id } }
    );

    const yeni = await talepUcu(
      talepIstegi({
        publicToken: siparis.publicToken,
        tur: "cancel",
        gerekce: GEREKCE,
      })
    );

    assert.equal(yeni.status, 200);

    assert.equal(
      await prisma.orderRequest.count({ where: { orderId: siparis.id } }),
      2
    );
  });
});
