import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Analitik tarih filtreleri.
 *
 * Doğrulanan kurallar:
 *  - "Bugün", "7 gün" ve "30 gün" aralıkları Türkiye saatine göre gün
 *    başlangıcından başlar ve yarının başında biter.
 *  - Özel aralıkta bitiş günü DÂHİLDİR.
 *  - Geçersiz veya kötü niyetli parametre sessizce varsayılana düşer;
 *    hata fırlatmaz ve sınırsız sorgu üretmez.
 */

const {
  aralikCoz,
  tarihMetniniCoz,
  tarihMetniYaz,
  trGunBasi,
  EN_FAZLA_OZEL_GUN,
  ANALITIK_SAKLAMA_GUNU,
} = await import("../../src/lib/analitik-aralik.ts");

const GUN_MS = 24 * 60 * 60 * 1000;

/** 9 Eylül 2026, 09:30 Türkiye saati (06:30 UTC). */
const SIMDI = new Date("2026-09-09T06:30:00.000Z");

describe("gün başlangıcı", () => {
  test("Türkiye saatine göre gün başı UTC 21:00'dir", () => {
    const gunBasi = trGunBasi(SIMDI);

    assert.equal(gunBasi.toISOString(), "2026-09-08T21:00:00.000Z");
  });

  test("gece yarısından hemen sonra aynı güne düşer", () => {
    // 9 Eylül 00:10 TR = 8 Eylül 21:10 UTC
    const gunBasi = trGunBasi(new Date("2026-09-08T21:10:00.000Z"));

    assert.equal(gunBasi.toISOString(), "2026-09-08T21:00:00.000Z");
  });
});

describe("hazır aralıklar", () => {
  test("bugün: gün başından yarının başına", () => {
    const aralik = aralikCoz({ aralik: "bugun" }, SIMDI);

    assert.equal(aralik.anahtar, "bugun");
    assert.equal(aralik.baslangic.toISOString(), "2026-09-08T21:00:00.000Z");
    assert.equal(aralik.bitis.toISOString(), "2026-09-09T21:00:00.000Z");
  });

  test("son 7 gün bugünü de kapsar ve tam 7 gündür", () => {
    const aralik = aralikCoz({ aralik: "7g" }, SIMDI);

    const gunSayisi =
      (aralik.bitis.getTime() - aralik.baslangic.getTime()) / GUN_MS;

    assert.equal(gunSayisi, 7);
    assert.equal(aralik.baslangic.toISOString(), "2026-09-02T21:00:00.000Z");
  });

  test("son 30 gün tam 30 gündür", () => {
    const aralik = aralikCoz({ aralik: "30g" }, SIMDI);

    const gunSayisi =
      (aralik.bitis.getTime() - aralik.baslangic.getTime()) / GUN_MS;

    assert.equal(gunSayisi, 30);
  });

  test("parametre yoksa varsayılan son 7 gündür", () => {
    assert.equal(aralikCoz({}, SIMDI).anahtar, "7g");
  });

  test("tanınmayan aralık adı varsayılana düşer", () => {
    assert.equal(aralikCoz({ aralik: "hepsi" }, SIMDI).anahtar, "7g");
  });
});

describe("özel aralık", () => {
  test("bitiş günü dâhildir", () => {
    const aralik = aralikCoz(
      { aralik: "ozel", bas: "2026-09-01", bit: "2026-09-03" },
      SIMDI
    );

    assert.equal(aralik.anahtar, "ozel");
    assert.equal(aralik.baslangic.toISOString(), "2026-08-31T21:00:00.000Z");
    // 3 Eylül'ün tamamı dâhil: bitiş 4 Eylül gün başıdır.
    assert.equal(aralik.bitis.toISOString(), "2026-09-03T21:00:00.000Z");
  });

  test("tek günlük seçim o günün tamamını kapsar", () => {
    const aralik = aralikCoz(
      { aralik: "ozel", bas: "2026-09-01", bit: "2026-09-01" },
      SIMDI
    );

    const gunSayisi =
      (aralik.bitis.getTime() - aralik.baslangic.getTime()) / GUN_MS;

    assert.equal(gunSayisi, 1);
  });

  test("bitiş başlangıçtan önceyse varsayılana düşülür", () => {
    const aralik = aralikCoz(
      { aralik: "ozel", bas: "2026-09-10", bit: "2026-09-01" },
      SIMDI
    );

    assert.equal(aralik.anahtar, "7g");
  });

  test("biçimi bozuk tarih varsayılana düşer", () => {
    const aralik = aralikCoz(
      { aralik: "ozel", bas: "01/09/2026", bit: "2026-09-03" },
      SIMDI
    );

    assert.equal(aralik.anahtar, "7g");
  });

  test("çok uzun aralık reddedilir", () => {
    const aralik = aralikCoz(
      { aralik: "ozel", bas: "2020-01-01", bit: "2026-09-01" },
      SIMDI
    );

    assert.equal(aralik.anahtar, "7g");
  });

  test("sınırdaki aralık kabul edilir", () => {
    const bas = "2026-01-01";
    const bit = tarihMetniYaz(
      new Date(
        (tarihMetniniCoz(bas) as Date).getTime() +
          (EN_FAZLA_OZEL_GUN - 1) * GUN_MS
      )
    );

    assert.equal(
      aralikCoz({ aralik: "ozel", bas, bit }, SIMDI).anahtar,
      "ozel"
    );
  });
});

describe("tarih metni çözümü", () => {
  test("var olmayan tarih reddedilir", () => {
    assert.equal(tarihMetniniCoz("2026-02-31"), null);
    assert.equal(tarihMetniniCoz("2026-13-01"), null);
  });

  test("çözülen tarih aynı metne geri yazılır", () => {
    const an = tarihMetniniCoz("2026-09-09");

    assert.ok(an);
    assert.equal(tarihMetniYaz(an), "2026-09-09");
  });

  test("metin olmayan değerler reddedilir", () => {
    assert.equal(tarihMetniniCoz(null), null);
    assert.equal(tarihMetniniCoz(20260909), null);
    assert.equal(tarihMetniniCoz({}), null);
  });
});

describe("veri saklama süresi", () => {
  test("saklama süresi seçilebilir en geniş aralıktan kısa olamaz", () => {
    /*
      Kısa olsaydı: kullanıcı en geniş özel aralığı seçtiğinde, aralığın
      başındaki günler zaten silinmiş olurdu ve rapor sessizce eksik veri
      gösterirdi. Bu iki sabit birlikte değişmelidir.
    */
    assert.ok(
      ANALITIK_SAKLAMA_GUNU >= EN_FAZLA_OZEL_GUN,
      `saklama (${ANALITIK_SAKLAMA_GUNU}) >= en geniş aralık (${EN_FAZLA_OZEL_GUN}) olmalı`
    );
  });

  test("saklama süresi tanımlı ve makul bir gün sayısıdır", () => {
    assert.equal(Number.isInteger(ANALITIK_SAKLAMA_GUNU), true);
    assert.ok(ANALITIK_SAKLAMA_GUNU > 0);
    // Süresiz saklama KVKK veri minimizasyonuna aykırıdır.
    assert.ok(ANALITIK_SAKLAMA_GUNU <= 730, "saklama süresi 2 yılı aşmamalı");
  });
});
