import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Sipariş iptal kuralları — saf karar tablosu.
 *
 * Her sipariş durumu için izin verilen ve reddedilen davranış BURADA
 * tek tek doğrulanır. Veritabanı gerekmez; karar mantığı saf
 * fonksiyondadır.
 *
 * EN KRİTİK KURAL: Kargoya verilmiş sipariş normal iptal gibi
 * işlenmez ve stoğu geri döndürmez — etiketler fiziksel olarak
 * müşteriye gitmiştir.
 */

const {
  iptalDavranisi,
  KARGOYA_VERILMIS,
  ZATEN_IPTAL,
  ODEME_BASARISIZ_IPTAL,
} = await import("../../src/lib/siparis-iptal-kurallari.ts");

describe("iptal edilebilen durumlar", () => {
  test("pending: iptal edilir, stok döner, para iadesi GEREKMEZ", () => {
    const d = iptalDavranisi("pending");

    assert.equal(d.izinli, true);
    assert.equal(d.stokGeriDoner, true);
    assert.equal(d.paraIadesiGerekir, false, "para hiç alınmadı");
  });

  test("paid: iptal edilir, stok döner, para iadesi GEREKİR", () => {
    const d = iptalDavranisi("paid");

    assert.equal(d.izinli, true);
    assert.equal(d.stokGeriDoner, true);
    assert.equal(d.paraIadesiGerekir, true);
  });

  test("preparing: iptal edilir, stok döner, para iadesi GEREKİR", () => {
    const d = iptalDavranisi("preparing");

    assert.equal(d.izinli, true);
    assert.equal(d.stokGeriDoner, true);
    assert.equal(d.paraIadesiGerekir, true);
  });
});

describe("iptal edilemeyen durumlar", () => {
  test("shipped: REDDEDİLİR ve iade talebine yönlendirir", () => {
    const d = iptalDavranisi("shipped");

    assert.equal(d.izinli, false);
    assert.equal(d.stokGeriDoner, false, "etiketler müşteriye gitti");
    assert.equal(d.gerekce, KARGOYA_VERILMIS);
    assert.match(d.gerekce ?? "", /iade talebi/i);
  });

  test("cancelled: REDDEDİLİR (çift iptal engellenir)", () => {
    const d = iptalDavranisi("cancelled");

    assert.equal(d.izinli, false);
    assert.equal(d.stokGeriDoner, false);
    assert.equal(d.gerekce, ZATEN_IPTAL);
  });

  test("failed: REDDEDİLİR (sipariş zaten geçerli değil)", () => {
    const d = iptalDavranisi("failed");

    assert.equal(d.izinli, false);
    assert.equal(d.stokGeriDoner, false);
    assert.equal(d.gerekce, ODEME_BASARISIZ_IPTAL);
  });
});

describe("karar tablosu eksiksizdir", () => {
  const TUM_DURUMLAR = [
    "pending",
    "paid",
    "preparing",
    "shipped",
    "cancelled",
    "failed",
  ] as const;

  test("her sipariş durumu için karar tanımlıdır", () => {
    /*
      Yeni bir sipariş durumu eklenirse bu test derlenmez veya düşer;
      karar sessizce "izinli" sayılmaz.
    */
    for (const durum of TUM_DURUMLAR) {
      const d = iptalDavranisi(durum);

      assert.equal(typeof d.izinli, "boolean", `${durum} kararsız`);
      assert.equal(typeof d.stokGeriDoner, "boolean");
      assert.equal(typeof d.paraIadesiGerekir, "boolean");
    }
  });

  test("izin verilmeyen her durumda gerekçe vardır", () => {
    for (const durum of TUM_DURUMLAR) {
      const d = iptalDavranisi(durum);

      if (!d.izinli) {
        assert.ok(d.gerekce, `${durum} için gerekçe yazılmalı`);
      }
    }
  });

  test("izin verilmeyen hiçbir durumda stok geri dönmez", () => {
    for (const durum of TUM_DURUMLAR) {
      const d = iptalDavranisi(durum);

      if (!d.izinli) {
        assert.equal(d.stokGeriDoner, false, `${durum}`);
      }
    }
  });

  test("para hiç alınmamışsa iade gerekmez", () => {
    // Ödeme öncesi ve ödemesi başarısız durumlarda iade söz konusu değil.
    assert.equal(iptalDavranisi("pending").paraIadesiGerekir, false);
    assert.equal(iptalDavranisi("failed").paraIadesiGerekir, false);
  });
});
