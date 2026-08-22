import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Sağlayıcı hata ayrıntısının denetim kaydına taşınması.
 *
 * Doğrulanan kurallar: iyzico başarısız yanıtından YALNIZCA `errorCode` ve
 * `errorMessage` alınması, başka hiçbir alanın (token, anahtar, kişisel veri)
 * geçmemesi, bu ayrıntının `payment_failed` OrderEvent'inin `note` alanına
 * yazılması ve kullanıcıya dönen mesajın DEĞİŞMEMESİ.
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
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");
const {
  OdemeHatasi,
  ODEME_BASLATILAMADI,
  saglayiciHataAyrintisi,
  AYRINTI_UZUNLUK_SINIRI,
} = await import("../../src/lib/odeme-saglayici.ts");

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const STICKER = SIPARIS_URUNLERI.find((u) => u.kod === "sticker-seti")!;

const TESLIMAT = {
  fullName: "Test Musteri",
  email: "musteri@test.invalid",
  phone: "05551112233",
  addressLine: "Örnek Mahallesi 1. Sokak No 2",
  district: "Kadıköy",
  city: "İstanbul",
};

beforeEach(async () => {
  await veritabaniniTemizle(db);

  for (let i = 0; i < 6; i += 1) {
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

async function siparisVer() {
  return siparisOlustur({
    sepet: [{ kod: STICKER.kod, adet: 1 }],
    teslimat: TESLIMAT,
    rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
  });
}

/** `payment_failed` olayının note alanını okur. */
async function basarisizOlayNotu(orderId: string) {
  const olay = await prisma.orderEvent.findFirst({
    where: { orderId, type: "payment_failed" },
    select: { note: true },
  });

  return olay?.note ?? null;
}

describe("saglayiciHataAyrintisi — yalnızca iki alan", () => {
  test("errorCode ve errorMessage alınır", () => {
    const ayrinti = saglayiciHataAyrintisi({
      status: "failure",
      errorCode: "5001",
      errorMessage: "Gecersiz istek",
    });

    assert.equal(ayrinti, "errorCode=5001 | errorMessage=Gecersiz istek");
  });

  test("başka hiçbir alan ayrıntıya geçmez", () => {
    const ayrinti = saglayiciHataAyrintisi({
      status: "failure",
      errorCode: "5001",
      errorMessage: "Gecersiz istek",
      // Bunların hiçbiri denetim kaydına sızmamalı:
      token: "gizli-token-degeri",
      apiKey: "gizli-api-anahtari",
      secretKey: "gizli-secret",
      signature: "gizli-imza",
      conversationId: "ARK-2026-XXXX",
      buyer: { email: "kisi@ornek.invalid", identityNumber: "11111111111" },
    });

    for (const sizinti of [
      "gizli-token-degeri",
      "gizli-api-anahtari",
      "gizli-secret",
      "gizli-imza",
      "ARK-2026-XXXX",
      "kisi@ornek.invalid",
      "11111111111",
    ]) {
      assert.ok(
        !ayrinti!.includes(sizinti),
        `ayrıntı '${sizinti}' içermemeli`
      );
    }
  });

  test("yalnızca biri varsa o alınır", () => {
    assert.equal(
      saglayiciHataAyrintisi({ errorCode: 5001 }),
      "errorCode=5001"
    );
    assert.equal(
      saglayiciHataAyrintisi({ errorMessage: "hata" }),
      "errorMessage=hata"
    );
  });

  test("iki alan da yoksa undefined döner", () => {
    assert.equal(saglayiciHataAyrintisi({ status: "failure" }), undefined);
    assert.equal(saglayiciHataAyrintisi(null), undefined);
    assert.equal(saglayiciHataAyrintisi({ errorMessage: "   " }), undefined);
  });

  test("aşırı uzun mesaj sınırlanır", () => {
    const ayrinti = saglayiciHataAyrintisi({
      errorMessage: "x".repeat(1000),
    });

    assert.equal(ayrinti!.length, AYRINTI_UZUNLUK_SINIRI);
  });
});

describe("ödeme başlatma — hata ayrıntısı OrderEvent.note alanına yazılır", () => {
  test("sağlayıcı yanıtındaki kod/mesaj denetim kaydına düşer", async () => {
    const siparis = await siparisVer();

    // Sağlayıcının başarısız yanıtı; `checkoutFormBaslat` ile AYNI zincir:
    // ham yanıt -> saglayiciHataAyrintisi -> OdemeHatasi(ayrinti).
    const hamYanit = {
      status: "failure",
      errorCode: "5001",
      errorMessage: "Gecersiz istek",
      token: "gizli-token-degeri",
    };

    await assert.rejects(
      odemeBaslat({
        orderId: siparis.id,
        saglayici: async () => {
          throw new OdemeHatasi(
            ODEME_BASLATILAMADI,
            saglayiciHataAyrintisi(hamYanit)
          );
        },
      }),
      (hata: unknown) => {
        // Kullanıcıya dönen mesaj DEĞİŞMEZ: sistem detayı sızmaz.
        assert.equal((hata as Error).message, ODEME_BASLATILAMADI);
        assert.ok(
          !(hata as Error).message.includes("5001"),
          "kullanıcı mesajı sağlayıcı kodunu içermemeli"
        );

        return true;
      }
    );

    const not = await basarisizOlayNotu(siparis.id);

    assert.equal(not, "errorCode=5001 | errorMessage=Gecersiz istek");
    assert.ok(!not!.includes("gizli-token-degeri"), "token sızmamalı");

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true },
    });

    assert.equal(odeme?.status, "failed");
  });

  test("ayrıntı yoksa note boş kalır", async () => {
    const siparis = await siparisVer();

    await assert.rejects(
      odemeBaslat({
        orderId: siparis.id,
        saglayici: async () => {
          throw new OdemeHatasi(ODEME_BASLATILAMADI);
        },
      })
    );

    assert.equal(await basarisizOlayNotu(siparis.id), null);
  });

  test("sağlayıcı dışı beklenmedik hatada da note boş kalır", async () => {
    const siparis = await siparisVer();

    await assert.rejects(
      odemeBaslat({
        orderId: siparis.id,
        saglayici: async () => {
          throw new Error("beklenmedik");
        },
      })
    );

    assert.equal(await basarisizOlayNotu(siparis.id), null);

    const odeme = await prisma.payment.findFirst({
      where: { orderId: siparis.id },
      select: { status: true },
    });

    assert.equal(odeme?.status, "failed");
  });
});
