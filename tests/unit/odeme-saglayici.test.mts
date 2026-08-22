import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

/**
 * Ödeme sağlayıcı yapılandırması.
 *
 * GÜVENLİK: Bu dosya hiçbir koşulda iyzico'ya ağ isteği yapmaz; yalnızca
 * yapılandırma okuma ve tutar biçimlendirme sınanır. Gerçek anahtar
 * kullanılmaz, hiçbir değer çıktıya yazılmaz.
 */

const {
  odemeYapilandirmasi,
  kurusuTutaraCevir,
  tutariKurusaCevir,
  cfImzaDogrula,
  OdemeHatasi,
} = await import("../../src/lib/odeme-saglayici.ts");

const { createHmac } = await import("node:crypto");

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

describe("tutar çözümleme", () => {
  test("sağlayıcının farklı biçimleri aynı kuruşa çözülür", () => {
    assert.equal(tutariKurusaCevir("55"), 5500);
    assert.equal(tutariKurusaCevir("55.0"), 5500);
    assert.equal(tutariKurusaCevir("55.00"), 5500);
    assert.equal(tutariKurusaCevir(" 404.00 "), 40400);
    assert.equal(tutariKurusaCevir("0.05"), 5);
  });

  test("geçersiz biçim çözülemez", () => {
    assert.equal(tutariKurusaCevir(""), null);
    assert.equal(tutariKurusaCevir("55,00"), null);
    assert.equal(tutariKurusaCevir("abc"), null);
    assert.equal(tutariKurusaCevir("-5.00"), null);
    assert.equal(tutariKurusaCevir("5.123"), null);
  });
});

describe("Checkout Form yanıt imzası", () => {
  const GIZLI = "test-gizli-anahtar";

  /** iyzico algoritması: alanlar sabit sırayla ":" ile birleşir. */
  const ALAN_SIRASI = [
    "paymentStatus",
    "paymentId",
    "currency",
    "basketId",
    "conversationId",
    "paidPrice",
    "price",
    "token",
  ];

  const YANIT: Record<string, string> = {
    paymentStatus: "SUCCESS",
    paymentId: "iyz-123",
    currency: "TRY",
    basketId: "ARK-2026-ABCD",
    conversationId: "ARK-2026-ABCD-1a2b3c4d",
    paidPrice: "404.0",
    price: "404.0",
    token: "cf-token",
  };

  function imzala(yanit: Record<string, string>, anahtar = GIZLI): string {
    return createHmac("sha256", anahtar)
      .update(ALAN_SIRASI.map((ad) => yanit[ad] ?? "").join(":"))
      .digest("hex");
  }

  test("geçerli imza kabul edilir", () => {
    const yanit = { ...YANIT, signature: imzala(YANIT) };

    assert.equal(cfImzaDogrula(yanit, GIZLI), true);
  });

  test("iyzico ham tutar döndürse de imza tutar (trailingZero)", () => {
    // İmza HER ZAMAN "404.0" üzerinden üretilir. iyzico yanıtta aynı tutarı
    // "404.00", "404" veya sayı olarak döndürebilir; doğrulama bunlarda da
    // geçmelidir. Bu normalizasyon olmadan callback akışı çöker.
    const imza = imzala(YANIT);

    for (const hamTutar of ["404.00", "404", "404.000"]) {
      assert.equal(
        cfImzaDogrula(
          { ...YANIT, paidPrice: hamTutar, price: hamTutar, signature: imza },
          GIZLI
        ),
        true,
        `"${hamTutar}" biçimi kabul edilmeli`
      );
    }

    // Sayı olarak gelen tutar da aynı imzayı vermeli.
    assert.equal(
      cfImzaDogrula(
        {
          ...YANIT,
          paidPrice: 404 as unknown as string,
          price: 404 as unknown as string,
          signature: imza,
        },
        GIZLI
      ),
      true,
      "sayı biçimi kabul edilmeli"
    );
  });

  test("ondalıklı tutarda da normalize edilir", () => {
    const ondalikli = { ...YANIT, paidPrice: "404.5", price: "404.5" };
    const imza = imzala(ondalikli);

    assert.equal(
      cfImzaDogrula(
        { ...ondalikli, paidPrice: "404.50", price: "404.50", signature: imza },
        GIZLI
      ),
      true
    );
  });

  test("normalizasyon farklı TUTARI kabul etmez", () => {
    const imza = imzala(YANIT);

    assert.equal(
      cfImzaDogrula(
        { ...YANIT, paidPrice: "405.0", price: "405.0", signature: imza },
        GIZLI
      ),
      false,
      "gerçekten farklı tutar reddedilmeli"
    );
  });

  test("imza yoksa reddedilir (fail-closed)", () => {
    assert.equal(cfImzaDogrula({ ...YANIT }, GIZLI), false);
    assert.equal(cfImzaDogrula({ ...YANIT, signature: "" }, GIZLI), false);
    assert.equal(cfImzaDogrula({ ...YANIT, signature: "   " }, GIZLI), false);
  });

  test("hatalı imza reddedilir", () => {
    assert.equal(cfImzaDogrula({ ...YANIT, signature: "deadbeef" }, GIZLI), false);
    assert.equal(
      cfImzaDogrula({ ...YANIT, signature: imzala(YANIT, "baska-anahtar") }, GIZLI),
      false
    );
  });

  test("alanı değiştirilmiş yanıt reddedilir", () => {
    const gecerliImza = imzala(YANIT);

    for (const ad of ALAN_SIRASI) {
      const bozulmus = { ...YANIT, [ad]: "degistirildi", signature: gecerliImza };

      assert.equal(
        cfImzaDogrula(bozulmus, GIZLI),
        false,
        `${ad} alanı değiştirilince imza tutmamalı`
      );
    }
  });

  test("tutarı düşürülmüş yanıt reddedilir", () => {
    const saldiri = {
      ...YANIT,
      paidPrice: "1.0",
      signature: imzala(YANIT),
    };

    assert.equal(cfImzaDogrula(saldiri, GIZLI), false);
  });

  test("alan sırası değişirse imza tutmaz", () => {
    const tersSirali = createHmac("sha256", GIZLI)
      .update([...ALAN_SIRASI].reverse().map((ad) => YANIT[ad]).join(":"))
      .digest("hex");

    assert.equal(cfImzaDogrula({ ...YANIT, signature: tersSirali }, GIZLI), false);
  });

  test("eksik alan varsa boş kabul edilir ve imza yine doğrulanır", () => {
    const eksik: Record<string, string> = { ...YANIT };
    delete eksik.paymentId;

    const yanit = { ...eksik, signature: imzala(eksik) };

    assert.equal(cfImzaDogrula(yanit, GIZLI), true);
  });

  test("gizli anahtar boşsa reddedilir", () => {
    assert.equal(cfImzaDogrula({ ...YANIT, signature: imzala(YANIT) }, ""), false);
  });
});
