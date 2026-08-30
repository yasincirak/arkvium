import assert from "node:assert/strict";
import { before, describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * Rol tabanlı yönetici yetkisi testleri.
 *
 * Veritabanına ve gerçek çerezlere bağlanılmaz: `@/lib/prisma` ve
 * `next/headers` sahte modüllerle değiştirilir. Doğrulanan şey, yetki
 * kararının NEREYE baktığıdır:
 *
 *  - Rol her çağrıda VERİTABANINDAN okunmalı, oturum tokenından değil.
 *  - Tokena elle yazılmış bir rol iddiası yok sayılmalı.
 *  - Rolü CUSTOMER olan kullanıcı yönetici sayılmamalı.
 */

const KULLANICI_GIZLI = "a".repeat(48);

/** Sahte veritabanının döndüreceği kullanıcı satırı. */
let veritabaniKullanicisi: any = null;

/** Sahte çerez kutusunun döndüreceği değerler. */
let cerezler: Record<string, string> = {};

/** prisma.user.findUnique çağrısında istenen alanlar. */
let sonSelect: any = null;

before(() => {
  process.env.USER_SESSION_SECRET = KULLANICI_GIZLI;

  mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
    exports: {
      prisma: {
        user: {
          async findUnique(sorgu: any) {
            sonSelect = sorgu.select;

            return veritabaniKullanicisi;
          },
        },
      },
    },
  });

  mock.module("next/headers", {
    exports: {
      async cookies() {
        return {
          get(ad: string) {
            const deger = cerezler[ad];

            return deger ? { name: ad, value: deger } : undefined;
          },
        };
      },
    },
  });
});

async function oturumModulu() {
  return import(pathToFileURL(resolve("src/lib/session.ts")).href);
}

async function kullaniciTokeni(iddialar: Record<string, unknown>) {
  const { SignJWT } = await import("jose");

  return new SignJWT({ type: "user", ...iddialar })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(KULLANICI_GIZLI));
}

describe("yoneticiErisimi", () => {
  test("rol veritabanından okunur, tokendan değil", async () => {
    const { getUserSession } = await oturumModulu();

    veritabaniKullanicisi = { sessionVersion: 0, role: "ADMIN" };
    cerezler = {
      arkvium_user_session: await kullaniciTokeni({
        userId: "k1",
        email: "a@ornek.test",
        sessionVersion: 0,
        // Token CUSTOMER diyor; veritabanı ADMIN diyor. Veritabanı kazanmalı.
        role: "CUSTOMER",
      }),
    };

    const oturum = await getUserSession();

    assert.equal(oturum?.role, "ADMIN");
    assert.equal(sonSelect.role, true, "sorgu role alanını istemeli");
  });

  test("tokena yazılmış ADMIN iddiası yetki vermez", async () => {
    const { yoneticiErisimi } = await oturumModulu();

    veritabaniKullanicisi = { sessionVersion: 0, role: "CUSTOMER" };
    cerezler = {
      arkvium_user_session: await kullaniciTokeni({
        userId: "k2",
        email: "b@ornek.test",
        sessionVersion: 0,
        role: "ADMIN",
      }),
    };

    assert.equal(await yoneticiErisimi(), null);
  });

  test("rolü ADMIN olan kullanıcı yönetici sayılır", async () => {
    const { yoneticiErisimi } = await oturumModulu();

    veritabaniKullanicisi = { sessionVersion: 0, role: "ADMIN" };
    cerezler = {
      arkvium_user_session: await kullaniciTokeni({
        userId: "k3",
        email: "c@ornek.test",
        sessionVersion: 0,
      }),
    };

    const erisim = await yoneticiErisimi();

    assert.equal(erisim?.userId, "k3");
    assert.equal(erisim?.email, "c@ornek.test");
  });

  test("oturum sürümü eskiyse rol ADMIN olsa bile yetki verilmez", async () => {
    const { yoneticiErisimi } = await oturumModulu();

    veritabaniKullanicisi = { sessionVersion: 5, role: "ADMIN" };
    cerezler = {
      arkvium_user_session: await kullaniciTokeni({
        userId: "k4",
        email: "d@ornek.test",
        sessionVersion: 0,
      }),
    };

    assert.equal(await yoneticiErisimi(), null);
  });

  test("eski yönetici çerezi artık yetki vermez", async () => {
    const { yoneticiErisimi } = await oturumModulu();

    veritabaniKullanicisi = null;
    // Eski akışta bu çerez tek başına yönetici yetkisi veriyordu.
    cerezler = { arkvium_admin_session: "eski-gecerli-gorunumlu-token" };

    assert.equal(await yoneticiErisimi(), null);
  });

  test("oturum yoksa yetki yoktur", async () => {
    const { yoneticiErisimi } = await oturumModulu();

    veritabaniKullanicisi = null;
    cerezler = {};

    assert.equal(await yoneticiErisimi(), null);
  });
});
