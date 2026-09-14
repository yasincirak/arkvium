import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Analitik giriş doğrulaması — GÜVENLİK TESTLERİ.
 *
 * En kritik kural: SATIN ALMA TARAYICIDAN ÜRETİLEMEZ. Bu dosya,
 * `/api/analitik/olay` ucunun kabul ettiği tür listesinin satış, ödeme
 * başlatma ve başarısız ödeme türlerini DIŞARIDA bıraktığını doğrular.
 *
 * Ayrıca yolun temizlenmesini (sorgu dizesindeki token analitiğe
 * sızmamalı) ve yönetim alanının elenmesini doğrular.
 */

/*
  Doğrulama kuralları veritabanı bağımlılığı olmadan içe aktarılır
  (bkz. src/lib/analitik-dogrulama.ts). Satış olayının tekillik kuralı
  veritabanı kısıtına dayandığı için entegrasyon testinde doğrulanır
  (tests/integration/analitik-satis.test.mts).
*/
const {
  ISTEMCIDEN_KABUL_EDILEN,
  istemciOlayTuruMu,
  olayKimligiCoz,
  tekilKimlik,
  urunKoduGecerliMi,
  yoluTemizle,
  yolHaricMi,
} = await import("../../src/lib/analitik-dogrulama.ts");

const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");

const {
  ziyaretciKimligiGecerliMi,
  ziyaretciKimligiUret,
  ziyaretKimligiUret,
  ZIYARET_COOKIE,
  ZIYARETCI_COOKIE,
  ZIYARET_COOKIE_OMRU,
  ZIYARETCI_COOKIE_OMRU,
} = await import("../../src/lib/analitik-ziyaretci.ts");

describe("olay türü beyaz listesi", () => {
  test("satın alma tarayıcıdan KABUL EDİLMEZ", () => {
    assert.equal(istemciOlayTuruMu("purchase"), false);
    assert.equal(
      (ISTEMCIDEN_KABUL_EDILEN as readonly string[]).includes("purchase"),
      false
    );
  });

  test("ödeme başlatma ve başarısız ödeme tarayıcıdan KABUL EDİLMEZ", () => {
    assert.equal(istemciOlayTuruMu("checkout_started"), false);
    assert.equal(istemciOlayTuruMu("payment_failed"), false);
  });

  test("yalnızca görüntüleme ve sepet olayları kabul edilir", () => {
    assert.deepEqual([...ISTEMCIDEN_KABUL_EDILEN], [
      "page_view",
      "product_view",
      "cart_add",
      "cart_remove",
    ]);

    for (const tur of ISTEMCIDEN_KABUL_EDILEN) {
      assert.equal(istemciOlayTuruMu(tur), true);
    }
  });

  test("uydurma ve metin olmayan türler reddedilir", () => {
    assert.equal(istemciOlayTuruMu("satis"), false);
    assert.equal(istemciOlayTuruMu(""), false);
    assert.equal(istemciOlayTuruMu(null), false);
    assert.equal(istemciOlayTuruMu({ tur: "page_view" }), false);
  });
});

describe("ürün kodu doğrulaması", () => {
  test("katalogdaki kodlar kabul edilir", () => {
    for (const urun of SIPARIS_URUNLERI) {
      assert.equal(urunKoduGecerliMi(urun.kod), true);
    }
  });

  test("katalogda olmayan kod reddedilir", () => {
    assert.equal(urunKoduGecerliMi("olmayan-urun"), false);
    assert.equal(urunKoduGecerliMi(""), false);
    assert.equal(urunKoduGecerliMi(123), false);
  });
});

describe("yol temizleme", () => {
  test("sorgu dizesi ATILIR (token analitiğe yazılmaz)", () => {
    assert.equal(yoluTemizle("/odeme/sonuc/abc?token=gizli"), "/odeme/sonuc/abc");
    assert.equal(yoluTemizle("/siparis?urun=sticker-seti"), "/siparis");
  });

  test("fragman atılır", () => {
    assert.equal(yoluTemizle("/#urunler"), "/");
  });

  test("tam adres kabul edilmez", () => {
    assert.equal(yoluTemizle("https://baska-site.example/kayit"), null);
    assert.equal(yoluTemizle("javascript:alert(1)"), null);
  });

  test("çok uzun yol kırpılır", () => {
    const uzun = `/${"a".repeat(500)}`;

    assert.equal((yoluTemizle(uzun) as string).length, 120);
  });
});

