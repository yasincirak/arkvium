import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * Açık yönlendirme (open redirect) testleri.
 *
 * `?next=` değeri kullanıcıdan gelir. Denetimden geçmeyen bir değer,
 * giriş yaptıktan sonra kurbanı saldırganın sitesine düşürür. Aşağıdaki
 * her girdi gerçek bir saldırı kalıbıdır.
 */

const { guvenliDonusAdresi, girisAdresi, VARSAYILAN_DONUS } = await import(
  pathToFileURL(resolve("src/lib/guvenli-yonlendirme.ts")).href
);

const REDDEDILMESI_GEREKENLER = [
  ["boş", ""],
  ["null", null],
  ["undefined", undefined],
  ["mutlak http adresi", "http://kotu.example"],
  ["mutlak https adresi", "https://kotu.example/giris"],
  ["protokol-göreli", "//kotu.example"],
  ["ters bölülü protokol-göreli", "/\\kotu.example"],
  ["ters bölü içeren", "/admin\\..\\kotu"],
  ["şema göreli görünümlü", "/redirect?url=http://kotu.example"],
  ["javascript şeması", "javascript:alert(1)"],
  ["veri şeması", "data:text/html,<script>"],
  ["göreli ama / ile başlamayan", "admin"],
  ["yeni satır enjeksiyonu", "/admin\nSet-Cookie: x=1"],
  ["sekme enjeksiyonu", "/ad\tmin"],
  ["boşlukla başlayan", " //kotu.example"],
  ["kodlanmış protokol-göreli", "/%2f%2fkotu.example"],
  ["kodlanmış ters bölü", "/%5ckotu.example"],
] as const;

const KABUL_EDILMESI_GEREKENLER = [
  ["kök", "/"],
  ["admin kökü", "/admin"],
  ["admin alt sayfası", "/admin/tags"],
  ["sorgu parametreli", "/admin/tags?urun=sticker-seti"],
  ["hesap sayfası", "/account"],
  ["derin yol", "/admin/orders/abc123"],
] as const;

describe("guvenliDonusAdresi", () => {
  for (const [ad, girdi] of REDDEDILMESI_GEREKENLER) {
    test(`reddeder: ${ad}`, () => {
      assert.equal(
        guvenliDonusAdresi(girdi as string | null | undefined),
        VARSAYILAN_DONUS,
        `"${String(girdi)}" güvenli varsayılana düşmeliydi`
      );
    });
  }

  for (const [ad, girdi] of KABUL_EDILMESI_GEREKENLER) {
    test(`kabul eder: ${ad}`, () => {
      assert.equal(guvenliDonusAdresi(girdi), girdi);
    });
  }

  test("özel varsayılan kullanılabilir", () => {
    assert.equal(guvenliDonusAdresi("http://kotu.example", "/admin"), "/admin");
  });

  test("hiçbir girdi dış alan adına çıkamaz", () => {
    for (const [, girdi] of REDDEDILMESI_GEREKENLER) {
      const sonuc = guvenliDonusAdresi(girdi as string | null | undefined);

      assert.ok(sonuc.startsWith("/"), `${sonuc} göreli değil`);
      assert.ok(!sonuc.startsWith("//"), `${sonuc} protokol-göreli`);
      assert.ok(!sonuc.includes("kotu.example"), `${sonuc} dış alana çıkıyor`);
    }
  });
});

describe("girisAdresi", () => {
  test("güvenli yolu next parametresine kodlar", () => {
    assert.equal(girisAdresi("/admin/tags"), "/login?next=%2Fadmin%2Ftags");
  });

  test("güvensiz yol varsayılana düşer", () => {
    assert.equal(
      girisAdresi("https://kotu.example"),
      `/login?next=${encodeURIComponent(VARSAYILAN_DONUS)}`
    );
  });

  test("sorgu parametresi kaçmaz", () => {
    const adres = girisAdresi("/admin/tags?urun=a&x=1");

    // & ve ? kodlanmalı; aksi hâlde ek parametre enjekte edilebilir.
    assert.ok(!adres.slice("/login?next=".length).includes("&"));
    assert.ok(!adres.slice("/login?next=".length).includes("?"));
  });
});
