import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
  yoneticiOturumuKur,
} from "../helpers/test-ortami.mts";
import { cerezAyarla, cerezleriTemizle } from "../helpers/next-taklit.mjs";

/**
 * Ürün kaydı Server Action'ları — yetki testleri.
 *
 * `createRecord` hem yönetici hem kullanıcı oturumunu kabul eder; kullanıcı
 * oturumunda kayıt o kullanıcıya bağlanmalı, yönetici oturumunda sahipsiz
 * kalmalıdır. `editRecord` yalnızca kaydın sahibi (veya yönetici) tarafından
 * çağrılabilir.
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

const { createRecord, editRecord } = await import("../../src/lib/actions.ts");

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

async function yoneticiOturumuAc() {
  await yoneticiOturumuKur({ prisma, cerezAyarla });
}

async function urunOlustur(kullaniciId: string | null) {
  const record = await prisma.itemRecord.create({
    data: {
      id: randomUUID(),
      assetName: "İlk Ad",
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

const YENI_KAYIT = {
  assetName: "Yeni Eşya",
  ownerName: "Sahip Adı",
  phone: "05551112233",
  email: "sahip@test.invalid",
  description: "Açıklama",
  category: "diger",
  status: "active" as const,
};

const DUZENLEME = {
  assetName: "Güncellenmiş Ad",
  ownerName: "Sahip Adı",
  phone: "05551112233",
  email: "sahip@test.invalid",
  description: "Yeni açıklama",
  category: "diger",
};

describe("createRecord yetki kontrolü", () => {
  test("oturumsuz kayıt oluşturulamaz", async () => {
    await assert.rejects(() => createRecord(YENI_KAYIT), /giriş yapmanız/i);

    assert.equal(await prisma.itemRecord.count(), 0);
  });

  test("kullanıcı oturumunda kayıt o kullanıcıya bağlanır", async () => {
    const kullanici = await kullaniciOlustur("sahip@test.invalid");

    await oturumAc(kullanici);

    const kayit = await createRecord(YENI_KAYIT);

    const kayitlar = await prisma.itemRecord.findMany({
      select: { id: true, userId: true, assetName: true },
    });

    assert.equal(kayitlar.length, 1);
    assert.equal(kayitlar[0].id, kayit.id);
    assert.equal(kayitlar[0].userId, kullanici.id);
    assert.equal(kayitlar[0].assetName, "Yeni Eşya");
  });

  test("yönetici oturumunda kayıt sahipsiz oluşur", async () => {
    await yoneticiOturumuAc();

    await createRecord(YENI_KAYIT);

    const kayitlar = await prisma.itemRecord.findMany({
      select: { userId: true },
    });

    assert.equal(kayitlar.length, 1);
    assert.equal(kayitlar[0].userId, null);
  });

  test("geçersiz imzalı çerez oturum sayılmaz", async () => {
    cerezAyarla(USER_SESSION_COOKIE, "uydurma.token.degeri");

    await assert.rejects(() => createRecord(YENI_KAYIT), /giriş yapmanız/i);

    assert.equal(await prisma.itemRecord.count(), 0);
  });
});

describe("editRecord yetki kontrolü", () => {
  test("oturumsuz kayıt düzenlenemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await assert.rejects(
      () => editRecord(recordId, DUZENLEME),
      /giriş yapmanız/i
    );

    const kayit = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { assetName: true },
    });

    assert.equal(kayit?.assetName, "İlk Ad", "kayıt değişmemeli");
  });

  test("başkasının kaydı düzenlenemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const yabanci = await kullaniciOlustur("yabanci@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await oturumAc(yabanci);

    await assert.rejects(() => editRecord(recordId, DUZENLEME), /yetkiniz yok/i);

    const kayit = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { assetName: true },
    });

    assert.equal(kayit?.assetName, "İlk Ad", "kayıt değişmemeli");
  });

  test("sahibi kendi kaydını düzenleyebilir", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await oturumAc(sahip);

    await editRecord(recordId, DUZENLEME);

    const kayit = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { assetName: true, description: true },
    });

    assert.equal(kayit?.assetName, "Güncellenmiş Ad");
    assert.equal(kayit?.description, "Yeni açıklama");
  });
});
