import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Acil durum profili doğrulama testleri.
 *
 * Yalnızca veritabanına dokunmayan saf doğrulama mantığı sınanır; gerçek
 * sağlık verisi veya gerçek telefon numarası kullanılmaz.
 */

const {
  AcilDurumHatasi,
  KAN_GRUBU_ETIKETLERI,
  KAN_GRUPLARI,
  ONAY_METNI_SURUMU,
  SINIRLAR,
  gecerliKanGrubu,
  telefonNormalize,
} = await import("@/lib/acil-durum-dogrulama");

describe("telefon normalleştirme", () => {
  test("boşluk ve ayraçlar temizlenir", () => {
    assert.equal(telefonNormalize("0555 111 22 33"), "05551112233");
    assert.equal(telefonNormalize("(0212) 555-00-00"), "02125550000");
  });

  test("baştaki artı korunur", () => {
    assert.equal(telefonNormalize("+90 555 111 22 33"), "+905551112233");
  });

  test("çok kısa numara reddedilir", () => {
    assert.throws(() => telefonNormalize("12345"), AcilDurumHatasi);
  });

  test("çok uzun numara reddedilir", () => {
    assert.throws(() => telefonNormalize("1".repeat(16)), AcilDurumHatasi);
  });

  test("rakam içermeyen değer reddedilir", () => {
    assert.throws(() => telefonNormalize("telefon yok"), AcilDurumHatasi);
    assert.throws(() => telefonNormalize(""), AcilDurumHatasi);
    assert.throws(() => telefonNormalize(null), AcilDurumHatasi);
  });

  test("hata mesajı girilen numarayı içermez", () => {
    try {
      telefonNormalize("999");
      assert.fail("hata bekleniyordu");
    } catch (hata) {
      assert.ok(!(hata as Error).message.includes("999"));
    }
  });
});

describe("kan grubu seçenekleri", () => {
  test("tüm enum değerlerinin ekran karşılığı tanımlı", () => {
    for (const deger of KAN_GRUPLARI) {
      assert.ok(
        KAN_GRUBU_ETIKETLERI[deger],
        `${deger} için etiket tanımlı değil`
      );
    }
  });

  test("beklenen dokuz seçenek vardır", () => {
    assert.equal(KAN_GRUPLARI.length, 9);
    assert.ok(KAN_GRUPLARI.includes("BILINMIYOR"));
  });
});

describe("sınırlar ve onay sürümü", () => {
  test("en fazla iki acil durum kişisi tanımlı", () => {
    assert.equal(SINIRLAR.enFazlaKisi, 2);
  });

  test("onay metni sürümü taslak olarak işaretli", () => {
    // Hukukçu incelemesi tamamlanana kadar sürüm 'taslak' ile başlamalıdır.
    assert.ok(ONAY_METNI_SURUMU.startsWith("taslak"));
  });
});

describe("kan grubu okuma yolunda güvenli doğrulama", () => {
  test("geçerli kod aynen döner", () => {
    assert.equal(gecerliKanGrubu("A_RH_POZITIF"), "A_RH_POZITIF");
  });

  test("geçersiz, boş veya kurcalanmış değer hata fırlatmadan null döner", () => {
    // Okuma yolunda hata fırlatmak sayfayı kırar; güvenli davranış gizlemektir.
    assert.equal(gecerliKanGrubu("UYDURMA"), null);
    assert.equal(gecerliKanGrubu(""), null);
    assert.equal(gecerliKanGrubu(null), null);
    assert.equal(gecerliKanGrubu(undefined), null);
    assert.equal(gecerliKanGrubu(42), null);
    assert.equal(gecerliKanGrubu({}), null);
  });

  test("küçük harfli varyant kabul edilmez", () => {
    assert.equal(gecerliKanGrubu("a_rh_pozitif"), null);
  });
});
