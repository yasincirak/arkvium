import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { istemciIpAdresi } = await import("../../src/lib/request-ip.ts");

/**
 * İstemci IP okuma — hız sınırlamanın dayandığı tek kimlik.
 *
 * Yanlış okunan bir başlık iki yönde de zarar verir: herkes tek anahtara
 * düşerse bir kullanıcı diğerlerini kilitler, her istek farklı anahtara
 * düşerse hız sınırı hiç çalışmaz.
 */

function basliklar(deger: Record<string, string>): Headers {
  return new Headers(deger);
}

describe("istemciIpAdresi", () => {
  test("x-forwarded-for tek adres içeriyorsa o adres okunur", () => {
    assert.equal(
      istemciIpAdresi(basliklar({ "x-forwarded-for": "203.0.113.5" })),
      "203.0.113.5"
    );
  });

  test("zincirde ilk adres (gerçek istemci) alınır", () => {
    assert.equal(
      istemciIpAdresi(
        basliklar({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" })
      ),
      "203.0.113.5"
    );
  });

  test("adreslerin çevresindeki boşluklar temizlenir", () => {
    assert.equal(
      istemciIpAdresi(basliklar({ "x-forwarded-for": "  203.0.113.5 , 70.41.3.18" })),
      "203.0.113.5"
    );
  });

  test("IPv6 adresi olduğu gibi döner", () => {
    assert.equal(
      istemciIpAdresi(basliklar({ "x-forwarded-for": "2001:db8::1, 70.41.3.18" })),
      "2001:db8::1"
    );
  });

  test("x-forwarded-for yoksa x-real-ip kullanılır", () => {
    assert.equal(
      istemciIpAdresi(basliklar({ "x-real-ip": "198.51.100.7" })),
      "198.51.100.7"
    );
  });

  test("x-forwarded-for boşsa x-real-ip'e düşülür", () => {
    assert.equal(
      istemciIpAdresi(
        basliklar({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.7" })
      ),
      "198.51.100.7"
    );
  });

  test("x-forwarded-for varken x-real-ip yok sayılır", () => {
    assert.equal(
      istemciIpAdresi(
        basliklar({
          "x-forwarded-for": "203.0.113.5",
          "x-real-ip": "198.51.100.7",
        })
      ),
      "203.0.113.5"
    );
  });

  test("hiçbir başlık yoksa sabit bir anahtar döner", () => {
    assert.equal(istemciIpAdresi(basliklar({})), "bilinmeyen");
  });

  test("her iki başlık da boşsa sabit anahtara düşülür", () => {
    assert.equal(
      istemciIpAdresi(basliklar({ "x-forwarded-for": " ", "x-real-ip": "  " })),
      "bilinmeyen"
    );
  });
});
