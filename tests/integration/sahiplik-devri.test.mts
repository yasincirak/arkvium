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
 * Sahiplik devri — servis katmanı testleri.
 *
 * Server Action'lar (oturum + hız sınırlama) HTTP üzerinden çağrılamadığı için
 * burada onların ALTINDAKİ iş mantığı doğrudan test edilir: sahiplik kontrolü,
 * tek kullanımlık token, süre dolumu, iptal ve kabul sırasında ürün + etiket
 * sahipliğinin taşınması.
 *
 * GÜVENLİK: `testVeritabaniAdresi()` production adresiyle çakışma olmadığını
 * doğrular; ancak ondan sonra DATABASE_URL ayarlanır ve prisma import edilir.
 * Sıra önemlidir — prisma bağlantı adresini import anında okur.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const { prisma } = await import("../../src/lib/prisma.ts");
const { tokenOzetle } = await import("../../src/lib/tokens.ts");
const { etiketUret } = await import("../../src/lib/tags.ts");

const { devirDavetiOlustur, devirDavetiIptal, devirDavetiKabulEt } =
  await import("../../src/lib/ownership-transfer.ts");

let db: Client;

db = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

beforeEach(async () => {
  await veritabaniniTemizle(db);
});

async function kullaniciOlustur(eposta: string) {
  return prisma.user.create({
    data: {
      email: eposta,
      // Testte giriş yapılmadığı için gerçek bir hash gerekmiyor.
      passwordHash: "test-hash-kullanilmiyor",
      fullName: "Test Kullanıcı",
    },
    select: { id: true, email: true },
  });
}

/** Kullanıcıya ait bir ürün oluşturur; istenirse ürüne bağlı etiket de üretir. */
async function urunOlustur(kullaniciId: string, secenekler: { etiketli?: boolean } = {}) {
  const record = await prisma.itemRecord.create({
    data: {
      id: randomUUID(),
      assetName: "Test Eşya",
      ownerName: "Test Kullanıcı",
      phone: "05000000000",
      email: "sahip@test.invalid",
      description: "Test açıklaması",
      category: "diger",
      status: "active",
      createdAt: new Date(),
      userId: kullaniciId,
    },
    select: { id: true },
  });

  if (!secenekler.etiketli) {
    return { recordId: record.id, tagId: null as string | null };
  }

  const etiket = etiketUret();

  const tag = await prisma.tag.create({
    data: {
      code: etiket.code,
      publicToken: etiket.publicToken,
      activationCodeHash: etiket.activationCodeHash,
      status: "active",
      activatedAt: new Date(),
      userId: kullaniciId,
      itemRecordId: record.id,
    },
    select: { id: true },
  });

  return { recordId: record.id, tagId: tag.id };
}

