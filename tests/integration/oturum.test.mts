import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";
import { cerezAyarla, cerezleriTemizle } from "../helpers/next-taklit.mjs";

/**
 * Oturum okuma — silinmiş kullanıcının tokenı.
 *
 * `sessionVersion` uyuşmazlığı ve geçersiz imza HTTP düzeyinde
 * (`kimlik-dogrulama.test.mts`) doğrulanıyor. Burada yalnızca oradan
 * doğrulanamayan durum sınanır: imzası geçerli, sürümü doğru ama
 * kullanıcısı artık veritabanında bulunmayan bir token.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.USER_SESSION_SECRET = "test-kullanici-anahtari-" + "u".repeat(32);

const { prisma } = await import("../../src/lib/prisma.ts");
const { createUserSessionToken, USER_SESSION_COOKIE } = await import(
  "../../src/lib/auth.ts"
);
const { getUserSession } = await import("../../src/lib/session.ts");

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

describe("getUserSession", () => {
  test("geçerli token oturumu döndürür", async () => {
    const kullanici = await kullaniciOlustur("sahip@test.invalid");

    cerezAyarla(
      USER_SESSION_COOKIE,
      await createUserSessionToken({
        userId: kullanici.id,
        email: kullanici.email,
        sessionVersion: kullanici.sessionVersion,
      })
    );

    const oturum = await getUserSession();

    assert.equal(oturum?.userId, kullanici.id);
    assert.equal(oturum?.email, kullanici.email);
  });

  test("kullanıcı silinmişse geçerli imzalı token oturum sayılmaz", async () => {
    const kullanici = await kullaniciOlustur("silinen@test.invalid");

    cerezAyarla(
      USER_SESSION_COOKIE,
      await createUserSessionToken({
        userId: kullanici.id,
        email: kullanici.email,
        sessionVersion: kullanici.sessionVersion,
      })
    );

    await prisma.user.delete({ where: { id: kullanici.id } });

    assert.equal(await getUserSession(), null);
  });
});
