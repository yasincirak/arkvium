import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Sepet hesaplaması.
 *
 * En kritik kural: fiyat istemciden gelmez. Bu dosya, istemcinin gönderdiği
 * fiyat alanının hesaba hiç katılmadığını ve toplamın yalnızca sunucudaki
 * ürün kaynağından üretildiğini doğrular.
 */

const { sepetHesapla, sepetKalemiHesapla } = await import(
  "../../src/lib/sepet.ts"
);

const { SIPARIS_URUNLERI, KARGO_UCRETI_KURUS } = await import(
  "../../src/lib/siparis.ts"
);

const STICKER = SIPARIS_URUNLERI[0];
const ANAHTARLIK = SIPARIS_URUNLERI[2];

describe("sepet kalemi doğrulaması", () => {
  test("geçerli satırda birim fiyat sunucudan okunur", () => {
    const kalem = sepetKalemiHesapla({ kod: STICKER.kod, adet: 2 });

    assert.equal(kalem.kod, STICKER.kod);
    assert.equal(kalem.ad, STICKER.ad);
    assert.equal(kalem.unitPriceKurus, STICKER.fiyatKurus);
    assert.equal(kalem.lineTotalKurus, STICKER.fiyatKurus * 2);
  });

  test("bilinmeyen ürün kodu reddedilir", () => {
    assert.throws(
      () => sepetKalemiHesapla({ kod: "olmayan-urun", adet: 1 }),
      /bulunamadı/i
    );
  });

  test("boş ürün kodu reddedilir", () => {
    assert.throws(() => sepetKalemiHesapla({ kod: "", adet: 1 }), /bulunamadı/i);
  });

  test("sıfır ve negatif adet reddedilir", () => {
    assert.throws(
      () => sepetKalemiHesapla({ kod: STICKER.kod, adet: 0 }),
      /en az 1/i
    );

    assert.throws(
      () => sepetKalemiHesapla({ kod: STICKER.kod, adet: -3 }),
      /en az 1/i
    );
  });

  test("tam sayı olmayan adet reddedilir", () => {
    assert.throws(
      () => sepetKalemiHesapla({ kod: STICKER.kod, adet: 1.5 }),
      /tam sayı/i
    );

    assert.throws(
      () => sepetKalemiHesapla({ kod: STICKER.kod, adet: Number.NaN }),
      /tam sayı/i
    );
  });

  test("aşırı adet reddedilir, taşan tutar üretilmez", () => {
    assert.throws(
      () => sepetKalemiHesapla({ kod: STICKER.kod, adet: 900_000_000 }),
      /çok yüksek/i
    );
  });
});

describe("sepet toplamı", () => {
  test("ara toplam, kargo ve genel toplam sunucuda hesaplanır", () => {
    const sonuc = sepetHesapla([
      { kod: STICKER.kod, adet: 2 },
      { kod: ANAHTARLIK.kod, adet: 1 },
    ]);

    const beklenenAraToplam = STICKER.fiyatKurus * 2 + ANAHTARLIK.fiyatKurus;

    assert.equal(sonuc.subtotalKurus, beklenenAraToplam);
    assert.equal(sonuc.shippingKurus, KARGO_UCRETI_KURUS);
    assert.equal(sonuc.totalKurus, beklenenAraToplam + KARGO_UCRETI_KURUS);
  });

  test("kargo tutarı sabittir ve sepet içeriğinden etkilenmez", () => {
    const tek = sepetHesapla([{ kod: STICKER.kod, adet: 1 }]);
    const cok = sepetHesapla([
      { kod: STICKER.kod, adet: 5 },
      { kod: ANAHTARLIK.kod, adet: 4 },
    ]);

    assert.equal(tek.shippingKurus, KARGO_UCRETI_KURUS);
    assert.equal(cok.shippingKurus, KARGO_UCRETI_KURUS);
  });

  test("toplam her zaman ara toplam + kargo eşitliğini sağlar", () => {
    const sonuc = sepetHesapla([{ kod: ANAHTARLIK.kod, adet: 3 }]);

    assert.equal(
      sonuc.totalKurus,
      sonuc.subtotalKurus + sonuc.shippingKurus,
      "veritabanındaki CHECK kısıtıyla aynı kural"
    );
  });

  test("istemciden gelen fiyat alanı yok sayılır", () => {
    const sonuc = sepetHesapla([
      // Kasıtlı olarak sahte fiyat alanları gönderiliyor.
      {
        kod: STICKER.kod,
        adet: 1,
        unitPriceKurus: 1,
        lineTotalKurus: 1,
        fiyatKurus: 1,
      } as never,
    ]);

    assert.equal(sonuc.kalemler[0].unitPriceKurus, STICKER.fiyatKurus);
    assert.equal(sonuc.subtotalKurus, STICKER.fiyatKurus);
    assert.equal(
      sonuc.totalKurus,
      STICKER.fiyatKurus + KARGO_UCRETI_KURUS,
      "toplam istemci verisinden etkilenmemeli"
    );
  });

  test("aynı ürün iki satırda gelirse tek kalemde birleşir", () => {
    const sonuc = sepetHesapla([
      { kod: STICKER.kod, adet: 2 },
      { kod: STICKER.kod, adet: 3 },
    ]);

    assert.equal(sonuc.kalemler.length, 1);
    assert.equal(sonuc.kalemler[0].adet, 5);
    assert.equal(sonuc.subtotalKurus, STICKER.fiyatKurus * 5);
  });

  test("boş sepet reddedilir", () => {
    assert.throws(() => sepetHesapla([]), /boş/i);
  });

  test("sepetteki tek geçersiz satır tüm hesabı durdurur", () => {
    assert.throws(
      () =>
        sepetHesapla([
          { kod: STICKER.kod, adet: 1 },
          { kod: "olmayan-urun", adet: 1 },
        ]),
      /bulunamadı/i
    );
  });
});
