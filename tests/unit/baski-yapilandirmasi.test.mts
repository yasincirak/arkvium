import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Ürün türüne göre baskı davranışı.
 *
 * Bu tablo yanlış olursa sonucu geri alınamaz: yanlış ölçüde basılmış
 * binlerce etiket. Bu yüzden her ürün için karar tek tek doğrulanır ve
 * bilinmeyen ürünün ASLA 30x30 mm çıktı üretmediği ayrıca sınanır.
 */

const {
  baskiYapilandirmasi,
  baskiciAyariAl,
  baskiciPaketiOlanUrunler,
  baskiciPaketiUretilebilirMi,
  etiketYazdirmaVarMi,
} = await import("../../src/lib/baski-yapilandirmasi.ts");

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
    assert.equal(baskiYapilandirmasi("arac-stickeri").tur, "baskici-paketi");
  });
});

describe("metal ürünler — baskıcı paketi", () => {
  const OLCULER: Record<string, { qrMm: number; govde: string }> = {
    "metal-anahtarlik": { qrMm: 20, govde: "30 x 30 mm" },
    "evcil-hayvan-kunyesi": { qrMm: 18, govde: "Ø30 mm (yuvarlak)" },
    "valiz-etiketi": { qrMm: 25, govde: "60 x 40 mm" },
  };

  for (const [kod, beklenen] of Object.entries(OLCULER)) {
    test(`${kod}: baskıcı paketi sunulur, 30×30 mm sayfası sunulmaz`, () => {
      const yapilandirma = baskiYapilandirmasi(kod);

      assert.equal(yapilandirma.tur, "baskici-paketi");
      assert.equal(yapilandirma.baskiciPaketi, true);
      assert.equal(
        yapilandirma.etiketYazdirma,
        false,
        "metal üründe A4 etiket sayfası çıkmamalı"
      );
    });

    test(`${kod}: QR ölçüsü ${beklenen.qrMm} mm ve gövde doğru`, () => {
      const ayar = baskiciAyariAl(kod);

      assert.ok(ayar, "ayar tanımlı olmalı");
      assert.equal(ayar.qrMm, beklenen.qrMm);
      assert.equal(ayar.govde, beklenen.govde);
      assert.match(ayar.yontem, /LAZER KAZIMA/);
    });

    test(`${kod}: 4 modül sessiz alan fiziksel sınırı karşılar`, () => {
      const ayar = baskiciAyariAl(kod)!;

      // 45 modül = 37 veri + 2x4 sessiz alan (sürüm 5 QR).
      const sessizMm = (ayar.qrMm / 45) * 4;

      assert.ok(
        sessizMm >= ayar.enAzSessizAlanMm,
        `${kod}: sessiz alan ${sessizMm.toFixed(2)} mm, sınır ${ayar.enAzSessizAlanMm} mm`
      );
    });
  }

  test("araç ürünü değişmedi", () => {
    const ayar = baskiciAyariAl("arac-stickeri");

    assert.equal(ayar?.qrMm, 40);
    assert.equal(ayar?.govde, "60 x 80 mm, dikey");
  });

  test("30×30 mm sticker seti baskıcı paketi almaz", () => {
    assert.equal(baskiciPaketiUretilebilirMi("sticker-seti"), false);
    assert.equal(baskiciAyariAl("sticker-seti"), null);
  });
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
        ["etiket-30", "baskici-paketi", "tanimsiz"].includes(yapilandirma.tur),
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

describe("paketli ürün listesi", () => {
  test("dört ürün baskıcı paketi sunar", () => {
    assert.deepEqual(baskiciPaketiOlanUrunler().sort(), [
      "arac-stickeri",
      "evcil-hayvan-kunyesi",
      "metal-anahtarlik",
      "valiz-etiketi",
    ]);
  });

  test("paketi olan her ürünün ölçüsü tanımlıdır", () => {
    for (const kod of baskiciPaketiOlanUrunler()) {
      const ayar = baskiciAyariAl(kod);

      assert.ok(ayar && ayar.qrMm > 0, `${kod} için ölçü yok`);
    }
  });
});
