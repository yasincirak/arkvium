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
const { rezervasyonuSerbestBirak } = await import(
  "../../src/lib/qr-rezervasyon.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

/** Testlerde kullanılan rezervasyon son geçerlilik anı (parametreli yaklaşım). */
const SON_GECERLILIK = new Date(Date.now() + 15 * 60 * 1000);

/** Varsayılan stok: çoğu test için fazlasıyla yeterli. */
const VARSAYILAN_STOK = 20;

beforeEach(async () => {
  await veritabaniniTemizle(db);
  await etiketStoguOlustur(VARSAYILAN_STOK);
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

/** Rezervasyon süresini her çağrıda tekrarlamamak için ince sarmalayıcı. */
async function siparisVer(
  girdi: Omit<
    Parameters<typeof siparisOlustur>[0],
    "rezervasyonSonGecerlilik"
  > & { rezervasyonSonGecerlilik?: Date }
) {
  return siparisOlustur({
    rezervasyonSonGecerlilik: SON_GECERLILIK,
    ...girdi,
  });
}

/** Stoğa belirtilen sayıda kullanılmamış etiket ekler. */
async function etiketStoguOlustur(adet: number) {
  for (let i = 0; i < adet; i += 1) {
    await etiketOlustur();
  }
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
    const sonuc = await siparisVer({
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

    const sonuc = await siparisVer({
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
    const birinci = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const ikinci = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    assert.notEqual(birinci.orderNumber, ikinci.orderNumber);
    assert.notEqual(birinci.publicToken, ikinci.publicToken);
  });

  test("tutarlar sunucudaki ürün kaynağından hesaplanır", async () => {
    const sonuc = await siparisVer({
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
    const sonuc = await siparisVer({
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
    const sonuc = await siparisVer({
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
    const sonuc = await siparisVer({
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
    const sonuc = await siparisVer({
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

  test("her siparişte 'created' ve 'tags_reserved' olayları yazılır", async () => {
    const sonuc = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: sonuc.id },
      select: { type: true, actorAdminEmail: true },
    });

    assert.equal(olaylar.length, 2);
    assert.deepEqual(
      olaylar.map((o) => o.type).sort(),
      ["created", "tags_reserved"]
    );

    for (const olay of olaylar) {
      assert.equal(olay.actorAdminEmail, null, "otomatik işlemde yönetici yok");
    }
  });

  test("rezervasyon Tag kaydını değiştirmez ve ödeme oluşturmaz", async () => {
    const oncekiEtiketler = await prisma.tag.findMany({
      select: { id: true, status: true, userId: true, itemRecordId: true },
      orderBy: { code: "asc" },
    });

    const sonuc = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    // Rezervasyon yapılmış olmalı (3'lü set → 3 etiket).
    assert.equal(await prisma.orderTag.count({ where: { orderId: sonuc.id } }), 3);

    // Ama Tag kayıtları hiç değişmemeli.
    const sonrakiEtiketler = await prisma.tag.findMany({
      select: { id: true, status: true, userId: true, itemRecordId: true },
      orderBy: { code: "asc" },
    });

    assert.deepEqual(
      sonrakiEtiketler,
      oncekiEtiketler,
      "rezervasyon Tag kayıtlarına dokunmamalı"
    );

    assert.equal(await prisma.tagEvent.count(), 0, "TagEvent yazılmamalı");
    assert.equal(await prisma.payment.count(), 0, "ödeme kaydı olmamalı");
  });
});

describe("QR rezervasyonu", () => {
  test("her kalem için adet × qrAdedi kadar etiket ayrılır", async () => {
    const sonuc = await siparisVer({
      sepet: [
        { kod: STICKER.kod, adet: 2 },
        { kod: ANAHTARLIK.kod, adet: 1 },
      ],
      teslimat: TESLIMAT,
    });

    // 2 * 3 + 1 * 1 = 7
    assert.equal(sonuc.toplamQrAdedi, 7);
    assert.equal(await prisma.orderTag.count({ where: { orderId: sonuc.id } }), 7);
  });

  test("her rezervasyon doğru sipariş kalemine bağlanır", async () => {
    const sonuc = await siparisVer({
      sepet: [
        { kod: STICKER.kod, adet: 1 },
        { kod: ANAHTARLIK.kod, adet: 2 },
      ],
      teslimat: TESLIMAT,
    });

    const kalemler = await prisma.orderItem.findMany({
      where: { orderId: sonuc.id },
      select: { id: true, productKod: true, orderTags: { select: { id: true } } },
    });

    const sticker = kalemler.find((k) => k.productKod === STICKER.kod);
    const anahtarlik = kalemler.find((k) => k.productKod === ANAHTARLIK.kod);

    assert.equal(sticker?.orderTags.length, 3, "1 set = 3 etiket");
    assert.equal(anahtarlik?.orderTags.length, 2, "2 anahtarlık = 2 etiket");

    const rezervasyonlar = await prisma.orderTag.findMany({
      where: { orderId: sonuc.id },
      select: { orderItemId: true, reservationExpiresAt: true },
    });

    for (const rezervasyon of rezervasyonlar) {
      assert.ok(
        kalemler.some((k) => k.id === rezervasyon.orderItemId),
        "rezervasyon bu siparişin bir kalemine bağlı olmalı"
      );
      assert.equal(
        rezervasyon.reservationExpiresAt.getTime(),
        SON_GECERLILIK.getTime(),
        "son geçerlilik parametreden gelmeli"
      );
    }
  });

  test("stok tam yeterliyse sipariş geçer", async () => {
    await prisma.tag.deleteMany({});
    await etiketStoguOlustur(3);

    const sonuc = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    assert.equal(await prisma.orderTag.count({ where: { orderId: sonuc.id } }), 3);
    assert.equal(await prisma.tag.count(), 3);
  });

  test("stok bir eksikse hiçbir kayıt kalmaz", async () => {
    await prisma.tag.deleteMany({});
    await etiketStoguOlustur(2);

    await assert.rejects(
      () =>
        siparisVer({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: TESLIMAT,
        }),
      /yeterli QR etiketi bulunmuyor/i
    );

    assert.equal(await prisma.order.count(), 0);
    assert.equal(await prisma.orderItem.count(), 0);
    assert.equal(await prisma.orderEvent.count(), 0);
    assert.equal(await prisma.orderTag.count(), 0);
  });

  test("hata mesajı veritabanı ayrıntısı içermez", async () => {
    await prisma.tag.deleteMany({});

    await assert.rejects(
      () =>
        siparisVer({
          sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
          teslimat: TESLIMAT,
        }),
      (hata: Error) => {
        assert.doesNotMatch(
          hata.message,
          /prisma|sql|constraint|OrderTag|Tag\b|P20/i,
          "kullanıcıya sistem ayrıntısı gösterilmemeli"
        );

        return true;
      }
    );
  });

  test("zaten rezerve edilmiş etiketler yeniden ayrılamaz", async () => {
    await prisma.tag.deleteMany({});
    await etiketStoguOlustur(4);

    await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    // Geriye 1 etiket kaldı; 3 gerektiren ikinci sipariş reddedilmeli.
    await assert.rejects(
      () =>
        siparisVer({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: TESLIMAT,
        }),
      /yeterli QR etiketi bulunmuyor/i
    );

    assert.equal(await prisma.order.count(), 1, "yalnızca ilk sipariş kalmalı");
  });

  test("aynı etiket iki siparişe ayrılamaz", async () => {
    await prisma.tag.deleteMany({});
    await etiketStoguOlustur(1);

    const sonuclar = await Promise.allSettled([
      siparisVer({
        sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
        teslimat: TESLIMAT,
      }),
      siparisVer({
        sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
        teslimat: TESLIMAT,
      }),
    ]);

    const basarili = sonuclar.filter((s) => s.status === "fulfilled");

    assert.equal(basarili.length, 1, "yalnızca bir sipariş başarılı olmalı");
    assert.equal(await prisma.orderTag.count(), 1, "tek rezervasyon kalmalı");
    assert.equal(await prisma.order.count(), 1);

    const tagIdler = await prisma.orderTag.findMany({ select: { tagId: true } });

    assert.equal(new Set(tagIdler.map((t) => t.tagId)).size, 1);
  });

  test("süresi dolmuş rezervasyon temizlenip yeniden kullanılır", async () => {
    await prisma.tag.deleteMany({});
    await etiketStoguOlustur(1);

    const eski = await siparisVer({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
      teslimat: TESLIMAT,
      rezervasyonSonGecerlilik: new Date(Date.now() - 60 * 1000),
    });

    assert.equal(await prisma.orderTag.count({ where: { orderId: eski.id } }), 1);

    // Stokta başka etiket yok; yalnızca süresi dolan serbest kalırsa geçer.
    const yeni = await siparisVer({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    assert.equal(await prisma.orderTag.count({ where: { orderId: eski.id } }), 0);
    assert.equal(await prisma.orderTag.count({ where: { orderId: yeni.id } }), 1);
    assert.equal(await prisma.orderTag.count(), 1);
  });

  test("serbest bırakma rezervasyonu siler ve olay yazar", async () => {
    const sonuc = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    const silinen = await rezervasyonuSerbestBirak(sonuc.id, "ödeme başarısız");

    assert.equal(silinen, 3);
    assert.equal(await prisma.orderTag.count({ where: { orderId: sonuc.id } }), 0);

    const olaylar = await prisma.orderEvent.findMany({
      where: { orderId: sonuc.id, type: "tags_released" },
      select: { note: true },
    });

    assert.equal(olaylar.length, 1);
    assert.equal(olaylar[0].note, "ödeme başarısız");

    // Etiketler tekrar stoğa döner.
    const yeni = await siparisVer({
      sepet: [{ kod: STICKER.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    assert.equal(await prisma.orderTag.count({ where: { orderId: yeni.id } }), 3);
  });

  test("serbest bırakma Tag kayıtlarını değiştirmez", async () => {
    const sonuc = await siparisVer({
      sepet: [{ kod: ANAHTARLIK.kod, adet: 1 }],
      teslimat: TESLIMAT,
    });

    await rezervasyonuSerbestBirak(sonuc.id);

    const etiketler = await prisma.tag.findMany({
      select: { status: true, userId: true, itemRecordId: true },
    });

    for (const etiket of etiketler) {
      assert.equal(etiket.status, "unused");
      assert.equal(etiket.userId, null);
      assert.equal(etiket.itemRecordId, null);
    }

    assert.equal(await prisma.tagEvent.count(), 0);
  });

  test("rezervasyon süresi verilmezse sipariş oluşmaz", async () => {
    await assert.rejects(
      () =>
        siparisOlustur({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: TESLIMAT,
        } as never),
      /Rezervasyon süresi/i
    );

    assert.equal(await prisma.order.count(), 0);
    assert.equal(await prisma.orderTag.count(), 0);
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
        siparisVer({
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
        siparisVer({
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
        siparisVer({
          sepet: [{ kod: STICKER.kod, adet: 2.5 }],
          teslimat: TESLIMAT,
        }),
      /tam sayı/i
    );

    await kayitYokMu();
  });

  test("boş sepet reddedilir", async () => {
    await assert.rejects(
      () => siparisVer({ sepet: [], teslimat: TESLIMAT }),
      /boş/i
    );

    await kayitYokMu();
  });

  test("eksik teslimat alanı reddedilir", async () => {
    await assert.rejects(
      () =>
        siparisVer({
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
        siparisVer({
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
        siparisVer({
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
        siparisVer({
          sepet: [{ kod: STICKER.kod, adet: 1 }],
          teslimat: { ...TESLIMAT, addressLine: "a".repeat(301) },
        }),
      /uzunluğu/i
    );

    await kayitYokMu();
  });

  test("var olmayan kullanıcıya sipariş yazılamaz", async () => {
    await assert.rejects(() =>
      siparisVer({
        sepet: [{ kod: STICKER.kod, adet: 1 }],
        teslimat: TESLIMAT,
        userId: randomUUID(),
      })
    );

    await kayitYokMu();
  });
});
