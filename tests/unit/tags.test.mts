import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";

const {
  TAG_DURUMLARI,
  aktivasyonKoduOzetle,
  aktivasyonKoduUret,
  etiketAdresi,
  etiketKoduBicimle,
  etiketKoduNormalize,
  etiketKoduUret,
  etiketUret,
  kodNormalize,
  publicTokenUret,
} = await import("../../src/lib/tags.ts");

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

describe("etiket durumları", () => {
  test("dört durum tanımlıdır", () => {
    assert.deepEqual([...TAG_DURUMLARI], [
      "unused",
      "active",
      "inactive",
      "revoked",
    ]);
  });
});

describe("genel erişim tokenı (publicToken)", () => {
  test("2000 üretimde çakışma olmaz", () => {
    const uretilenler = new Set<string>();

    for (let i = 0; i < 2000; i += 1) {
      uretilenler.add(publicTokenUret());
    }

    assert.equal(uretilenler.size, 2000);
  });

  test("256 bit entropi taşır (43 karakter base64url)", () => {
    const token = publicTokenUret();

    assert.equal(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  test("ardışık değil — art arda üretilenler benzemiyor", () => {
    const a = publicTokenUret();
    const b = publicTokenUret();

    // Ardışık bir sayaç olsaydı baştaki karakterler aynı olurdu.
    let ortakOnEk = 0;

    while (ortakOnEk < a.length && a[ortakOnEk] === b[ortakOnEk]) {
      ortakOnEk += 1;
    }

    assert.ok(
      ortakOnEk < 8,
      `art arda üretilen tokenlar ${ortakOnEk} karakter ortak ön ek paylaşıyor`
    );
  });

  test("veritabanı ID'si biçiminde değil", () => {
    const token = publicTokenUret();

    // cuid "c" ile başlar, UUID tire içerir, sayısal ID sadece rakamdır.
    assert.ok(!/^\d+$/.test(token), "tamamen sayısal olmamalı");
    assert.ok(!token.includes("-") || token.length === 43);
    assert.doesNotMatch(
      token,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  test("her bayt konumunda çeşitlilik var", () => {
    // Sabit bir ön ek/son ek olsaydı bu küme tek elemanlı kalırdı.
    const ilkKarakterler = new Set<string>();

    for (let i = 0; i < 200; i += 1) {
      ilkKarakterler.add(publicTokenUret()[0]);
    }

    assert.ok(
      ilkKarakterler.size > 10,
      `ilk karakter çeşitliliği düşük: ${ilkKarakterler.size}`
    );
  });
});

describe("etiket kodu", () => {
  test("normalleştirilmiş biçimde üretilir (ARKXXXXXXXX)", () => {
    assert.match(etiketKoduUret(), /^ARK[0-9A-Z]{8}$/);
  });

  test("üretilen kod normalize edildiğinde değişmez", () => {
    // Veritabanına yazılan değer ile arama değeri aynı olmalı;
    // aksi hâlde aktivasyon hiçbir zaman eşleşmez.
    for (let i = 0; i < 100; i += 1) {
      const kod = etiketKoduUret();
      assert.equal(etiketKoduNormalize(kod), kod);
    }
  });

  test("baskı biçimi ARK-XXXX-XXXX olarak üretilir", () => {
    const kod = etiketKoduUret();
    assert.match(etiketKoduBicimle(kod), /^ARK-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  test("biçimlendirilmiş kod tekrar aynı değere normalize olur", () => {
    const kod = etiketKoduUret();
    assert.equal(etiketKoduNormalize(etiketKoduBicimle(kod)), kod);
  });

  test("yalnızca karışması zor karakterler kullanılır", () => {
    for (let i = 0; i < 100; i += 1) {
      const govde = etiketKoduUret().replace(/^ARK/, "");

      for (const karakter of govde) {
        assert.ok(
          BASE32.includes(karakter),
          `beklenmeyen karakter: ${karakter}`
        );
      }
    }
  });

  test("I, L, O, U karakterleri hiç geçmez", () => {
    for (let i = 0; i < 200; i += 1) {
      assert.doesNotMatch(etiketKoduUret().replace("ARK", ""), /[ILOU]/);
    }
  });

  test("1000 üretimde çakışma olmaz", () => {
    const kodlar = new Set<string>();

    for (let i = 0; i < 1000; i += 1) {
      kodlar.add(etiketKoduUret());
    }

    assert.equal(kodlar.size, 1000);
  });
});

describe("aktivasyon kodu", () => {
  test("XXXX-XXXX-XXXX biçimindedir", () => {
    assert.match(aktivasyonKoduUret(), /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  test("1000 üretimde çakışma olmaz", () => {
    const kodlar = new Set<string>();

    for (let i = 0; i < 1000; i += 1) {
      kodlar.add(aktivasyonKoduUret());
    }

    assert.equal(kodlar.size, 1000);
  });

  test("özet SHA-256'dır ve kodun kendisini içermez", () => {
    const kod = aktivasyonKoduUret();
    const ozet = aktivasyonKoduOzetle(kod);

    assert.equal(ozet.length, 64);
    assert.equal(
      ozet,
      createHash("sha256").update(kodNormalize(kod)).digest("hex")
    );
    assert.ok(!ozet.includes(kod.replace(/-/g, "")));
  });

  test("farklı kodlar farklı özet verir", () => {
    assert.notEqual(
      aktivasyonKoduOzetle("AAAA-AAAA-AAAA"),
      aktivasyonKoduOzetle("AAAA-AAAA-AAAB")
    );
  });
});

describe("kullanıcı girdisini normalleştirme", () => {
  test("küçük harf, boşluk ve tire farkları tolere edilir", () => {
    const beklenen = kodNormalize("ABCD-EFGH-JKMN");

    assert.equal(kodNormalize("abcd-efgh-jkmn"), beklenen);
    assert.equal(kodNormalize("  ABCDEFGHJKMN  "), beklenen);
    assert.equal(kodNormalize("abcd efgh jkmn"), beklenen);
  });

  test("karışabilen karakterler karşılıklarına çevrilir", () => {
    assert.equal(kodNormalize("O"), "0");
    assert.equal(kodNormalize("I"), "1");
    assert.equal(kodNormalize("L"), "1");
    assert.equal(kodNormalize("U"), "V");
  });

  test("aynı kodun farklı yazımları aynı özeti verir", () => {
    const ozet = aktivasyonKoduOzetle("ABCD-EFGH-JKMN");

    assert.equal(aktivasyonKoduOzetle("abcdefghjkmn"), ozet);
    assert.equal(aktivasyonKoduOzetle(" ABCD EFGH JKMN "), ozet);
  });

  test("etiket kodu ARK öneki olmadan da eşleşir", () => {
    assert.equal(etiketKoduNormalize("ARK-1234-5678"), "ARK12345678");
    assert.equal(etiketKoduNormalize("1234-5678"), "ARK12345678");
    assert.equal(etiketKoduNormalize("ark 1234 5678"), "ARK12345678");
  });
});

describe("etiket üretimi", () => {
  test("üretilen etiket tutarlı bir özet taşır", () => {
    const etiket = etiketUret();

    assert.equal(
      etiket.activationCodeHash,
      aktivasyonKoduOzetle(etiket.activationCode)
    );
  });

  test("aktivasyon kodu ile özeti birbirinden farklıdır", () => {
    const etiket = etiketUret();

    assert.notEqual(etiket.activationCode, etiket.activationCodeHash);
  });

  test("kod, token ve aktivasyon kodu birbirinden bağımsızdır", () => {
    const etiket = etiketUret();

    assert.notEqual(etiket.code, etiket.publicToken);
    assert.notEqual(etiket.code, etiket.activationCode);
    assert.ok(!etiket.publicToken.includes(etiket.code));
  });
});

describe("etiket adresi", () => {
  test("/t/<token> biçiminde üretilir", () => {
    assert.equal(
      etiketAdresi("abc123", "https://arkvium.com"),
      "https://arkvium.com/t/abc123"
    );
  });

  test("sondaki eğik çizgi tekrarlanmaz", () => {
    assert.equal(
      etiketAdresi("abc123", "https://arkvium.com/"),
      "https://arkvium.com/t/abc123"
    );
  });

  test("adres veritabanı ID'si içermez, yalnızca tokenı taşır", () => {
    const etiket = etiketUret();
    const adres = etiketAdresi(etiket.publicToken, "https://arkvium.com");

    assert.ok(adres.endsWith(`/t/${etiket.publicToken}`));
    assert.ok(!adres.includes(etiket.activationCode));
  });
});