function davetiEskit(transferId: string) {
  // Süre dolumunu beklemek yerine son geçerlilik tarihi geriye alınır.
  return prisma.ownershipTransfer.update({
    where: { id: transferId },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
}

describe("devir daveti oluşturma", () => {
  test("ürünün sahibi davet oluşturabilir ve token düz metin saklanmaz", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(sonuc.basarili, true);

    if (!sonuc.basarili) return;

    const kayit = await prisma.ownershipTransfer.findUnique({
      where: { id: sonuc.transferId },
      select: { tokenHash: true, status: true, toUserId: true, toEmail: true },
    });

    assert.equal(kayit?.status, "pending");
    assert.equal(kayit?.toEmail, "alici@test.invalid");
    // Alıcının hesabı zaten varsa davet oluşturulurken bağlanır.
    assert.equal(kayit?.toUserId, alici.id);
    // Veritabanında yalnızca özet durur; düz token hiçbir sütunda yoktur.
    assert.equal(kayit?.tokenHash, tokenOzetle(sonuc.token));
    assert.notEqual(kayit?.tokenHash, sonuc.token);
  });

  test("alıcının henüz hesabı yoksa davet yine oluşur", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiOlustur(
      sahip.id,
      recordId,
      "henuz-yok@test.invalid"
    );

    assert.equal(sonuc.basarili, true);

    if (!sonuc.basarili) return;

    const kayit = await prisma.ownershipTransfer.findUnique({
      where: { id: sonuc.transferId },
      select: { toUserId: true },
    });

    assert.equal(kayit?.toUserId, null);
  });

  test("e-posta büyük harf/boşluk farkına rağmen normalleşir", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiOlustur(
      sahip.id,
      recordId,
      "  ALICI@Test.Invalid  "
    );

    assert.equal(sonuc.basarili, true);

    if (!sonuc.basarili) return;

    assert.equal(sonuc.toEmail, "alici@test.invalid");
  });

  test("başkasının ürünü için davet oluşturulamaz", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const yabanci = await kullaniciOlustur("yabanci@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiOlustur(
      yabanci.id,
      recordId,
      "alici@test.invalid"
    );

    assert.equal(sonuc.basarili, false);

    // Var olmayan kayıtla aynı mesaj döner; kaydın varlığı sızdırılmaz.
    const yokSonuc = await devirDavetiOlustur(
      yabanci.id,
      randomUUID(),
      "alici@test.invalid"
    );

    assert.equal(yokSonuc.basarili, false);

    if (sonuc.basarili || yokSonuc.basarili) return;

    assert.equal(sonuc.hata, yokSonuc.hata);
  });

  test("kullanıcı ürünü kendi hesabına devredemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiOlustur(sahip.id, recordId, "SAHIP@test.invalid");

    assert.equal(sonuc.basarili, false);
    assert.equal(await prisma.ownershipTransfer.count(), 0);
  });

  test("geçersiz e-posta reddedilir", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    for (const girdi of ["", "   ", "duz-metin", "a@b", "a".repeat(250) + "@x.com"]) {
      const sonuc = await devirDavetiOlustur(sahip.id, recordId, girdi);

      assert.equal(sonuc.basarili, false, `kabul edilmemeliydi: ${girdi}`);
    }

    assert.equal(await prisma.ownershipTransfer.count(), 0);
  });

  test("bekleyen davet varken ikinci davet oluşturulamaz", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const ilk = await devirDavetiOlustur(sahip.id, recordId, "alici@test.invalid");
    const ikinci = await devirDavetiOlustur(sahip.id, recordId, "baska@test.invalid");

    assert.equal(ilk.basarili, true);
    assert.equal(ikinci.basarili, false);
    assert.equal(await prisma.ownershipTransfer.count(), 1);
  });

  test("süresi geçmiş davet yeni davet oluşturmayı engellemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const ilk = await devirDavetiOlustur(sahip.id, recordId, "alici@test.invalid");

    assert.equal(ilk.basarili, true);

    if (!ilk.basarili) return;

    await davetiEskit(ilk.transferId);

    const ikinci = await devirDavetiOlustur(sahip.id, recordId, "alici@test.invalid");

    assert.equal(ikinci.basarili, true);
  });

  test("etiketli üründe transfer_requested olayı yazılır", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId, tagId } = await urunOlustur(sahip.id, { etiketli: true });

    await devirDavetiOlustur(sahip.id, recordId, "alici@test.invalid");

    const olaylar = await prisma.tagEvent.findMany({
      where: { tagId: tagId! },
      select: { type: true },
    });

    assert.deepEqual(
      olaylar.map((o) => o.type),
      ["transfer_requested"]
    );
  });

  test("etiketsiz (legacy) üründe olay yazılmaz ama davet oluşur", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const sonuc = await devirDavetiOlustur(sahip.id, recordId, "alici@test.invalid");

    assert.equal(sonuc.basarili, true);
    assert.equal(await prisma.tagEvent.count(), 0);
  });
});

