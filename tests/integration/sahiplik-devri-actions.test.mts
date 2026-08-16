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
 * Sahiplik devri — Server Action sarmalayıcı testleri.
 *
 * Servis katmanı `sahiplik-devri.test.mts` içinde test ediliyor; burada
 * yalnızca sarmalayıcının kendi işi sınanır: oturum kontrolü ve davet
 * e-postası gönderilemediğinde kaydın `pending` bırakılmaması.
 *
 * `next/headers` ve `next/cache` test çalıştırmasında `next-taklit.mjs` ile
 * karşılanır (bkz. tests/helpers/alias-cozucu.mjs). Oturum taklit EDİLMEZ:
 * gerçek imzalı token üretilip çereze konur, imza ve `sessionVersion`
 * kontrolü olduğu gibi çalışır.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.USER_SESSION_SECRET = "test-kullanici-anahtari-" + "u".repeat(32);
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
// Testler sırasında gerçek e-posta gönderilmez.
process.env.EPOSTA_GONDERIMI_KAPALI = "1";

const { prisma } = await import("../../src/lib/prisma.ts");
const { createUserSessionToken, USER_SESSION_COOKIE } = await import(
  "../../src/lib/auth.ts"
);

const { devirDavetiGonder, devirDavetiKabul, devirDavetiIptalEt } =
  await import("../../src/lib/ownership-transfer-actions.ts");

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

beforeEach(async () => {
  await veritabaniniTemizle(db);
  cerezleriTemizle();
});

async function kullaniciOlustur(eposta: string) {
  return prisma.user.create({
    data: { email: eposta, passwordHash: "test-hash-kullanilmiyor" },
    select: { id: true, email: true, sessionVersion: true },
  });
}

/** Gerçek imzalı oturum tokenını çereze koyar. */
async function oturumAc(kullanici: {
  id: string;
  email: string;
  sessionVersion: number;
}) {
  const token = await createUserSessionToken({
    userId: kullanici.id,
    email: kullanici.email,
    sessionVersion: kullanici.sessionVersion,
  });

  cerezAyarla(USER_SESSION_COOKIE, token);
}

async function urunOlustur(kullaniciId: string) {
  const record = await prisma.itemRecord.create({
    data: {
      id: randomUUID(),
      assetName: "Test Eşya",
      ownerName: "Test Kullanıcı",
      phone: "05000000000",
      email: "sahip@test.invalid",
      description: "Açıklama",
      category: "diger",
      status: "active",
      createdAt: new Date(),
      userId: kullaniciId,
    },
    select: { id: true },
  });

  return record.id;
}

describe("oturum kontrolü (Server Action sarmalayıcıları)", () => {
  test("oturumsuz davet gönderilemez ve kayıt oluşmaz", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiGonder(recordId, "alici@test.invalid");

    assert.equal(sonuc.basarili, false);
    assert.equal(await prisma.ownershipTransfer.count(), 0);
  });

  test("oturumsuz davet kabul edilemez", async () => {
    const sonuc = await devirDavetiKabul("herhangi-bir-token");

    assert.equal(sonuc.basarili, false);
  });

  test("oturumsuz davet iptal edilemez", async () => {
    const sonuc = await devirDavetiIptalEt("herhangi-bir-id");

    assert.equal(sonuc.basarili, false);
  });

  test("geçersiz imzalı çerez oturum sayılmaz", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    cerezAyarla(USER_SESSION_COOKIE, "uydurma.token.degeri");

    const sonuc = await devirDavetiGonder(recordId, "alici@test.invalid");

    assert.equal(sonuc.basarili, false);
    assert.equal(await prisma.ownershipTransfer.count(), 0);
  });

  test("oturum sürümü eskiyse çerez kabul edilmez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await oturumAc(sahip);

    // Şifre değişimi gibi bir olayla sürüm artar; eski token geçersizleşir.
    await prisma.user.update({
      where: { id: sahip.id },
      data: { sessionVersion: { increment: 1 } },
    });

    const sonuc = await devirDavetiGonder(recordId, "alici@test.invalid");

    assert.equal(sonuc.basarili, false);
    assert.equal(await prisma.ownershipTransfer.count(), 0);
  });
});

describe("e-posta gönderilemediğinde davet", () => {
  test("davet pending bırakılmaz, iptal edilir", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await oturumAc(sahip);

    // EPOSTA_GONDERIMI_KAPALI=1 olduğu için gönderim başarısız sayılır.
    const sonuc = await devirDavetiGonder(recordId, "alici@test.invalid");

    assert.equal(sonuc.basarili, false);

    const kayitlar = await prisma.ownershipTransfer.findMany({
      select: { status: true, cancelledAt: true },
    });

    assert.equal(kayitlar.length, 1, "davet kaydı oluşmuş olmalı");
    assert.equal(kayitlar[0].status, "cancelled");
    assert.notEqual(kayitlar[0].cancelledAt, null);
  });
});
