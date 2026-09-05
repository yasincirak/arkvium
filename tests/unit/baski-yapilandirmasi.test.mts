import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Ürün türüne göre baskı davranışı.
 *
 * Bu tablo yanlış olursa sonucu geri alınamaz: yanlış ölçüde basılmış
 * binlerce etiket. Bu yüzden her ürün için karar tek tek doğrulanır ve
 * bilinmeyen ürünün ASLA 30x30 mm çıktı üretmediği ayrıca sınanır.
 */

const { baskiYapilandirmasi, baskiciPaketiUretilebilirMi, etiketYazdirmaVarMi } =
  await import("../../src/lib/baski-yapilandirmasi.ts");

const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");

describe("3'lü QR Sticker Seti", () => {
  test("30×30 mm yazdırma sayfası sunulur", () => {
    assert.equal(etiketYazdirmaVarMi("sticker-seti"), true);
    assert.equal(baskiYapilandirmasi("sticker-seti").tur, "etiket-30");
  });

  test("baskıcı ZIP paketi sunulmaz", () => {
    assert.equal(baskiciPaketiUretilebilirMi("sticker-seti"), false);
  });
});

describe("Araç İletişim QR Sticker'ı", () => {
  test("30×30 mm yazdırma düğmesi gösterilmez", () => {
    assert.equal(etiketYazdirmaVarMi("arac-stickeri"), false);
  });

  test("baskıcı ZIP paketi sunulur", () => {
    assert.equal(baskiciPaketiUretilebilirMi("arac-stickeri"), true);
    assert.equal(baskiYapilandirmasi("arac-stickeri").tur, "baskici-arac");
  });
});

describe("ölçüsü tanımlanmamış ürünler", () => {
  const TANIMSIZLAR = [
    "metal-anahtarlik",
    "evcil-hayvan-kunyesi",
    "valiz-etiketi",
  ];

  for (const kod of TANIMSIZLAR) {
    test(`${kod}: hiçbir baskı çıktısı sunulmaz`, () => {
      const yapilandirma = baskiYapilandirmasi(kod);

      assert.equal(yapilandirma.tur, "tanimsiz");
      assert.equal(yapilandirma.etiketYazdirma, false);
      assert.equal(yapilandirma.baskiciPaketi, false);
    });

    test(`${kod}: açıklama "tanımlanmadı" bilgisini taşır`, () => {
      assert.match(baskiYapilandirmasi(kod).aciklama, /tanımlanmadı/i);
    });
  }
});

describe("güvenli varsayılan", () => {
  test("bilinmeyen ürün kodu 30×30 mm üretmez", () => {
    for (const kod of [
      "olmayan-urun",
      "",
      "   ",
      "STICKER-SETI",
      "sticker seti",
    ]) {
      const yapilandirma = baskiYapilandirmasi(kod);

      assert.equal(
        yapilandirma.etiketYazdirma,
        false,
        `beklenmedik etiket baskısı: ${kod}`
      );
      assert.equal(yapilandirma.baskiciPaketi, false);
    }
  });

  test("null ve undefined güvenli varsayılana düşer", () => {
    assert.equal(baskiYapilandirmasi(null).tur, "tanimsiz");
    assert.equal(baskiYapilandirmasi(undefined).tur, "tanimsiz");
  });
});

describe("katalog ile tutarlılık", () => {
  test("satılan her ürünün bir baskı kararı vardır", () => {
    for (const urun of SIPARIS_URUNLERI) {
      const yapilandirma = baskiYapilandirmasi(urun.kod);

      assert.ok(
        ["etiket-30", "baskici-arac", "tanimsiz"].includes(yapilandirma.tur),
        `${urun.kod} için geçersiz baskı türü`
      );
    }
  });

  test("aynı anda hem etiket hem paket sunan ürün yoktur", () => {
    for (const urun of SIPARIS_URUNLERI) {
      const y = baskiYapilandirmasi(urun.kod);

      assert.ok(
        !(y.etiketYazdirma && y.baskiciPaketi),
        `${urun.kod} iki baskı yolu birden sunuyor`
      );
    }
  });
});