describe("devir daveti kabulü", () => {
  test("alıcı kabul edince ürün ve etiket sahipliği geçer", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId, tagId } = await urunOlustur(sahip.id, { etiketli: true });

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    const kabul = await devirDavetiKabulEt(alici.id, davet.token);

    assert.equal(kabul.basarili, true);

    const record = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { userId: true },
    });
    const tag = await prisma.tag.findUnique({
      where: { id: tagId! },
      select: { userId: true },
    });
    const transfer = await prisma.ownershipTransfer.findUnique({
      where: { id: davet.transferId },
      select: { status: true, acceptedAt: true, toUserId: true },
    });
    const olaylar = await prisma.tagEvent.findMany({
      where: { tagId: tagId! },
      orderBy: { createdAt: "asc" },
      select: { type: true },
    });

    assert.equal(record?.userId, alici.id);
    assert.equal(tag?.userId, alici.id);
    assert.equal(transfer?.status, "accepted");
    assert.equal(transfer?.toUserId, alici.id);
    assert.notEqual(transfer?.acceptedAt, null);
    assert.deepEqual(
      olaylar.map((o) => o.type),
      ["transfer_requested", "transferred"]
    );
  });

  test("aynı token ikinci kez kullanılamaz", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    assert.equal((await devirDavetiKabulEt(alici.id, davet.token)).basarili, true);

    const ikinci = await devirDavetiKabulEt(alici.id, davet.token);

    assert.equal(ikinci.basarili, false);
  });

  test("davet başkasının hesabıyla kabul edilemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const yabanci = await kullaniciOlustur("yabanci@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    const sonuc = await devirDavetiKabulEt(yabanci.id, davet.token);

    assert.equal(sonuc.basarili, false);

    const record = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { userId: true },
    });

    // Sahiplik değişmemiş olmalı.
    assert.equal(record?.userId, sahip.id);

    // Davet hâlâ geçerli: doğru alıcı sonradan kabul edebilir.
    assert.equal((await devirDavetiKabulEt(alici.id, davet.token)).basarili, true);
  });

  test("gönderen kendi davetini kabul edemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    const sonuc = await devirDavetiKabulEt(sahip.id, davet.token);

    assert.equal(sonuc.basarili, false);
  });

  test("süresi dolmuş davet kabul edilemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    await davetiEskit(davet.transferId);

    const sonuc = await devirDavetiKabulEt(alici.id, davet.token);

    assert.equal(sonuc.basarili, false);

    const record = await prisma.itemRecord.findUnique({
      where: { id: recordId },
      select: { userId: true },
    });

    assert.equal(record?.userId, sahip.id);
  });

  test("geçersiz token, süresi dolmuş token ile aynı mesajı döndürür", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    await davetiEskit(davet.transferId);

    const suresiDolmus = await devirDavetiKabulEt(alici.id, davet.token);
    const uydurma = await devirDavetiKabulEt(alici.id, "boyle-bir-token-yok");

    if (suresiDolmus.basarili || uydurma.basarili) {
      assert.fail("geçersiz davetler kabul edilmemeliydi");
    }

    assert.equal(suresiDolmus.hata, uydurma.hata);
  });
});

describe("devir daveti iptali", () => {
  test("sahibi daveti iptal edebilir ve sonrasında kabul edilemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    const iptal = await devirDavetiIptal(sahip.id, davet.transferId);

    assert.equal(iptal.basarili, true);

    const kayit = await prisma.ownershipTransfer.findUnique({
      where: { id: davet.transferId },
      select: { status: true, cancelledAt: true },
    });

    assert.equal(kayit?.status, "cancelled");
    assert.notEqual(kayit?.cancelledAt, null);

    const kabul = await devirDavetiKabulEt(alici.id, davet.token);

    assert.equal(kabul.basarili, false);
  });

  test("başka kullanıcı daveti iptal edemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const alici = await kullaniciOlustur("alici@test.invalid");
    const yabanci = await kullaniciOlustur("yabanci@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, alici.email);

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    const iptal = await devirDavetiIptal(yabanci.id, davet.transferId);

    assert.equal(iptal.basarili, false);

    const kayit = await prisma.ownershipTransfer.findUnique({
      where: { id: davet.transferId },
      select: { status: true },
    });

    assert.equal(kayit?.status, "pending");
  });

  test("iptal edilmiş davet ikinci kez iptal edilemez", async () => {
    const sahip = await kullaniciOlustur("sahip@test.invalid");
    const { recordId } = await urunOlustur(sahip.id);

    const davet = await devirDavetiOlustur(sahip.id, recordId, "alici@test.invalid");

    assert.equal(davet.basarili, true);

    if (!davet.basarili) return;

    assert.equal((await devirDavetiIptal(sahip.id, davet.transferId)).basarili, true);
    assert.equal((await devirDavetiIptal(sahip.id, davet.transferId)).basarili, false);
  });
});
