import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * `Accept-Language` başlığından dil seçimi.
 *
 * REGRESYON: `Accept-Language: *` bir dil TERCİHİ değildir. RFC 9110'da
 * joker "herhangi bir dil olur" anlamına gelir. Önceki sürüm jokeri
 * "Türkçe değil" sayıp İngilizceye düşüyordu; tercih belirtmeyen her
 * istemci (bazı botlar, HTTP kütüphaneleri, Node'un kendi `fetch`i)
 * varsayılan Türkçe yerine İngilizce sayfa alıyordu.
 */

const { tarayiciDili, VARSAYILAN_DIL } = await import(
  "../../src/lib/i18n/diller.ts"
);

describe("varsayılana düşen durumlar", () => {
  test("başlık yoksa varsayılan dil kullanılır", () => {
    assert.equal(tarayiciDili(null), VARSAYILAN_DIL);
    assert.equal(tarayiciDili(""), VARSAYILAN_DIL);
  });

  test("REGRESYON: yalnızca joker varsa varsayılan dil kullanılır", () => {
    assert.equal(tarayiciDili("*"), VARSAYILAN_DIL);
    assert.equal(tarayiciDili("*;q=0.5"), VARSAYILAN_DIL);
  });

  test("varsayılan dil Türkçedir", () => {
    assert.equal(VARSAYILAN_DIL, "tr");
  });
});

describe("gerçek dil tercihleri", () => {
  test("Türkçe tercihi Türkçe verir", () => {
    assert.equal(tarayiciDili("tr"), "tr");
    assert.equal(tarayiciDili("tr-TR,tr;q=0.9,en;q=0.8"), "tr");
  });

  test("Türkçe dışındaki diller İngilizceye yönlendirilir", () => {
    assert.equal(tarayiciDili("en-US,en;q=0.9"), "en");
    assert.equal(tarayiciDili("de-DE"), "en");
    assert.equal(tarayiciDili("fr"), "en");
  });

  test("ağırlığı yüksek tercih kazanır", () => {
    assert.equal(tarayiciDili("en;q=0.5,tr;q=0.9"), "tr");
    assert.equal(tarayiciDili("tr;q=0.3,de;q=0.9"), "en");
  });

  test("joker gerçek bir tercihi gölgelemez", () => {
    // Joker en yüksek ağırlıkta olsa bile atlanır; Türkçe tercihi geçerlidir.
    assert.equal(tarayiciDili("*,tr;q=0.9"), "tr");

    // Jokerden sonraki gerçek dil dikkate alınır.
    assert.equal(tarayiciDili("*;q=1.0,de;q=0.9"), "en");
  });
});
