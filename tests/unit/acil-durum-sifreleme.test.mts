import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

/**
 * Acil durum verisi şifreleme testleri.
 *
 * Gerçek anahtar veya gerçek sağlık verisi kullanılmaz; anahtar burada
 * üretilir ve test sonunda geri alınır.
 */

const TEST_ANAHTARI = Buffer.alloc(32, 7).toString("base64");
const BASKA_ANAHTAR = Buffer.alloc(32, 9).toString("base64");

const oncekiAnahtar = process.env.EMERGENCY_DATA_ENCRYPTION_KEY;

before(() => {
  process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;
});

after(() => {
  if (oncekiAnahtar === undefined) {
    delete process.env.EMERGENCY_DATA_ENCRYPTION_KEY;
  } else {
    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = oncekiAnahtar;
  }
});

const { coz, sifrele, sifrelemeHazirMi, SifrelemeHatasi } = await import(
  "@/lib/acil-durum-sifreleme"
);

describe("acil durum verisi şifreleme", () => {
  test("şifrelenen metin aynen geri çözülür", () => {
    const metin = "Penisilin alerjisi";

    const cozulen = coz(sifrele(metin));

    assert.equal(cozulen, metin);
  });

  test("Türkçe karakterler ve satır sonları korunur", () => {
    const metin = "Şeker hastası\nİğne korkusu var — ölçüm gerekli";

    assert.equal(coz(sifrele(metin)), metin);
  });

  test("şifreli çıktı düz metni içermez", () => {
    const metin = "Insulin";

    const sifreli = sifrele(metin)!;

    assert.ok(!sifreli.includes(metin));
    assert.ok(sifreli.startsWith("v1."));
  });

  test("aynı metin her seferinde farklı şifrelenir (rastgele IV)", () => {
    const metin = "Aynı metin";

    assert.notEqual(sifrele(metin), sifrele(metin));
  });

  test("boş ve tanımsız değerler null döner", () => {
    assert.equal(sifrele(""), null);
    assert.equal(sifrele(null), null);
    assert.equal(sifrele(undefined), null);
    assert.equal(coz(null), null);
    assert.equal(coz(""), null);
  });

  test("kurcalanan şifreli veri çözülmez", () => {
    const sifreli = sifrele("Kan sulandırıcı kullanıyor")!;
    const parcalar = sifreli.split(".");

    // Şifreli gövdenin son karakteri değiştirilir.
    const bozuk = parcalar[3].slice(0, -1) + (parcalar[3].endsWith("A") ? "B" : "A");

    assert.equal(coz(`${parcalar[0]}.${parcalar[1]}.${parcalar[2]}.${bozuk}`), null);
  });

  test("bozuk biçimli değer çözülmez", () => {
    assert.equal(coz("duz-metin"), null);
    assert.equal(coz("v9.a.b.c"), null);
  });

  test("farklı anahtarla şifrelenmiş veri çözülmez", () => {
    const sifreli = sifrele("Gizli sağlık notu")!;

    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = BASKA_ANAHTAR;

    const sonuc = coz(sifreli);

    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;

    assert.equal(sonuc, null);
  });

  test("anahtar yoksa şifreleme sessizce düz metne düşmez, hata verir", () => {
    delete process.env.EMERGENCY_DATA_ENCRYPTION_KEY;

    assert.equal(sifrelemeHazirMi(), false);
    assert.throws(() => sifrele("Sağlık bilgisi"), SifrelemeHatasi);

    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;
  });

  test("yanlış uzunlukta anahtar reddedilir", () => {
    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString(
      "base64"
    );

    assert.equal(sifrelemeHazirMi(), false);
    assert.throws(() => sifrele("Sağlık bilgisi"), SifrelemeHatasi);

    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;
  });

  test("hata mesajı anahtarı veya veriyi içermez", () => {
    delete process.env.EMERGENCY_DATA_ENCRYPTION_KEY;

    try {
      sifrele("Çok gizli sağlık verisi");
      assert.fail("hata bekleniyordu");
    } catch (hata) {
      const mesaj = (hata as Error).message;

      assert.ok(!mesaj.includes("Çok gizli"));
      assert.ok(!mesaj.includes(TEST_ANAHTARI));
    }

    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;
  });

  test("hex biçimli 32 baytlık anahtar da kabul edilir", () => {
    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = "ab".repeat(32);

    assert.equal(sifrelemeHazirMi(), true);
    assert.equal(coz(sifrele("test")), "test");

    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;
  });
});
