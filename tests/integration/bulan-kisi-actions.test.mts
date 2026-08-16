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
 * Bulan kişi bildirimi ve durum değişikliği — Server Action testleri.
 *
 * `createFinderMessage` herkese açık bir uçtur: doğrulama kuralları burada
 * sınanır. `changeRecordStatus` ise yalnızca kaydın sahibi (veya yönetici)
 * tarafından çağrılabilmelidir.
 *
 * E-posta gönderimi `EPOSTA_GONDERIMI_KAPALI` ile kapalıdır; testler hiçbir
 * koşulda gerçek e-posta göndermez.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.USER_SESSION_SECRET = "test-kullanici-anahtari-" + "u".repeat(32);
process.env.EPOSTA_GONDERIMI_KAPALI = "1";

const { prisma } = await import("../../src/lib/prisma.ts");
const { createUserSessionToken, USER_SESSION_COOKIE } = await import(
  "../../src/lib/auth.ts"
);

const { createFinderMessage, changeRecordStatus } = await import(
  "../../src/lib/actions.ts"
);

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

async function oturumAc(kullanici: {
  id: string;
  email: string;
  sessionVersion: number;
}) {
  cerezAyarla(
    USER_SESSION_COOKIE,
    await createUserSessionToken({
      userId: kullanici.id,
      email: kullanici.email,
      sessionVersion: kullanici.sessionVersion,
    })
  );
}

async function urunOlustur(kullaniciId: string | null) {
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

function gecerliGirdi(recordId: string) {
  return {
    recordId,
    finderName: "Bulan Kişi",
    finderPhone: "05551112233",
    location: "Kadıköy",
    message: "Eşyayı buldum",
  };
}

describe("createFinderMessage doğrulama kuralları", () => {
  test("zorunlu alanlar boşsa bildirim oluşmaz", async () => {
    const recordId = await urunOlustur(null);

    await assert.rejects(
      () => createFinderMessage({ ...gecerliGirdi(recordId), finderName: "  " }),
      /zorunludur/
    );

    await assert.rejects(
      () => createFinderMessage({ ...gecerliGirdi(recordId), location: "" }),
      /zorunludur/
    );

    assert.equal(await prisma.finderMessage.count(), 0);
  });

  test("geçersiz telefon reddedilir", async () => {
    const recordId = await urunOlustur(null);

    await assert.rejects(
      () =>
        createFinderMessage({ ...gecerliGirdi(recordId), finderPhone: "12345" }),
      /telefon/i
    );

    assert.equal(await prisma.finderMessage.count(), 0);
  });

  test("geçersiz e-posta reddedilir", async () => {
    const recordId = await urunOlustur(null);

    await assert.rejects(
      () =>
        createFinderMessage({
          ...gecerliGirdi(recordId),
          finderEmail: "adresyok",
        }),
      /e-posta/i
    );

    assert.equal(await prisma.finderMessage.count(), 0);
  });

  test("aşırı uzun girdi reddedilir", async () => {
    const recordId = await urunOlustur(null);

    await assert.rejects(
      () =>
        createFinderMessage({
          ...gecerliGirdi(recordId),
          finderName: "a".repeat(500),
        }),
      /uzunlu/i
    );

    assert.equal(await prisma.finderMessage.count(), 0);
  });

  test("olmayan kayıt için bildirim oluşmaz", async () => {
    await assert.rejects(
      () => createFinderMessage(gecerliGirdi(randomUUID())),
      /bulunamadı/i
    );

    assert.equal(await prisma.finderMessage.count(), 0);
  });

  test("geçerli girdi kaydedilir ve e-posta gönderimi kapalıyken failed işaretlenir", async () => {
    const recordId = await urunOlustur(null);

    const sonuc = await createFinderMessage(gecerliGirdi(recordId));

    assert.equal(sonuc.recordId, recordId);

    const kayitlar = await prisma.finderMessage.findMany({
      select: { finderName: true, status: true, emailDeliveryStatus: true },
    });

    assert.equal(kayitlar.length, 1);
    assert.equal(kayitlar[0].finderName, "Bulan Kişi");
    assert.equal(kayitlar[0].status, "new");
    // Gönderim kapalı olduğu için "sent" işaretlenmemeli.
    assert.equal(kayitlar[0].emailDeliveryStatus, "failed");
  });
});

describe("changeRecordStatus yetki kontrolü", () => {
  test("oturumsuz durum değiştirilemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await assert.rejects(
      () => changeRecordStatus(recordId, "lost"),
      /giriş yapmanız/i
    );

    const record = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { status: true },
    });

    assert.equal(record?.status, "active");
  });

  test("başkasının kaydının durumu değiştirilemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const yabanci = await kullaniciOlustur("yabanci@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await oturumAc(yabanci);

    await assert.rejects(
      () => changeRecordStatus(recordId, "lost"),
      /yetkiniz yok/i
    );

    const record = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { status: true },
    });

    assert.equal(record?.status, "active");
  });

  test("sahibi kendi kaydını kayıp olarak işaretleyebilir", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await oturumAc(sahip);

    await changeRecordStatus(recordId, "lost");

    const record = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { status: true },
    });

    assert.equal(record?.status, "lost");
  });
});
