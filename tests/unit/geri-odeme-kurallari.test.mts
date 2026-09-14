import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Geri ödeme kuralları — tutar güvenliği ve özellik bayrağı.
 *
 * EN KRİTİK İKİ KURAL:
 *  1. Tutar istemciden güvenilir kabul edilmez; tahsil edilen tutarı
 *     hiçbir koşulda aşamaz.
 *  2. Otomatik iade VARSAYILAN OLARAK KAPALIDIR; yalnızca tam olarak
 *     "1" değeri açar.
 */

const {
  otomatikIadeAcikMi,
  iadeUygunMu,
  iadeTutariniBelirle,
  iadeAnahtari,
  OTOMATIK_IADE_ANAHTARI,
  ODEME_IADE_EDILEMEZ,
  SIPARIS_IADE_EDILEMEZ,
  TUTAR_ASIYOR,
  TUTAR_GECERSIZ,
} = await import("../../src/lib/geri-odeme-kurallari.ts");

describe("otomatik iade bayrağı", () => {
  test("tanımsızsa KAPALIDIR", () => {
    assert.equal(otomatikIadeAcikMi({}), false);
  });

  test("yalnızca tam olarak '1' açar", () => {
    assert.equal(otomatikIadeAcikMi({ [OTOMATIK_IADE_ANAHTARI]: "1" }), true);
  });

  test("benzer görünen değerler AÇMAZ", () => {
    for (const deger of ["true", "TRUE", "evet", "on", "yes", "0", "", " 1", "1 "]) {
      assert.equal(
        otomatikIadeAcikMi({ [OTOMATIK_IADE_ANAHTARI]: deger }),
        false,
        `"${deger}" açmamalı`
      );
    }
  });

  test("bayrak adı NEXT_PUBLIC_ öneki taşımaz", () => {
    // İstemci derlemesine girmemeli.
    assert.ok(!OTOMATIK_IADE_ANAHTARI.startsWith("NEXT_PUBLIC_"));
  });
});

describe("iade uygunluğu", () => {
  test("yalnızca başarıyla tahsil edilmiş ödeme iade edilir", () => {
    for (const odemeDurumu of ["pending", "failed", "cancelled"] as const) {
      const karar = iadeUygunMu("paid", odemeDurumu);

      assert.equal(karar.uygun, false, odemeDurumu);
      assert.equal(karar.gerekce, ODEME_IADE_EDILEMEZ);
    }
  });

  test("ödenmiş, hazırlanan, kargolanan ve iptal edilen sipariş iade edilebilir", () => {
    for (const durum of ["paid", "preparing", "shipped", "cancelled"] as const) {
      assert.equal(iadeUygunMu(durum, "succeeded").uygun, true, durum);
    }
  });

  test("İPTAL EDİLMİŞ sipariş iade edilebilir", () => {
    /*
      Ödemesi alınmış sipariş iptal edildiğinde para hâlâ müşteride
      değildir; iade tam da o zaman gerekir.
    */
    assert.equal(iadeUygunMu("cancelled", "succeeded").uygun, true);
  });

  test("ödemesi tamamlanmamış sipariş iade edilemez", () => {
    for (const durum of ["pending", "failed"] as const) {
      const karar = iadeUygunMu(durum, "succeeded");

      assert.equal(karar.uygun, false, durum);
      assert.equal(karar.gerekce, SIPARIS_IADE_EDILEMEZ);
    }
  });
});

describe("tutar hesabı — istemciye güvenilmez", () => {
  test("tutar verilmezse kalanın tamamı iade edilir", () => {
    assert.equal(iadeTutariniBelirle({ odenenKurus: 30400 }), 30400);
  });

  test("önceki iadeler düşülür", () => {
    assert.equal(
      iadeTutariniBelirle({ odenenKurus: 30400, oncekiIadeKurus: 10000 }),
      20400
    );
  });

  test("TAHSİL EDİLEN TUTARI AŞAN istek reddedilir", () => {
    assert.throws(
      () => iadeTutariniBelirle({ odenenKurus: 30400, istenenKurus: 30401 }),
      new RegExp(TUTAR_ASIYOR)
    );
  });

  test("önceki iadelerle birlikte aşan istek reddedilir", () => {
    assert.throws(
      () =>
        iadeTutariniBelirle({
          odenenKurus: 30400,
          oncekiIadeKurus: 20000,
          istenenKurus: 10401,
        }),
      new RegExp(TUTAR_ASIYOR)
    );
  });

  test("tamamı iade edilmişse yeni iade yapılamaz", () => {
    assert.throws(
      () => iadeTutariniBelirle({ odenenKurus: 30400, oncekiIadeKurus: 30400 }),
      new RegExp(TUTAR_ASIYOR)
    );
  });

  test("sınırdaki tutar kabul edilir", () => {
    assert.equal(
      iadeTutariniBelirle({ odenenKurus: 30400, istenenKurus: 30400 }),
      30400
    );
  });

  test("sıfır ve negatif tutar reddedilir", () => {
    for (const istenen of [0, -1, -30400]) {
      assert.throws(
        () => iadeTutariniBelirle({ odenenKurus: 30400, istenenKurus: istenen }),
        new RegExp(TUTAR_GECERSIZ)
      );
    }
  });

  test("tam sayı olmayan ve metin tutar reddedilir", () => {
    for (const istenen of [1.5, "30400", {}, [], true, NaN, Infinity]) {
      assert.throws(
        () => iadeTutariniBelirle({ odenenKurus: 30400, istenenKurus: istenen }),
        new RegExp(TUTAR_GECERSIZ)
      );
    }
  });

  test("geçersiz ödeme tutarı reddedilir", () => {
    for (const odenen of [0, -100, 1.5, NaN]) {
      assert.throws(
        () => iadeTutariniBelirle({ odenenKurus: odenen }),
        new RegExp(TUTAR_GECERSIZ)
      );
    }
  });
});

describe("idempotency anahtarı", () => {
  test("ödeme kimliğinden türetilir ve sabittir", () => {
    assert.equal(iadeAnahtari("odeme-1"), "iade:odeme-1");
    assert.equal(iadeAnahtari("odeme-1"), iadeAnahtari("odeme-1"));
  });

  test("farklı ödemeler farklı anahtar alır", () => {
    assert.notEqual(iadeAnahtari("a"), iadeAnahtari("b"));
  });
});
