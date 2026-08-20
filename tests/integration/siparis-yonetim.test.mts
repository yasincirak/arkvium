import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";
import { cerezAyarla, cerezleriTemizle } from "../helpers/next-taklit.mjs";

/**
 * Sipariş durum yönetimi (Aşama 9) testleri.
 *
 * Doğrulanan kurallar: yönetici yetkisi olmadan hiçbir şeyin değişmemesi,
 * yalnızca `paid → preparing → shipped` geçişlerine izin verilmesi, aynı anda
 * gelen iki isteğin tek geçiş üretmesi, geçiş başına TEK OrderEvent yazılması
 * ve ödeme/QR rezervasyon kayıtlarına HİÇ dokunulmaması.
 *
 * `next/headers` test çalıştırmasında `next-taklit.mjs` ile karşılanır
 * (bkz. tests/helpers/alias-cozucu.mjs). Oturum TAKLİT EDİLMEZ: gerçek imzalı
 * yönetici tokenı üretilip çereze konur, imza doğrulaması olduğu gibi çalışır.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.ADMIN_SESSION_SECRET = "test-admin-anahtari-" + "a".repeat(32);

const { prisma } = await import("../../src/lib/prisma.ts");
const { createAdminSessionToken, ADMIN_SESSION_COOKIE } = await import(
  "../../src/lib/auth.ts"
);
const { siparisOlustur } = await import("../../src/lib/siparis-servisi.ts");
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");
const { siparisDurumunuGuncelle, SiparisYonetimHatasi } = await import(
  "../../src/lib/siparis-yonetim.ts"
);
const { POST: durumUcu } = await import(
  "../../src/app/api/admin/orders/[id]/durum/route.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const YONETICI = "admin@test.invalid";
const SON_GECERLILIK = new Date(Date.now() + 15 * 60 * 1000);
const STICKER = SIPARIS_URUNLERI.find((u) => u.kod === "sticker-seti")!;

const TESLIMAT = {
  fullName: "Test Müşteri",
  email: "musteri@test.invalid",
  phone: "05551112233",
  addressLine: "Örnek Mahallesi 1. Sokak No 2 Daire 3",
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

/** Gerçek imzalı yönetici oturumunu çereze koyar. */
async function yoneticiOturumuAc(eposta = YONETICI) {
  cerezAyarla(
    ADMIN_SESSION_COOKIE,
    await createAdminSessionToken({ email: eposta })
  );
}

/** Sipariş oluşturur ve istenen duruma getirir (test kurulumu). */
async function siparisHazirla(
  durum: "pending" | "paid" | "preparing" | "shipped"
) {
  const siparis = await siparisOlustur({
    sepet: [{ kod: STICKER.kod, adet: 1 }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: SON_GECERLILIK,
  });

  // Ödeme kaydı: testler bu satırın hiç değişmediğini doğrular.
  const odeme = await prisma.payment.create({
    data: {
      orderId: siparis.id,
      provider: "iyzico",
      providerConversationId: randomUUID(),
      status: "succeeded",
      amountKurus: siparis.totalKurus,
      confirmedAt: new Date(),
    },
    select: { id: true },
  });

  if (durum !== "pending") {
    await prisma.order.update({
      where: { id: siparis.id },
      data: { status: durum, paidAt: new Date() },
    });
  }

  return { orderId: siparis.id, paymentId: odeme.id };
}

/** Ödeme ve rezervasyon kayıtlarının karşılaştırılabilir anlık görüntüsü. */
async function dokunulmazlarinGoruntusu(orderId: string) {
  const [odemeler, orderTags, tags, tagEvents] = await Promise.all([
    prisma.payment.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        status: true,
        amountKurus: true,
        providerRef: true,
        confirmedAt: true,
      },
    }),
    prisma.orderTag.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        tagId: true,
        orderItemId: true,
        reservedAt: true,
        reservationExpiresAt: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: { id: "asc" },
      select: { id: true, status: true, userId: true, activatedAt: true },
    }),
    prisma.tagEvent.count(),
  ]);

  return JSON.stringify({ odemeler, orderTags, tags, tagEvents });
}

/** Belirli türdeki sipariş olaylarını döndürür. */
async function olaylar(orderId: string, tur: string) {
  return prisma.orderEvent.findMany({
    where: { orderId, type: tur },
    select: { type: true, actorAdminEmail: true },
  });
}

/** Durum ucuna istek atar (çerez zaten ayarlanmış olmalı). */
async function durumIstegi(orderId: string, durum: unknown) {
  const yanit = await durumUcu(
    new Request(`http://localhost/api/admin/orders/${orderId}/durum`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durum }),
    }),
    { params: { id: orderId } }
  );

  return { yanit, govde: await yanit.json() };
}

describe("sipariş durum yönetimi — yetki", () => {
  test("yönetici oturumu olmadan istek 401 alır ve hiçbir kayıt değişmez", async () => {
    const { orderId } = await siparisHazirla("paid");
    const once = await dokunulmazlarinGoruntusu(orderId);

    const { yanit, govde } = await durumIstegi(orderId, "preparing");

    assert.equal(yanit.status, 401);
    assert.ok(govde.error, "hata mesajı dönmeli");

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, shippedAt: true },
    });

    assert.equal(siparis.status, "paid", "durum değişmemeli");
    assert.equal(siparis.shippedAt, null);
    assert.deepEqual(await olaylar(orderId, "preparing"), []);
    assert.equal(await dokunulmazlarinGoruntusu(orderId), once);
  });

  test("yönetici oturumuyla geçiş yapılır ve olaya e-posta yazılır", async () => {
    const { orderId } = await siparisHazirla("paid");

    await yoneticiOturumuAc();

    const { yanit, govde } = await durumIstegi(orderId, "preparing");

    assert.equal(yanit.status, 200);
    assert.equal(govde.durum, "preparing");

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    assert.equal(siparis.status, "preparing");

    assert.deepEqual(await olaylar(orderId, "preparing"), [
      { type: "preparing", actorAdminEmail: YONETICI },
    ]);
  });
});

