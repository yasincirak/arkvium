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
 * Hesabımda bildirimler — sahiplik kontrolü.
 *
 * Kayıt detay sayfası bulan kişi mesajlarını `getFinderMessagesForOwner`
 * ile çeker. Bulan kişinin adı, telefonu ve konumu kişisel veridir; yalnızca
 * kaydın sahibine görünmeli, başka bir kullanıcıya ya da sahipsiz kayıtta
 * hiç kimseye sızmamalıdır.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const { prisma } = await import("../../src/lib/prisma.ts");
const { getFinderMessagesForOwner } = await import("../../src/lib/store.ts");

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

beforeEach(async () => {
  await veritabaniniTemizle(db);
});

async function kullaniciOlustur(eposta: string) {
  return prisma.user.create({
    data: { email: eposta, passwordHash: "test-hash-kullanilmiyor" },
    select: { id: true },
  });
}

async function urunOlustur(kullaniciId: string | null) {
  const record = await prisma.itemRecord.create({
    data: {
      id: randomUUID(),
      assetName: "Anahtarlık",
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

async function mesajOlustur(
  recordId: string,
  bulanAd: string,
  createdAt = new Date()
) {
  const mesaj = await prisma.finderMessage.create({
    data: {
      id: randomUUID(),
      recordId,
      finderName: bulanAd,
      finderPhone: "05321112233",
      finderEmail: "bulan@test.invalid",
      location: "Kadıköy İskele",
      message: "Eşyanı buldum.",
      status: "new",
      createdAt,
    },
    select: { id: true },
  });

  return mesaj.id;
}

describe("hesap bildirimleri sahiplik kontrolü", () => {
  test("sahibi kendi ürününe gelen mesajları görür", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await mesajOlustur(recordId, "Bulan Kişi");

    const mesajlar = await getFinderMessagesForOwner(recordId, sahip.id);

    assert.equal(mesajlar.length, 1);
    assert.equal(mesajlar[0].finderName, "Bulan Kişi");
    assert.equal(mesajlar[0].finderPhone, "05321112233");
    assert.equal(mesajlar[0].location, "Kadıköy İskele");
    assert.equal(mesajlar[0].message, "Eşyanı buldum.");
  });

  test("başka kullanıcı mesajları göremez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const yabanci = await kullaniciOlustur("yabanci@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await mesajOlustur(recordId, "Bulan Kişi");

    const mesajlar = await getFinderMessagesForOwner(recordId, yabanci.id);

    assert.deepEqual(mesajlar, [], "yabancıya hiçbir veri dönmemeli");
  });

  test("sahipsiz (legacy) kayıtta mesaj dönmez", async () => {
    const kullanici = await kullaniciOlustur("kullanici@test.invalid");
    const recordId = await urunOlustur(null);

    await mesajOlustur(recordId, "Bulan Kişi");

    const mesajlar = await getFinderMessagesForOwner(recordId, kullanici.id);

    assert.deepEqual(mesajlar, []);
  });

  test("olmayan kayıt için boş liste döner", async () => {
    const kullanici = await kullaniciOlustur("kullanici@test.invalid");

    const mesajlar = await getFinderMessagesForOwner(randomUUID(), kullanici.id);

    assert.deepEqual(mesajlar, []);
  });

  test("yalnızca o ürünün mesajları listelenir", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const birinciId = await urunOlustur(sahip.id);
    const ikinciId = await urunOlustur(sahip.id);

    await mesajOlustur(birinciId, "Birinci Ürünü Bulan");
    await mesajOlustur(ikinciId, "İkinci Ürünü Bulan");

    const mesajlar = await getFinderMessagesForOwner(birinciId, sahip.id);

    assert.equal(mesajlar.length, 1);
    assert.equal(mesajlar[0].finderName, "Birinci Ürünü Bulan");
  });

  test("mesajlar en yeniden eskiye sıralanır", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const recordId = await urunOlustur(sahip.id);

    await mesajOlustur(recordId, "Eski Mesaj", new Date("2026-01-01T10:00:00Z"));
    await mesajOlustur(recordId, "Yeni Mesaj", new Date("2026-02-01T10:00:00Z"));

    const mesajlar = await getFinderMessagesForOwner(recordId, sahip.id);

    assert.equal(mesajlar.length, 2);
    assert.equal(mesajlar[0].finderName, "Yeni Mesaj");
    assert.equal(mesajlar[1].finderName, "Eski Mesaj");
  });
});