describe("yönetim alanı elenmesi", () => {
  test("admin ve hesap yolları müşteri istatistiğine girmez", () => {
    assert.equal(yolHaricMi("/admin"), true);
    assert.equal(yolHaricMi("/admin/orders"), true);
    assert.equal(yolHaricMi("/account"), true);
    assert.equal(yolHaricMi("/account/tags/activate"), true);
    assert.equal(yolHaricMi("/api/analitik/olay"), true);
  });

  test("benzer adlı müşteri yolları elenmez", () => {
    assert.equal(yolHaricMi("/adminler"), false);
    assert.equal(yolHaricMi("/accounts-hakkinda"), false);
    assert.equal(yolHaricMi("/siparis"), false);
    assert.equal(yolHaricMi("/"), false);
  });
});

describe("ziyaretçi kimliği", () => {
  test("üretilen kimlik doğrulamadan geçer", () => {
    assert.equal(ziyaretciKimligiGecerliMi(ziyaretciKimligiUret()), true);
  });

  test("her çağrıda farklı kimlik üretilir", () => {
    const kimlikler = new Set(
      Array.from({ length: 50 }, () => ziyaretciKimligiUret())
    );

    assert.equal(kimlikler.size, 50);
  });

  test("istemcinin uydurduğu değer kabul edilmez", () => {
    assert.equal(ziyaretciKimligiGecerliMi("yonetici"), false);
    assert.equal(ziyaretciKimligiGecerliMi("ZZZZ".repeat(8)), false);
    assert.equal(ziyaretciKimligiGecerliMi("ab".repeat(8)), false);
    assert.equal(ziyaretciKimligiGecerliMi(null), false);
  });
});

describe("kimlik çözümü — giriş yapan kullanıcı", () => {
  /*
    KURAL: Giriş yapmış kullanıcıda olay YALNIZCA hesapla ilişkilendirilir.
    Anonim ziyaretçi kimliği o satıra YAZILMAZ; aksi hâlde aynı kişi için
    ikinci, paralel bir takip kimliği oluşur ve anonim iz hesapla
    birleştirilmiş olurdu.
  */

  test("oturum varsa yalnızca kullanıcı kimliği yazılır", () => {
    const kimlik = olayKimligiCoz({
      userId: "kullanici-1",
      visitorId: "a".repeat(32),
    });

    assert.equal(kimlik.userId, "kullanici-1");
    assert.equal(kimlik.visitorId, null, "anonim kimlik düşürülmeli");
  });

  test("oturum yoksa anonim ziyaretçi kimliği kullanılır", () => {
    const kimlik = olayKimligiCoz({ visitorId: "b".repeat(32) });

    assert.equal(kimlik.userId, null);
    assert.equal(kimlik.visitorId, "b".repeat(32));
  });

  test("ikisi de yoksa her ikisi null kalır", () => {
    const kimlik = olayKimligiCoz({});

    assert.equal(kimlik.userId, null);
    assert.equal(kimlik.visitorId, null);
  });
});

describe("tekil kimlik — rapor sayımı", () => {
  test("kullanıcı ve ziyaretçi kimlikleri çakışmaz", () => {
    // Aynı metin hem kullanıcı hem ziyaretçi kimliği olsa bile ayrı sayılır.
    assert.notEqual(
      tekilKimlik({ userId: "ayni" }),
      tekilKimlik({ visitorId: "ayni" })
    );
  });

  test("kullanıcı kimliği ziyaretçi kimliğine göre önceliklidir", () => {
    assert.equal(
      tekilKimlik({ userId: "k1", visitorId: "z1" }),
      tekilKimlik({ userId: "k1" })
    );
  });

  test("kimliksiz satır sayıma girmez", () => {
    assert.equal(tekilKimlik({}), null);
    assert.equal(tekilKimlik({ userId: null, visitorId: null }), null);
  });
});

describe("ziyaret (oturum) kimliği", () => {
  test("ziyaret kimliği ziyaretçi kimliğiyle aynı biçimdedir", () => {
    assert.equal(ziyaretciKimligiGecerliMi(ziyaretKimligiUret()), true);
  });

  test("ziyaret ve ziyaretçi çerezleri farklı adlardadır", () => {
    assert.notEqual(ZIYARET_COOKIE, ZIYARETCI_COOKIE);
  });

  test("ziyaret çerezi kısa, ziyaretçi çerezi uzun ömürlüdür", () => {
    assert.ok(
      ZIYARET_COOKIE_OMRU < ZIYARETCI_COOKIE_OMRU,
      "ziyaret penceresi ziyaretçi kimliğinden kısa olmalı"
    );
  });
});
