import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { zipOku } from "../helpers/zip-okuyucu.mts";

/**
 * Baskıcı QR paketi — içerik ve sızıntı testleri.
 *
 * Bu paket ARKVIUM DIŞINA çıkar. Testlerin ağırlığı "ne var" değil,
 * "ne YOK" tarafındadır: aktivasyon kodu, kişisel veri, sipariş bilgisi
 * ve oturum verisi pakete hiçbir katmanda giremez.
 *
 * Veritabanına yazılmaz; tüm veriler sentetiktir.
 */

const paket = await import(
  pathToFileURL(resolve("src/lib/baskici-paketi.ts")).href
);

const {
  baskiciPaketiOlustur,
  csvUret,
  csvHucresi,
  svgDosyaAdi,
  paketDosyaAdi,
  CSV_DOSYA_ADI,
  CSV_SUTUNLARI,
} = paket;

/** Sentetik aktivasyon kodları — pakette ASLA görünmemeli. */
const SENTETIK_AKTIVASYON = ["QQQQ-WWWW-EEEE", "RRRR-TTTT-YYYY"];

/** Sentetik kişisel veriler — pakette ASLA görünmemeli. */
const SENTETIK_KISISEL = [
  "musteri@ornek.test",
  "05551112233",
  "Ahmet Yılmaz",
  "ARK-2026-DENEME",
  "Örnek Mahallesi 1. Sokak",
  "arkvium_user_session",
  "cmtg6711r0002abpmgiet0e5s",
  "/admin",
];

const ETIKETLER = [
  {
    etiketKodu: "ARK-AAAA-BBBB",
    qrAdresi: "https://ornek.test/t/TOKEN_BIR",
    qrSvg: '<svg viewBox="0 0 45 45"><rect fill="#ffffff"/></svg>',
  },
  {
    etiketKodu: "ARK-CCCC-DDDD",
    qrAdresi: "https://ornek.test/t/TOKEN_IKI",
    qrSvg: '<svg viewBox="0 0 45 45"><rect fill="#ffffff"/></svg>',
  },
  {
    etiketKodu: "ARK-EEEE-FFFF",
    qrAdresi: "https://ornek.test/t/TOKEN_UC",
    qrSvg: '<svg viewBox="0 0 45 45"><rect fill="#ffffff"/></svg>',
  },
];

const URUN_ADI = "Evcil Hayvan QR Künyesi";

describe("baskıcı paketi — ZIP yapısı", () => {
  test("ZIP doğru sayıda SVG ve tek CSV içerir", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));

    const svgler = dosyalar.filter((d) => d.ad.endsWith(".svg"));
    const csvler = dosyalar.filter((d) => d.ad.endsWith(".csv"));

    assert.equal(svgler.length, ETIKETLER.length);
    assert.equal(csvler.length, 1);
    assert.equal(dosyalar.length, ETIKETLER.length + 1);
  });

  test("SVG dosya adı yalnızca etiket kodundan oluşur", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));

    for (const etiket of ETIKETLER) {
      assert.ok(
        dosyalar.some((d) => d.ad === `${etiket.etiketKodu}.svg`),
        `${etiket.etiketKodu}.svg arşivde yok`
      );
    }
  });

  test("CSV dosya adı sabittir", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));

    assert.ok(dosyalar.some((d) => d.ad === CSV_DOSYA_ADI));
    assert.equal(CSV_DOSYA_ADI, "baskici-listesi.csv");
  });

  test("arşivde başka hiçbir dosya bulunmaz", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));

    for (const dosya of dosyalar) {
      assert.ok(
        dosya.ad.endsWith(".svg") || dosya.ad === CSV_DOSYA_ADI,
        `beklenmeyen dosya: ${dosya.ad}`
      );
    }
  });

  test("etiket yoksa paket üretilmez", () => {
    assert.throws(() => baskiciPaketiOlustur([], URUN_ADI));
  });
});

describe("baskıcı paketi — CSV", () => {
  test("yalnızca belirtilen dört sütun bulunur", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));
    const csv = dosyalar.find((d) => d.ad === CSV_DOSYA_ADI)!;

    const metin = csv.icerik.toString("utf8").replace(/^﻿/, "");
    const baslik = metin.split("\r\n")[0];

    assert.deepEqual(baslik.split(";"), [
      "urun",
      "etiket_kodu",
      "qr_adresi",
      "qr_dosyasi",
    ]);
    assert.deepEqual([...CSV_SUTUNLARI], baslik.split(";"));
  });

  test("her etiket için tam bir satır yazılır", () => {
    const metin = csvUret(ETIKETLER, URUN_ADI).replace(/^﻿/, "");
    const satirlar = metin.trim().split("\r\n");

    assert.equal(satirlar.length, ETIKETLER.length + 1);
  });

  test("Türkçe ürün adı bozulmadan yazılır ve BOM ile başlar", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));
    const csv = dosyalar.find((d) => d.ad === CSV_DOSYA_ADI)!;
    const metin = csv.icerik.toString("utf8");

    // BOM olmadan Excel UTF-8'i Windows-1252 sanıp Türkçe harfleri bozuyor.
    assert.ok(metin.startsWith("﻿"), "CSV BOM ile başlamalı");
    assert.ok(metin.includes("Evcil Hayvan QR Künyesi"));
    assert.ok(!metin.includes("KÃ¼nye"), "Türkçe karakter bozulmuş");
  });

  test("formül enjeksiyonu etkisizleştirilir", () => {
    for (const tehlikeli of ["=1+1", "+cmd", "-2", "@SUM(A1)", "\tzararli"]) {
      const hucre = csvHucresi(tehlikeli);

      assert.ok(
        hucre.startsWith(`"'`),
        `${JSON.stringify(tehlikeli)} tek tırnakla kaçırılmalıydı: ${hucre}`
      );
    }
  });

  test("zararsız değer tırnak öneki almaz", () => {
    assert.equal(csvHucresi("ARK-AAAA-BBBB"), '"ARK-AAAA-BBBB"');
  });

  test("içteki tırnak ikilenir", () => {
    assert.equal(csvHucresi('a"b'), '"a""b"');
  });

  test("formül enjeksiyonu ürün adı üzerinden de geçemez", () => {
    const metin = csvUret(ETIKETLER, "=HYPERLINK(\"http://kotu\")");

    assert.ok(metin.includes(`"'=HYPERLINK`), "ürün adı kaçırılmalıydı");
  });
});

