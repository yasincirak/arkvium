import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Etiket arama, iptal/yenileme uygunluğu ve onay kuralları.
 *
 * Kurallar saf modülde durduğu için bu testler veritabanı bağlantısı
 * GEREKTİRMEZ. Gerçek etiket, gerçek aktivasyon kodu veya production
 * verisi kullanılmaz; tüm değerler burada üretilir.
 */

const {
  aramaTerimiCoz,
  islemUygunlugu,
  onayKoduDogru,
  qrDosyaAdi,
  rezervasyonGecerliMi,
  EN_AZ_ARAMA_UZUNLUGU,
} = await import("@/lib/etiket-yonetim-kurallari");

describe("etiket arama terimi", () => {
  test("tam kod ARK önekiyle veya öneksiz aynı parçayı verir", () => {
    const onekli = aramaTerimiCoz("ARK-1A2B-3C4D");
    const oneksiz = aramaTerimiCoz("1A2B3C4D");

    assert.ok(onekli);
    assert.ok(oneksiz);
    assert.equal(onekli.parca, oneksiz.parca);
    assert.equal(onekli.parca, "1A2B3C4D");
  });

  test("büyük/küçük harf ve tire farkı sonucu değiştirmez", () => {
    const buyuk = aramaTerimiCoz("ARK-1A2B-3C4D");
    const kucuk = aramaTerimiCoz("  ark 1a2b 3c4d ");

    assert.ok(buyuk);
    assert.ok(kucuk);
    assert.equal(buyuk.parca, kucuk.parca);
  });

  test("kısmi arama desteklenir", () => {
    const terim = aramaTerimiCoz("1a2b");

    assert.ok(terim);
    assert.equal(terim.parca, "1A2B");
    // Sekiz karakter değil: tam kod araması sayılmaz.
    assert.equal(terim.tamKod, null);
  });

  test("sekiz karakterlik gövde tam kod olarak işaretlenir", () => {
    const terim = aramaTerimiCoz("1A2B3C4D");

    assert.ok(terim);
    assert.equal(terim.tamKod, "ARK1A2B3C4D");
  });

  test("Base32'de olmayan benzer karakterler karşılığına çevrilir", () => {
    // O -> 0, I/L -> 1, U -> V (kodNormalize kuralı)
    const terim = aramaTerimiCoz("OIU");

    assert.ok(terim);
    assert.equal(terim.parca, "01V");
  });

  test("çok kısa girdi reddedilir", () => {
    assert.equal(aramaTerimiCoz("1"), null);
    assert.equal(aramaTerimiCoz(""), null);
    assert.equal(aramaTerimiCoz("   "), null);
    assert.equal(aramaTerimiCoz(null), null);
    assert.equal(aramaTerimiCoz(undefined), null);
    assert.equal(aramaTerimiCoz(42), null);
  });

  test("yalnızca ARK yazmak arama başlatmaz", () => {
    // Önek atıldıktan sonra geriye hiçbir şey kalmaz.
    assert.equal(aramaTerimiCoz("ARK"), null);
    assert.ok(EN_AZ_ARAMA_UZUNLUGU >= 2);
  });
});

describe("rezervasyon geçerliliği", () => {
  const simdi = new Date("2026-09-17T12:00:00.000Z");

  test("gelecekteki son geçerlilik rezerve sayılır", () => {
    assert.equal(
      rezervasyonGecerliMi(new Date("2026-09-17T13:00:00.000Z"), simdi),
      true
    );
  });

  test("süresi geçmiş rezervasyon yok sayılır", () => {
    assert.equal(
      rezervasyonGecerliMi(new Date("2026-09-17T11:00:00.000Z"), simdi),
      false
    );
  });

  test("rezervasyon yoksa false", () => {
    assert.equal(rezervasyonGecerliMi(null, simdi), false);
    assert.equal(rezervasyonGecerliMi(undefined, simdi), false);
  });
});

describe("iptal/yenileme uygunluğu", () => {
  test("kullanılmamış, aktif ve pasif etiketlerde işlem yapılabilir", () => {
    for (const durum of ["unused", "active", "inactive"]) {
      const sonuc = islemUygunlugu({
        durum,
        rezerveMi: false,
        productKod: "sticker-seti",
      });

      assert.equal(sonuc.iptalEdilebilir, true, durum);
      assert.equal(sonuc.yenilenebilir, true, durum);
      assert.equal(sonuc.sebep, null, durum);
    }
  });

  test("iptal edilmiş etiket tekrar iptal edilemez ve yenilenemez", () => {
    const sonuc = islemUygunlugu({
      durum: "revoked",
      rezerveMi: false,
      productKod: "sticker-seti",
    });

    assert.equal(sonuc.iptalEdilebilir, false);
    assert.equal(sonuc.yenilenebilir, false);
    assert.ok(sonuc.sebep);
  });

  test("siparişe rezerve etiket işleme kapalıdır", () => {
    const sonuc = islemUygunlugu({
      durum: "unused",
      rezerveMi: true,
      productKod: "sticker-seti",
    });

    assert.equal(sonuc.iptalEdilebilir, false);
    assert.equal(sonuc.yenilenebilir, false);
    assert.ok(sonuc.sebep);
  });

  test("türü olmayan etiket de iptal edilebilir", () => {
    const sonuc = islemUygunlugu({
      durum: "unused",
      rezerveMi: false,
      productKod: null,
    });

    assert.equal(sonuc.iptalEdilebilir, true);
  });
});

describe("onay kodu doğrulaması", () => {
  const gercek = "ARK1A2B3C4D";

  test("birebir kod kabul edilir", () => {
    assert.equal(onayKoduDogru("ARK1A2B3C4D", gercek), true);
  });

  test("tireli ve küçük harfli yazım kabul edilir", () => {
    assert.equal(onayKoduDogru("ark-1a2b-3c4d", gercek), true);
    assert.equal(onayKoduDogru("  ARK-1A2B-3C4D  ", gercek), true);
  });

  test("farklı kod reddedilir", () => {
    assert.equal(onayKoduDogru("ARK9Z8Y7X6W", gercek), false);
  });

  test("boş ve metin olmayan girdi reddedilir", () => {
    assert.equal(onayKoduDogru("", gercek), false);
    assert.equal(onayKoduDogru("   ", gercek), false);
    assert.equal(onayKoduDogru(null, gercek), false);
    assert.equal(onayKoduDogru(undefined, gercek), false);
    assert.equal(onayKoduDogru({}, gercek), false);
  });

  test("eksik kod tam koda eşit sayılmaz", () => {
    assert.equal(onayKoduDogru("1A2B", gercek), false);
  });
});

describe("QR dosya adı", () => {
  test("etiket kodu dosya adında izlenebilir", () => {
    const ad = qrDosyaAdi("ARK-1A2B-3C4D", 22.4);

    assert.ok(ad.includes("ARK-1A2B-3C4D"));
    assert.ok(ad.endsWith(".svg"));
  });

  test("yol ayracı ve tehlikeli karakterler temizlenir", () => {
    const ad = qrDosyaAdi('../../etc/passwd"; rm -rf /', 30);

    assert.ok(!ad.includes("/"));
    assert.ok(!ad.includes(".."));
    assert.ok(!ad.includes('"'));
    assert.ok(!ad.includes(" "));
    assert.ok(ad.endsWith(".svg"));
  });

  test("boş kod güvenli varsayılana düşer", () => {
    const ad = qrDosyaAdi("", 22.4);

    assert.ok(ad.startsWith("arkvium-qr-etiket-"));
  });
});
