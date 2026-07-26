import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

/**
 * Oturum token'ı testleri.
 *
 * Gerçek kullanıcı verisi, gerçek veritabanı veya production secret
 * kullanılmaz; test anahtarları burada üretilir.
 */

const TEST_ADMIN_SECRET = "a".repeat(48);
const TEST_USER_SECRET = "b".repeat(48);

const originalEnv = {
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  USER_SESSION_SECRET: process.env.USER_SESSION_SECRET,
};

before(() => {
  process.env.ADMIN_SESSION_SECRET = TEST_ADMIN_SECRET;
  process.env.USER_SESSION_SECRET = TEST_USER_SECRET;
});

after(() => {
  process.env.ADMIN_SESSION_SECRET = originalEnv.ADMIN_SESSION_SECRET;
  process.env.USER_SESSION_SECRET = originalEnv.USER_SESSION_SECRET;
});

const auth = await import("../../src/lib/auth.ts");

describe("kullanıcı oturum token'ı", () => {
  test("üretilen token doğrulanabilir", async () => {
    const token = await auth.createUserSessionToken({
      userId: "kullanici-1",
      email: "test@example.com",
      sessionVersion: 0,
    });

    const session = await auth.verifyUserSessionToken(token);

    assert.deepEqual(session, {
      userId: "kullanici-1",
      email: "test@example.com",
      sessionVersion: 0,
    });
  });

  test("oturum sürümü token içinde taşınır", async () => {
    const token = await auth.createUserSessionToken({
      userId: "kullanici-1",
      email: "test@example.com",
      sessionVersion: 7,
    });

    const session = await auth.verifyUserSessionToken(token);

    assert.equal(session?.sessionVersion, 7);
  });

  test("sessionVersion taşımayan eski token reddedilir", async () => {
    // Sürüm mekanizması eklenmeden önce üretilmiş bir token taklit edilir.
    const { SignJWT } = await import("jose");

    const eskiToken = await new SignJWT({
      userId: "kullanici-1",
      email: "test@example.com",
      type: "user",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(TEST_USER_SECRET));

    assert.equal(await auth.verifyUserSessionToken(eskiToken), null);
  });

  test("tam sayı olmayan sürüm reddedilir", async () => {
    const { SignJWT } = await import("jose");

    const bozukToken = await new SignJWT({
      userId: "kullanici-1",
      email: "test@example.com",
      type: "user",
      sessionVersion: 1.5,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(TEST_USER_SECRET));

    assert.equal(await auth.verifyUserSessionToken(bozukToken), null);
  });

  test("bozulmuş token reddedilir", async () => {
    const token = await auth.createUserSessionToken({
      userId: "kullanici-1",
      email: "test@example.com",
      sessionVersion: 0,
    });

    assert.equal(await auth.verifyUserSessionToken(token + "x"), null);
  });

  test("anlamsız token reddedilir", async () => {
    assert.equal(await auth.verifyUserSessionToken("gecersiz"), null);
  });
});

describe("admin oturum token'ı", () => {
  test("üretilen token doğrulanabilir", async () => {
    const token = await auth.createAdminSessionToken({
      email: "admin@example.com",
    });

    assert.deepEqual(await auth.verifyAdminSessionToken(token), {
      email: "admin@example.com",
    });
  });
});

describe("kullanıcı ve admin oturumlarının ayrımı", () => {
  test("kullanıcı token'ı admin olarak doğrulanamaz", async () => {
    const userToken = await auth.createUserSessionToken({
      userId: "kullanici-1",
      email: "test@example.com",
      sessionVersion: 0,
    });

    assert.equal(await auth.verifyAdminSessionToken(userToken), null);
  });

  test("admin token'ı kullanıcı olarak doğrulanamaz", async () => {
    const adminToken = await auth.createAdminSessionToken({
      email: "admin@example.com",
    });

    assert.equal(await auth.verifyUserSessionToken(adminToken), null);
  });

  test("admin anahtarıyla imzalanmış kullanıcı token'ı kabul edilmez", async () => {
    // Aynı gizli anahtar iki oturum için de kullanılsaydı bile type claim'i
    // geçişi engellemelidir.
    process.env.USER_SESSION_SECRET = TEST_ADMIN_SECRET;

    const adminToken = await auth.createAdminSessionToken({
      email: "admin@example.com",
    });

    assert.equal(await auth.verifyUserSessionToken(adminToken), null);

    process.env.USER_SESSION_SECRET = TEST_USER_SECRET;
  });
});

describe("gizli anahtar zorunluluğu", () => {
  test("anahtar tanımlı değilse token üretilmez", async () => {
    delete process.env.USER_SESSION_SECRET;

    await assert.rejects(
      () =>
        auth.createUserSessionToken({
          userId: "kullanici-1",
          email: "test@example.com",
        }),
      /USER_SESSION_SECRET/
    );

    process.env.USER_SESSION_SECRET = TEST_USER_SECRET;
  });

  test("anahtar 32 karakterden kısaysa reddedilir", async () => {
    process.env.USER_SESSION_SECRET = "kisa-anahtar";

    await assert.rejects(
      () =>
        auth.createUserSessionToken({
          userId: "kullanici-1",
          email: "test@example.com",
        }),
      /USER_SESSION_SECRET/
    );

    process.env.USER_SESSION_SECRET = TEST_USER_SECRET;
  });
});

describe("oturum çerezi ayarları", () => {
  test("çerez httpOnly ve lax olarak ayarlanır", () => {
    assert.equal(auth.sessionCookieOptions.httpOnly, true);
    assert.equal(auth.sessionCookieOptions.sameSite, "lax");
    assert.equal(auth.sessionCookieOptions.path, "/");
  });

  test("kullanıcı ve admin çerez adları farklıdır", () => {
    assert.notEqual(auth.USER_SESSION_COOKIE, auth.ADMIN_SESSION_COOKIE);
  });
});
