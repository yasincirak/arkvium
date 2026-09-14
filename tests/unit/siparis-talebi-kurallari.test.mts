import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Müşteri iptal/iade talebi kuralları — saf karar tablosu.
 *
 * Her sipariş durumu için hangi talep türünün açılabileceği burada
 * doğrulanır. Veritabanı gerekmez.
 *
 * DİKKAT — mesaj eşleştirmesinde `i` bayrağı Türkçe harflerde
 * güvenilmezdir: JavaScript "İ" harfini "i" olarak küçültmez. Desenler
 * metindeki harfleri olduğu gibi yazar.
 */

const {
  talepAcilabilirMi,
  talepTuruMu,
  gerekceDogrula,
  GEREKCE_EN_AZ,
  GEREKCE_EN_FAZLA,
  IPTAL_ICIN_GEC,
  IADE_ICIN_ERKEN,
  SIPARIS_IPTAL_EDILMIS,
  SIPARIS_BASARISIZ,
} = await import("../../src/lib/siparis-talebi-kurallari.ts");

const TUM_DURUMLAR = [
  "pending",
  "paid",
  "preparing",
  "shipped",
  "cancelled",
  "failed",
] as const;

describe("talep türü doğrulaması", () => {
  test("yalnızca cancel ve refund kabul edilir", () => {
    assert.equal(talepTuruMu("cancel"), true);
    assert.equal(talepTuruMu("refund"), true);
    assert.equal(talepTuruMu("iptal"), false);
    assert.equal(talepTuruMu(""), false);
    assert.equal(talepTuruMu(null), false);
    assert.equal(talepTuruMu({ tur: "cancel" }), false);
  });
});

describe("kargo öncesi: iptal açılır, iade açılmaz", () => {
  for (const durum of ["pending", "paid", "preparing"] as const) {
    test(`${durum}: iptal talebi açılabilir`, () => {
      assert.equal(talepAcilabilirMi(durum, "cancel").izinli, true);
    });

    test(`${durum}: iade talebi REDDEDİLİR ve iptale yönlendirir`, () => {
      const karar = talepAcilabilirMi(durum, "refund");

      assert.equal(karar.izinli, false);
      assert.equal(karar.gerekce, IADE_ICIN_ERKEN);
      assert.match(karar.gerekce ?? "", /iptal talebi/i);
    });
  }
});

describe("kargo sonrası: iade açılır, iptal açılmaz", () => {
  test("shipped: iade talebi açılabilir", () => {
    assert.equal(talepAcilabilirMi("shipped", "refund").izinli, true);
  });

  test("shipped: iptal talebi REDDEDİLİR ve iadeye yönlendirir", () => {
    const karar = talepAcilabilirMi("shipped", "cancel");

    assert.equal(karar.izinli, false);
    assert.equal(karar.gerekce, IPTAL_ICIN_GEC);
    assert.match(karar.gerekce ?? "", /İade talebi/);
  });
});

describe("kapanmış siparişlerde talep açılmaz", () => {
  test("cancelled: her iki tür de reddedilir", () => {
    for (const tur of ["cancel", "refund"] as const) {
      const karar = talepAcilabilirMi("cancelled", tur);

      assert.equal(karar.izinli, false);
      assert.equal(karar.gerekce, SIPARIS_IPTAL_EDILMIS);
    }
  });

  test("failed: her iki tür de reddedilir", () => {
    for (const tur of ["cancel", "refund"] as const) {
      const karar = talepAcilabilirMi("failed", tur);

      assert.equal(karar.izinli, false);
      assert.equal(karar.gerekce, SIPARIS_BASARISIZ);
    }
  });
});

describe("karar tablosu eksiksizdir", () => {
  test("her durum ve tür için karar tanımlıdır", () => {
    for (const durum of TUM_DURUMLAR) {
      for (const tur of ["cancel", "refund"] as const) {
        const karar = talepAcilabilirMi(durum, tur);

        assert.equal(
          typeof karar.izinli,
          "boolean",
          `${durum}/${tur} kararsız`
        );
      }
    }
  });

  test("izin verilmeyen her kombinasyonda gerekçe vardır", () => {
    for (const durum of TUM_DURUMLAR) {
      for (const tur of ["cancel", "refund"] as const) {
        const karar = talepAcilabilirMi(durum, tur);

        if (!karar.izinli) {
          assert.ok(karar.gerekce, `${durum}/${tur} gerekçesiz`);
        }
      }
    }
  });

  test("her durumda en fazla bir tür açılabilir", () => {
    // İki türün aynı anda açılabilir olması müşteriyi yanıltırdı.
    for (const durum of TUM_DURUMLAR) {
      const acik = (["cancel", "refund"] as const).filter(
        (tur) => talepAcilabilirMi(durum, tur).izinli
      );

      assert.ok(acik.length <= 1, `${durum} için ${acik.length} tür açık`);
    }
  });
});

describe("gerekçe doğrulaması", () => {
  test("yeterli uzunluktaki gerekçe kabul edilir", () => {
    const metin = "Yanlış ürün sipariş ettim.";

    assert.equal(gerekceDogrula(metin), metin);
  });

  test("kısa gerekçe reddedilir", () => {
    assert.throws(() => gerekceDogrula("kısa"), /en az/i);
    assert.throws(() => gerekceDogrula(""), /en az/i);
  });

  test("metin olmayan değer reddedilir", () => {
    assert.throws(() => gerekceDogrula(null), /en az/i);
    assert.throws(() => gerekceDogrula(12345678901), /en az/i);
    assert.throws(() => gerekceDogrula({ gerekce: "uzun bir metin" }), /en az/i);
  });

  test("baştaki ve sondaki boşluklar kırpılır", () => {
    assert.equal(
      gerekceDogrula("   Ürün hasarlı geldi.   "),
      "Ürün hasarlı geldi."
    );
  });

  test("yalnızca boşluktan oluşan gerekçe reddedilir", () => {
    assert.throws(() => gerekceDogrula("               "), /en az/i);
  });

  test("çok uzun gerekçe kırpılır", () => {
    const uzun = "a".repeat(GEREKCE_EN_FAZLA + 500);

    assert.equal(gerekceDogrula(uzun).length, GEREKCE_EN_FAZLA);
  });

  test("sınırdaki gerekçe kabul edilir", () => {
    const tamSinir = "b".repeat(GEREKCE_EN_AZ);

    assert.equal(gerekceDogrula(tamSinir), tamSinir);
  });
});
