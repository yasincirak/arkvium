import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";

const {
  TOKEN_SURESI,
  ozetlerEsit,
  sonKullanmaTarihi,
  tokenDurumu,
  tokenOzetle,
  tokenUret,
} = await import("../src/lib/tokens.ts");

describe("token üretimi", () => {
  test("her çağrıda farklı token üretir", () => {
    const uretilenler = new Set<string>();

    for (let i = 0; i < 200; i += 1) {
      uretilenler.add(tokenUret().token);
    }

    assert.equal(uretilenler.size, 200);
  });

  test("token yeterli uzunlukta ve URL güvenli karakterlerden oluşur", () => {
    const { token } = tokenUret();

    // 32 bayt base64url -> 43 karakter
    assert.equal(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  test("üretilen özet token'ın SHA-256 karşılığıdır", () => {
    const { token, tokenHash } = tokenUret();

    assert.equal(
      tokenHash,
      createHash("sha256").update(token).digest("hex")
    );
  });

  test("özet, token'ın kendisini içermez", () => {
    const { token, tokenHash } = tokenUret();

    assert.ok(!tokenHash.includes(token));
    assert.notEqual(tokenHash, token);
  });

  test("aynı token her zaman aynı özeti verir", () => {
    const { token, tokenHash } = tokenUret();

    assert.equal(tokenOzetle(token), tokenHash);
  });

  test("farklı tokenlar farklı özet verir", () => {
    assert.notEqual(tokenOzetle("token-bir"), tokenOzetle("token-iki"));
  });
});

describe("özet karşılaştırma", () => {
  test("aynı özetler eşit sayılır", () => {
    const ozet = tokenOzetle("ornek");

    assert.equal(ozetlerEsit(ozet, ozet), true);
  });

  test("farklı özetler eşit sayılmaz", () => {
    assert.equal(
      ozetlerEsit(tokenOzetle("bir"), tokenOzetle("iki")),
      false
    );
  });

  test("farklı uzunluktaki değerler eşit sayılmaz", () => {
    assert.equal(ozetlerEsit("kisa", tokenOzetle("uzun")), false);
  });
});

describe("token geçerlilik durumu", () => {
  test("kullanılmamış ve süresi dolmamış token geçerlidir", () => {
    const durum = tokenDurumu({
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    assert.deepEqual(durum, { gecerli: true });
  });

  test("kullanılmış token reddedilir", () => {
    const durum = tokenDurumu({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    assert.deepEqual(durum, { gecerli: false, sebep: "kullanilmis" });
  });

  test("süresi dolmuş token reddedilir", () => {
    const durum = tokenDurumu({
      usedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });

    assert.deepEqual(durum, { gecerli: false, sebep: "suresi-dolmus" });
  });

  test("hem kullanılmış hem süresi dolmuş token reddedilir", () => {
    const durum = tokenDurumu({
      usedAt: new Date(),
      expiresAt: new Date(Date.now() - 1_000),
    });

    assert.equal(durum.gecerli, false);
  });

  test("tam sınırda süresi dolmuş sayılır", () => {
    const durum = tokenDurumu({ usedAt: null, expiresAt: new Date() });

    assert.deepEqual(durum, { gecerli: false, sebep: "suresi-dolmus" });
  });
});

describe("son kullanma tarihi", () => {
  test("verilen dakika kadar ileri bir tarih üretir", () => {
    const once = Date.now();
    const tarih = sonKullanmaTarihi(60);

    assert.ok(tarih.getTime() >= once + 60 * 60 * 1000);
    assert.ok(tarih.getTime() <= Date.now() + 60 * 60 * 1000);
  });

  test("şifre sıfırlama süresi 1 saattir", () => {
    assert.equal(TOKEN_SURESI.sifreSifirlama, 60);
  });

  test("e-posta doğrulama süresi 24 saattir", () => {
    assert.equal(TOKEN_SURESI.epostaDogrulama, 60 * 24);
  });
});
