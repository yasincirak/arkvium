import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * 30x30 mm etiket baskısının ölçü testleri.
 *
 * Bu değerler fiziksel dünyaya bakar: yanlış bir sayı, basılıp kesilmiş ve
 * geri döndürülemeyen binlerce etiket demektir. Test, ölçülerin sessizce
 * bozulmasını engeller.
 */

const olculer = await import(
  pathToFileURL(resolve("src/components/admin/EtiketBaskiOlculeri.ts")).href
);

const {
  ETIKET_MM,
  SESSIZ_ALAN_MODUL,
  TOPLAM_MODUL,
  YERLESIM,
  dikeyToplamMm,
  modulBoyutuMm,
  sessizAlanMm,
  yerlesimAl,
  ETIKET_SUTUN,
  ETIKET_SATIR,
  ETIKET_ARALIK_MM,
  KART_EN_MM,
  KART_BOY_MM,
  KART_SUTUN,
  KART_SATIR,
  KART_ARALIK_MM,
  A4_KULLANILABILIR_EN_MM,
  A4_KULLANILABILIR_BOY_MM,
  izgaraEnMm,
  izgaraBoyMm,
} = olculer;

/**
 * Telefon kamerasının basılı bir QR'ı güvenle okuyabildiği pratik alt sınır.
 * Bunun altına inen bir modül boyutu okuma hatalarına yol açar.
 */
const EN_KUCUK_MODUL_MM = 0.4;

describe("30x30 mm etiket ölçüleri", () => {
  test("nihai etiket ölçüsü tam 30 mm", () => {
    assert.equal(ETIKET_MM, 30);
  });

  for (const kodGoster of [false, true]) {
    const ad = kodGoster ? "etiket kodlu" : "etiket kodsuz";

    test(`${ad} düzen 30 mm'yi aşmıyor`, () => {
      const toplam = dikeyToplamMm(kodGoster);

      assert.ok(
        toplam <= ETIKET_MM,
        `dikey toplam ${toplam.toFixed(2)} mm, 30 mm'yi aşıyor`
      );
    });

    test(`${ad} düzende QR etikete sığıyor`, () => {
      const y = yerlesimAl(kodGoster);

      assert.ok(
        y.qrKutuMm <= ETIKET_MM,
        `QR kutusu ${y.qrKutuMm} mm, etiketten büyük`
      );
    });

    test(`${ad} düzende modül boyutu okunabilir sınırın üstünde`, () => {
      const modul = modulBoyutuMm(kodGoster);

      assert.ok(
        modul >= EN_KUCUK_MODUL_MM,
        `modül ${modul.toFixed(3)} mm, ${EN_KUCUK_MODUL_MM} mm sınırının altında`
      );
    });

    test(`${ad} düzende sessiz alan 4 modül`, () => {
      const beklenen = modulBoyutuMm(kodGoster) * SESSIZ_ALAN_MODUL;

      assert.ok(Math.abs(sessizAlanMm(kodGoster) - beklenen) < 1e-9);
    });
  }

  test("kodsuz düzendeki QR, kodlu düzendekinden büyük", () => {
    assert.ok(
      YERLESIM.kodsuz.qrKutuMm > YERLESIM.kodlu.qrKutuMm,
      "etiket kodu kaldırıldığında QR büyümeli"
    );
  });

  test("sessiz alan QR standardının gerektirdiği 4 modül", () => {
    assert.equal(SESSIZ_ALAN_MODUL, 4);
  });

  test("toplam modül sayısı sürüm 5 QR + iki yanda sessiz alan", () => {
    assert.equal(TOPLAM_MODUL, 37 + 4 * 2);
  });

  test("etiketin ön yüzünde aktivasyon kodu için satır tanımlı değil", () => {
    // Yerleşimde yalnızca ARKVIUM ve (isteğe bağlı) etiket kodu satırı var.
    for (const anahtar of ["kodsuz", "kodlu"] as const) {
      const alanlar = Object.keys(YERLESIM[anahtar]);

      assert.ok(
        !alanlar.some((alan) => /aktivasyon/i.test(alan)),
        "yerleşimde aktivasyon kodu satırı bulunmamalı"
      );
    }
  });
});

describe("A4 yerleşimi", () => {
  test("etiket ızgarası A4 genişliğine sığıyor", () => {
    const en = izgaraEnMm(ETIKET_SUTUN, ETIKET_MM, ETIKET_ARALIK_MM);

    assert.ok(
      en <= A4_KULLANILABILIR_EN_MM,
      `ızgara ${en} mm, kullanılabilir ${A4_KULLANILABILIR_EN_MM} mm`
    );
  });

  test("etiket ızgarası A4 yüksekliğine sığıyor", () => {
    const boy = izgaraBoyMm(ETIKET_SATIR, ETIKET_MM, ETIKET_ARALIK_MM);

    assert.ok(
      boy <= A4_KULLANILABILIR_BOY_MM,
      `ızgara ${boy} mm, kullanılabilir ${A4_KULLANILABILIR_BOY_MM} mm`
    );
  });

  test("kart ızgarası A4 genişliğine sığıyor", () => {
    const en = izgaraEnMm(KART_SUTUN, KART_EN_MM, KART_ARALIK_MM);

    assert.ok(en <= A4_KULLANILABILIR_EN_MM, `ızgara ${en} mm`);
  });

  test("kart ızgarası A4 yüksekliğine sığıyor", () => {
    const boy = izgaraBoyMm(KART_SATIR, KART_BOY_MM, KART_ARALIK_MM);

    assert.ok(boy <= A4_KULLANILABILIR_BOY_MM, `ızgara ${boy} mm`);
  });

  test("etiketler arasında kesim payı var", () => {
    assert.ok(ETIKET_ARALIK_MM > 0, "aralık olmadan kesim yapılamaz");
  });
});
