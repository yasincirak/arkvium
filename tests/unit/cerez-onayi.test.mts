import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Çerez onayı kuralları.
 *
 * EN KRİTİK KURAL: Analitik çerezler ve olaylar YALNIZCA açık kabulde
 * çalışır. Karar verilmemişse, reddedilmişse veya onay eski bir politika
 * sürümüne aitse analitik KAPALIDIR.
 */

const {
  analitikIzinliMi,
  onayDegeriCoz,
  onayDegeriYaz,
  onayDurumuMu,
  ONAY_SURUMU,
  ONAY_COOKIE_OMRU,
  CEREZ_ONAY_COOKIE,
  onayCookieAyarlari,
} = await import("../../src/lib/cerez-onayi.ts");

describe("onay değeri yazma ve çözme", () => {
  test("yazılan değer aynı şekilde geri çözülür", () => {
    assert.equal(onayDegeriCoz(onayDegeriYaz("kabul")), "kabul");
    assert.equal(onayDegeriCoz(onayDegeriYaz("red")), "red");
  });

  test("değer sürüm bilgisi taşır", () => {
    assert.equal(onayDegeriYaz("kabul"), `kabul:${ONAY_SURUMU}`);
  });

  test("yalnızca kabul ve red geçerli durumdur", () => {
    assert.equal(onayDurumuMu("kabul"), true);
    assert.equal(onayDurumuMu("red"), true);
    assert.equal(onayDurumuMu("belirsiz"), false);
    assert.equal(onayDurumuMu("evet"), false);
    assert.equal(onayDurumuMu(null), false);
    assert.equal(onayDurumuMu(1), false);
  });
});

describe("belirsiz sayılan durumlar", () => {
  test("çerez yoksa belirsizdir", () => {
    assert.equal(onayDegeriCoz(undefined), "belirsiz");
    assert.equal(onayDegeriCoz(null), "belirsiz");
    assert.equal(onayDegeriCoz(""), "belirsiz");
  });

  test("ESKİ SÜRÜMLÜ onay geçersizdir", () => {
    /*
      Politika değişince eski onay sessizce geçerli sayılmaz; kullanıcıya
      yeniden sorulur.
    */
    assert.equal(onayDegeriCoz("kabul:0"), "belirsiz");
    assert.equal(onayDegeriCoz("kabul:99"), "belirsiz");
  });

  test("sürümsüz veya bozuk değer geçersizdir", () => {
    assert.equal(onayDegeriCoz("kabul"), "belirsiz");
    assert.equal(onayDegeriCoz("uydurma:1"), "belirsiz");
    assert.equal(onayDegeriCoz(":1"), "belirsiz");
    assert.equal(onayDegeriCoz({ durum: "kabul" }), "belirsiz");
  });
});

describe("analitik izni", () => {
  test("YALNIZCA açık kabulde izin verilir", () => {
    assert.equal(analitikIzinliMi(onayDegeriYaz("kabul")), true);
  });

  test("reddedilmişse izin yoktur", () => {
    assert.equal(analitikIzinliMi(onayDegeriYaz("red")), false);
  });

  test("karar verilmemişse izin yoktur", () => {
    assert.equal(analitikIzinliMi(undefined), false);
    assert.equal(analitikIzinliMi(null), false);
    assert.equal(analitikIzinliMi(""), false);
  });

  test("eski sürümlü kabul izin vermez", () => {
    assert.equal(analitikIzinliMi("kabul:0"), false);
  });
});

describe("onay çerezinin kendisi", () => {
  test("httpOnly DEĞİLDİR (banner sunucuya sormadan okumalı)", () => {
    assert.equal(onayCookieAyarlari.httpOnly, false);
  });

  test("çapraz site isteklerde gönderilmez", () => {
    assert.equal(onayCookieAyarlari.sameSite, "lax");
  });

  test("tüm site için geçerlidir ve bir yıl saklanır", () => {
    assert.equal(onayCookieAyarlari.path, "/");
    assert.equal(onayCookieAyarlari.maxAge, ONAY_COOKIE_OMRU);
    assert.equal(ONAY_COOKIE_OMRU, 60 * 60 * 24 * 365);
  });

  test("çerez adı analitik çerezlerinden farklıdır", async () => {
    const { ZIYARETCI_COOKIE, ZIYARET_COOKIE } = await import(
      "../../src/lib/analitik-ziyaretci.ts"
    );

    assert.notEqual(CEREZ_ONAY_COOKIE, ZIYARETCI_COOKIE);
    assert.notEqual(CEREZ_ONAY_COOKIE, ZIYARET_COOKIE);
  });
});
