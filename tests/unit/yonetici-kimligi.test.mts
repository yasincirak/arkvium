import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

/**
 * Yönetici şifre hash'inin ortam değişkeninden okunması.
 *
 * Bu modül gerçek bir production arızasından doğdu: ham bcrypt hash'i
 * .env içine yazıldığında `$2b`, `$12` gibi parçalar değişken sayılıp
 * genişletiliyor ve hash bozuluyordu; doğru şifreyle bile giriş
 * yapılamıyordu. Bozuk değer sessizce kabul edilirse aynı arıza geri döner.
 *
 * Testlerde gerçek bir şifre hash'i kullanılmaz; yalnızca bcrypt BİÇİMİNE
 * uyan yapay değerler üretilir.
 */

const { yoneticiSifreHashi } = await import("../../src/lib/admin-credentials.ts");

/** Gerçek bir şifreye ait değildir; yalnızca bcrypt biçimini taklit eder. */
const SAHTE_HASH = "$2b$10$" + "a".repeat(53);

function base64(deger: string): string {
  return Buffer.from(deger, "utf8").toString("base64");
}

const ONCEKI = { ...process.env };

beforeEach(() => {
  delete process.env.ADMIN_PASSWORD_HASH_B64;
  delete process.env.ADMIN_PASSWORD_HASH;
});

afterEach(() => {
  process.env = { ...ONCEKI };
});

describe("yoneticiSifreHashi", () => {
  test("base64 değer çözülüp hash olarak döner", () => {
    process.env.ADMIN_PASSWORD_HASH_B64 = base64(SAHTE_HASH);

    assert.equal(yoneticiSifreHashi(), SAHTE_HASH);
  });

  test("base64 değerin çevresindeki boşluklar temizlenir", () => {
    process.env.ADMIN_PASSWORD_HASH_B64 = `  ${base64(SAHTE_HASH)}  `;

    assert.equal(yoneticiSifreHashi(), SAHTE_HASH);
  });

  test("base64 olmayan değer reddedilir", () => {
    process.env.ADMIN_PASSWORD_HASH_B64 = SAHTE_HASH;

    assert.equal(yoneticiSifreHashi(), null, "ham hash base64 sayılmamalı");
  });

  test("base64 çözülüp bcrypt biçimi vermiyorsa reddedilir", () => {
    process.env.ADMIN_PASSWORD_HASH_B64 = base64("bu bir hash degil");

    assert.equal(yoneticiSifreHashi(), null);
  });

  test("geriye dönük uyumluluk: ham hash kabul edilir", () => {
    process.env.ADMIN_PASSWORD_HASH = SAHTE_HASH;

    assert.equal(yoneticiSifreHashi(), SAHTE_HASH);
  });

  test("env genişletmesiyle bozulmuş ham hash reddedilir", () => {
    // ".env" yükleyicisi `$2b$10$` parçalarını silince geriye bu kalır.
    process.env.ADMIN_PASSWORD_HASH = "a".repeat(53);

    assert.equal(yoneticiSifreHashi(), null, "bozuk hash sessizce kabul edilmemeli");
  });

  test("base64 değeri varken ham değere düşülmez", () => {
    process.env.ADMIN_PASSWORD_HASH_B64 = base64("bozuk");
    process.env.ADMIN_PASSWORD_HASH = SAHTE_HASH;

    assert.equal(yoneticiSifreHashi(), null);
  });

  test("hiçbir değer tanımlı değilse null döner", () => {
    assert.equal(yoneticiSifreHashi(), null);
  });

  test("boş değerler tanımsız sayılır", () => {
    process.env.ADMIN_PASSWORD_HASH_B64 = "   ";
    process.env.ADMIN_PASSWORD_HASH = "   ";

    assert.equal(yoneticiSifreHashi(), null);
  });
});
