import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

/**
 * Ödeme sağlayıcı yapılandırması.
 *
 * GÜVENLİK: Bu dosya hiçbir koşulda iyzico'ya ağ isteği yapmaz; yalnızca
 * yapılandırma okuma ve tutar biçimlendirme sınanır. Gerçek anahtar
 * kullanılmaz, hiçbir değer çıktıya yazılmaz.
 */

const { odemeYapilandirmasi, kurusuTutaraCevir, OdemeHatasi } = await import(
  "../../src/lib/odeme-saglayici.ts"
);

const ONCEKI = { ...process.env };

const ORNEK = {
  IYZICO_API_KEY: "test-anahtar",
  IYZICO_SECRET_KEY: "test-gizli",
  IYZICO_BASE_URL: "https://ornek.invalid",
  IYZICO_CALLBACK_URL: "https://ornek.invalid/callback",
};

beforeEach(() => {
  for (const ad of Object.keys(ORNEK)) {
    delete process.env[ad];
  }
});

afterEach(() => {
  process.env = { ...ONCEKI };
});

describe("ödeme yapılandırması", () => {
  test("dört değişken de tanımlıysa okunur", () => {
    Object.assign(process.env, ORNEK);

    const yapilandirma = odemeYapilandirmasi();

    assert.equal(yapilandirma.baseUrl, ORNEK.IYZICO_BASE_URL);
    assert.equal(yapilandirma.callbackUrl, ORNEK.IYZICO_CALLBACK_URL);
  });

  test("callback adresi yoksa ödeme başlatılamaz", () => {
    Object.assign(process.env, ORNEK);
    delete process.env.IYZICO_CALLBACK_URL;

    assert.throws(() => odemeYapilandirmasi(), OdemeHatasi);
  });

  test("callback adresi boşsa ödeme başlatılamaz", () => {
    Object.assign(process.env, ORNEK, { IYZICO_CALLBACK_URL: "   " });

    assert.throws(() => odemeYapilandirmasi(), OdemeHatasi);
  });

  test("anahtarlardan biri eksikse ödeme başlatılamaz", () => {
    for (const eksik of ["IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL"]) {
      Object.assign(process.env, ORNEK);
      delete process.env[eksik];

      assert.throws(() => odemeYapilandirmasi(), OdemeHatasi, `${eksik} eksik`);
    }
  });

  test("hata mesajı değişken değeri veya sistem detayı içermez", () => {
    Object.assign(process.env, ORNEK);
    delete process.env.IYZICO_CALLBACK_URL;

    try {
      odemeYapilandirmasi();
      assert.fail("hata bekleniyordu");
    } catch (hata) {
      const mesaj = (hata as Error).message;

      assert.doesNotMatch(mesaj, /test-anahtar|test-gizli|https?:\/\//);
      assert.match(mesaj, /kullanılamıyor/i);
    }
  });
});

describe("tutar biçimlendirme", () => {
  test("kuruş ondalık metne çevrilir", () => {
    assert.equal(kurusuTutaraCevir(5500), "55.00");
    assert.equal(kurusuTutaraCevir(19900), "199.00");
    assert.equal(kurusuTutaraCevir(25400), "254.00");
    assert.equal(kurusuTutaraCevir(5), "0.05");
    assert.equal(kurusuTutaraCevir(0), "0.00");
  });

  test("geçersiz tutar reddedilir", () => {
    assert.throws(() => kurusuTutaraCevir(-1), OdemeHatasi);
    assert.throws(() => kurusuTutaraCevir(1.5), OdemeHatasi);
  });
});
