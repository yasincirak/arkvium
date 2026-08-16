import assert from "node:assert/strict";
import { describe, test } from "node:test";

const { whatsappNumarasi, whatsappBaglantisi } = await import(
  "../../src/lib/telefon.ts"
);

describe("WhatsApp numarası normalleştirme", () => {
  test("yerel biçim ülke koduna çevrilir", () => {
    assert.equal(whatsappNumarasi("05551112233"), "905551112233");
    assert.equal(whatsappNumarasi("0555 111 22 33"), "905551112233");
    assert.equal(whatsappNumarasi("0555-111-22-33"), "905551112233");
  });

  test("ülke kodlu yazımlar korunur", () => {
    assert.equal(whatsappNumarasi("+90 555 111 22 33"), "905551112233");
    assert.equal(whatsappNumarasi("905551112233"), "905551112233");
    assert.equal(whatsappNumarasi("00905551112233"), "905551112233");
  });

  test("baştaki sıfır olmadan girilen numara tamamlanır", () => {
    assert.equal(whatsappNumarasi("5551112233"), "905551112233");
  });

  test("sabit hat numarası da çevrilir", () => {
    assert.equal(whatsappNumarasi("02121234567"), "902121234567");
  });

  test("yabancı numaralar olduğu gibi kalır", () => {
    // 00 öneki atılır, ülke kodu değiştirilmez.
    assert.equal(whatsappNumarasi("0049 170 1234567"), "491701234567");
  });

  test("çözülemeyen girdilerde null döner", () => {
    for (const girdi of [
      "",
      "   ",
      null,
      undefined,
      "telefon yok",
      "123456", // çok kısa
      "0" + "9".repeat(20), // çok uzun
    ]) {
      assert.equal(whatsappNumarasi(girdi), null, `null beklenirdi: ${girdi}`);
    }
  });

  test("sonuç yalnızca rakam içerir", () => {
    assert.match(whatsappNumarasi("+90 (555) 111-22-33") ?? "", /^\d+$/);
  });
});

describe("WhatsApp bağlantısı", () => {
  test("wa.me adresi üretir", () => {
    assert.equal(
      whatsappBaglantisi("0555 111 22 33"),
      "https://wa.me/905551112233"
    );
  });

  test("mesaj metni adres olarak kodlanır", () => {
    const baglanti = whatsappBaglantisi("05551112233", "Merhaba, eşyam için");

    assert.ok(baglanti?.startsWith("https://wa.me/905551112233?text="));
    // Boşluk ve Türkçe karakterler ham hâlde adrese girmemeli.
    assert.doesNotMatch(baglanti ?? "", /[ şğıçöü]/);
  });

  test("numara çözülemezse bağlantı üretilmez", () => {
    assert.equal(whatsappBaglantisi("telefon yok"), null);
    assert.equal(whatsappBaglantisi(null), null);
  });
});