describe("baskıcı paketi — sızıntı denetimi", () => {
  /** Arşivin TAMAMINI (içerik + dosya adları + ham baytlar) tarar. */
  function paketiTara() {
    const zip = baskiciPaketiOlustur(ETIKETLER, URUN_ADI);
    const dosyalar = zipOku(zip);

    return {
      hamZip: zip.toString("latin1"),
      dosyaAdlari: dosyalar.map((d) => d.ad).join("\n"),
      icerikler: dosyalar.map((d) => d.icerik.toString("utf8")).join("\n"),
      dosyalar,
    };
  }

  test("aktivasyon kodu hiçbir katmanda bulunmaz", () => {
    const { hamZip, dosyaAdlari, icerikler } = paketiTara();

    for (const kod of SENTETIK_AKTIVASYON) {
      assert.ok(!icerikler.includes(kod), `içerikte aktivasyon kodu: ${kod}`);
      assert.ok(!dosyaAdlari.includes(kod), `dosya adında: ${kod}`);
      assert.ok(!hamZip.includes(kod), `ham ZIP baytlarında: ${kod}`);
    }
  });

  test("kişisel veri, sipariş ve oturum bilgisi bulunmaz", () => {
    const { hamZip, dosyaAdlari, icerikler } = paketiTara();

    for (const deger of SENTETIK_KISISEL) {
      assert.ok(!icerikler.includes(deger), `içerikte sızıntı: ${deger}`);
      assert.ok(!dosyaAdlari.includes(deger), `dosya adında sızıntı: ${deger}`);
      assert.ok(!hamZip.includes(deger), `ham ZIP'te sızıntı: ${deger}`);
    }
  });

  test("arşiv metadata'sı üretim zamanını sızdırmaz", () => {
    const { dosyalar } = paketiTara();

    // Tüm girdiler sabit ZIP çağı damgasını taşır (1980-01-01 00:00).
    for (const dosya of dosyalar) {
      assert.equal(dosya.tarih, 0x0021, `${dosya.ad} tarihi sabit değil`);
      assert.equal(dosya.saat, 0x0000, `${dosya.ad} saati sabit değil`);
    }
  });

  test("aynı girdi her zaman aynı arşivi üretir", () => {
    const a = baskiciPaketiOlustur(ETIKETLER, URUN_ADI);
    const b = baskiciPaketiOlustur(ETIKETLER, URUN_ADI);

    assert.ok(a.equals(b), "arşiv yeniden üretilebilir değil");
  });

  test("indirilen dosya adı kimlik veya kişisel veri taşımaz", () => {
    const ad = paketDosyaAdi("evcil-hayvan-kunyesi", 3);

    assert.equal(ad, "arkvium-baskici-evcil-hayvan-kunyesi-3.zip");

    for (const deger of [...SENTETIK_AKTIVASYON, ...SENTETIK_KISISEL]) {
      assert.ok(!ad.includes(deger));
    }
  });
});

describe("baskıcı paketi — SVG eşleşmesi", () => {
  test("her SVG kendi etiketinin dosyasına yazılır", () => {
    const isaretli = ETIKETLER.map((etiket, sira) => ({
      ...etiket,
      qrSvg: `<svg data-sira="${sira}"></svg>`,
    }));

    const dosyalar = zipOku(baskiciPaketiOlustur(isaretli, URUN_ADI));

    isaretli.forEach((etiket, sira) => {
      const dosya = dosyalar.find((d) => d.ad === `${etiket.etiketKodu}.svg`)!;

      assert.equal(dosya.icerik.toString("utf8"), `<svg data-sira="${sira}"></svg>`);
    });
  });

  test("CSV'deki qr_dosyasi sütunu arşivdeki dosya adıyla eşleşir", () => {
    const dosyalar = zipOku(baskiciPaketiOlustur(ETIKETLER, URUN_ADI));
    const csv = dosyalar
      .find((d) => d.ad === CSV_DOSYA_ADI)!
      .icerik.toString("utf8")
      .replace(/^﻿/, "");

    const satirlar = csv.trim().split("\r\n").slice(1);

    satirlar.forEach((satir) => {
      const alanlar = satir.split(";").map((a) => a.replace(/^"|"$/g, ""));
      const [, etiketKodu, qrAdresi, qrDosyasi] = alanlar;

      assert.ok(
        dosyalar.some((d) => d.ad === qrDosyasi),
        `${qrDosyasi} arşivde yok`
      );
      assert.equal(qrDosyasi, `${etiketKodu}.svg`);

      const kaynak = ETIKETLER.find((e) => e.etiketKodu === etiketKodu)!;
      assert.equal(qrAdresi, kaynak.qrAdresi);
    });
  });

  test("dosya adı üretimi yol kaçışını engeller", () => {
    assert.equal(svgDosyaAdi("../../etc/passwd"), "ETCPASSWD.svg");
    assert.throws(() => svgDosyaAdi("../"));
  });
});