describe("sipariş durum yönetimi — izinli geçişler", () => {
  test("paid → preparing tek olay yazar ve shippedAt boş kalır", async () => {
    const { orderId } = await siparisHazirla("paid");

    const sonuc = await siparisDurumunuGuncelle({
      orderId,
      hedefDurum: "preparing",
      adminEmail: YONETICI,
    });

    assert.equal(sonuc.durum, "preparing");

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, shippedAt: true },
    });

    assert.equal(siparis.status, "preparing");
    assert.equal(siparis.shippedAt, null, "hazırlıkta kargo tarihi yazılmamalı");

    assert.equal((await olaylar(orderId, "preparing")).length, 1);
  });

  test("preparing → shipped shippedAt yazar ve tek olay üretir", async () => {
    const { orderId } = await siparisHazirla("preparing");

    await siparisDurumunuGuncelle({
      orderId,
      hedefDurum: "shipped",
      adminEmail: YONETICI,
    });

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, shippedAt: true },
    });

    assert.equal(siparis.status, "shipped");
    assert.ok(siparis.shippedAt instanceof Date, "kargo tarihi yazılmalı");

    assert.equal((await olaylar(orderId, "shipped")).length, 1);
  });
});

describe("sipariş durum yönetimi — izinsiz geçişler", () => {
  test("ödenmemiş sipariş hazırlığa alınamaz", async () => {
    const { orderId } = await siparisHazirla("pending");

    await assert.rejects(
      siparisDurumunuGuncelle({
        orderId,
        hedefDurum: "preparing",
        adminEmail: YONETICI,
      }),
      SiparisYonetimHatasi
    );

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    assert.equal(siparis.status, "pending");
    assert.deepEqual(await olaylar(orderId, "preparing"), []);
  });

  test("paid sipariş doğrudan kargolandı yapılamaz", async () => {
    const { orderId } = await siparisHazirla("paid");

    await assert.rejects(
      siparisDurumunuGuncelle({
        orderId,
        hedefDurum: "shipped",
        adminEmail: YONETICI,
      }),
      SiparisYonetimHatasi
    );

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, shippedAt: true },
    });

    assert.equal(siparis.status, "paid");
    assert.equal(siparis.shippedAt, null);
    assert.deepEqual(await olaylar(orderId, "shipped"), []);
  });

  test("kargolanmış sipariş geri alınamaz ve tekrar kargolanamaz", async () => {
    const { orderId } = await siparisHazirla("shipped");

    for (const hedef of ["preparing", "shipped"]) {
      await assert.rejects(
        siparisDurumunuGuncelle({
          orderId,
          hedefDurum: hedef,
          adminEmail: YONETICI,
        }),
        SiparisYonetimHatasi
      );
    }

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    assert.equal(siparis.status, "shipped");
    assert.deepEqual(await olaylar(orderId, "preparing"), []);
    assert.deepEqual(await olaylar(orderId, "shipped"), []);
  });

  test("kapsam dışı hedef durumlar reddedilir", async () => {
    const { orderId } = await siparisHazirla("paid");

    await yoneticiOturumuAc();

    for (const hedef of ["cancelled", "paid", "pending", "", "PREPARING"]) {
      const { yanit } = await durumIstegi(orderId, hedef);

      assert.equal(yanit.status, 400, `${hedef} kabul edilmemeli`);
    }

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    assert.equal(siparis.status, "paid");
    assert.equal(await prisma.orderEvent.count({ where: { orderId, type: "cancelled" } }), 0);
  });
});

describe("sipariş durum yönetimi — yarış güvenliği", () => {
  test("aynı anda gelen iki istek tek geçiş ve tek olay üretir", async () => {
    const { orderId } = await siparisHazirla("paid");

    const sonuclar = await Promise.allSettled([
      siparisDurumunuGuncelle({
        orderId,
        hedefDurum: "preparing",
        adminEmail: YONETICI,
      }),
      siparisDurumunuGuncelle({
        orderId,
        hedefDurum: "preparing",
        adminEmail: YONETICI,
      }),
    ]);

    const basarili = sonuclar.filter((s) => s.status === "fulfilled");

    assert.equal(basarili.length, 1, "yalnızca bir istek geçiş yapmalı");

    const siparis = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });

    assert.equal(siparis.status, "preparing");
    assert.equal(
      (await olaylar(orderId, "preparing")).length,
      1,
      "ikinci istek olay yazmamalı"
    );
  });
});

describe("sipariş durum yönetimi — ödeme ve rezervasyon korunur", () => {
  test("paid → preparing → shipped boyunca ödeme ve QR kayıtları değişmez", async () => {
    const { orderId } = await siparisHazirla("paid");
    const once = await dokunulmazlarinGoruntusu(orderId);

    await siparisDurumunuGuncelle({
      orderId,
      hedefDurum: "preparing",
      adminEmail: YONETICI,
    });

    await siparisDurumunuGuncelle({
      orderId,
      hedefDurum: "shipped",
      adminEmail: YONETICI,
    });

    assert.equal(
      await dokunulmazlarinGoruntusu(orderId),
      once,
      "Payment, OrderTag, Tag ve TagEvent kayıtları aynı kalmalı"
    );

    // Rezervasyon gerçekten var; test boş kümeyi karşılaştırmıyor.
    assert.ok(
      (await prisma.orderTag.count({ where: { orderId } })) > 0,
      "sipariş rezerve etiket içermeli"
    );
  });
});
