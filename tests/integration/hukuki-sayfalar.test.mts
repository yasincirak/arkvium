import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import {
  testSunucusuBaslat,
  testVeritabaniAdresi,
  type TestSunucusu,
} from "../helpers/test-ortami.mts";

/**
 * Hukuki sayfaların uçtan uca erişilebilirliği.
 *
 * TASLAK KİLİDİ: `HUKUKI_BELGELER_YAYINDA` kapalıyken bu sayfalar
 * YAYINDA DEĞİLDİR. Testler kilidin iki durumunu da kapsar; kilit
 * açıldığında aynı dosya yayın davranışını doğrular.
 *
 * Kilit AÇIKKEN doğrulananlar:
 *  - Her belge adresi 200 döner (bağlantılar boşa düşmez).
 *  - Sayfalar taslak uyarısını ve doldurulacak alan işaretini taşır.
 *  - Belgeler birbirine ve çerez politikasına bağlanır.
 *  - Ana sayfa footer'ı dört belgeye de bağlanır.
 *  - Sipariş sayfası onay belgelerine bağlanır.
 *
 * Veritabanına yazılmaz; yalnızca sayfa gövdeleri okunur.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;

const {
  HUKUKI_BELGELER,
  HUKUKI_BELGELER_YAYINDA,
  HUKUKI_BELGE_LISTESI,
  SIPARIS_ONAY_BELGELERI,
  CEREZ_POLITIKASI_YOLU,
  DOLDURULACAK,
} = await import("../../src/lib/hukuki-belgeler.ts");

const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");

let sunucu: TestSunucusu;

before(async () => {
  sunucu = await testSunucusuBaslat();
});

after(async () => {
  await sunucu?.kapat();
});

async function sayfa(yol: string) {
  const yanit = await fetch(sunucu.taban + yol, { redirect: "manual" });

  return { yanit, icerik: await yanit.text() };
}

describe("hukuki sayfalar açılır", () => {
  for (const belge of HUKUKI_BELGE_LISTESI) {
    test(`${belge.yol} 200 döner ve başlığı taşır`, async () => {
      const { yanit, icerik } = await sayfa(belge.yol);

      assert.equal(yanit.status, 200, `${belge.yol} açılmalı`);
      assert.ok(
        icerik.includes(belge.baslik),
        `${belge.yol} başlığı görünmeli`
      );
    });
  }

  test("çerez politikası açılır", async () => {
    const { yanit } = await sayfa(CEREZ_POLITIKASI_YOLU);

    assert.equal(yanit.status, 200);
  });
});

describe("taslak uyarısı ve eksik alanlar", () => {
  for (const belge of HUKUKI_BELGE_LISTESI) {
    test(`${belge.yol} taslak uyarısı gösterir`, async () => {
      const { icerik } = await sayfa(belge.yol);

      assert.ok(
        icerik.includes("hukuki inceleme gerekir"),
        "taslak uyarısı görünmeli"
      );

      assert.ok(
        !icerik.includes("hukuken kesin uyumlu"),
        "uygunluk iddiası bulunmamalı"
      );
    });
  }

  test("satıcı bilgisi gerektiren sayfalar doldurulacak alan işaretler", async (t) => {
    /*
      Satıcı unvanı, adresi ve vergi bilgisi koddan doğrulanamaz;
      uydurulmak yerine açıkça işaretlenmelidir.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    for (const belge of [
      HUKUKI_BELGELER.kvkkAydinlatma,
      HUKUKI_BELGELER.onBilgilendirme,
      HUKUKI_BELGELER.mesafeliSatis,
      HUKUKI_BELGELER.teslimatIade,
    ]) {
      const { icerik } = await sayfa(belge.yol);

      assert.ok(
        icerik.includes(DOLDURULACAK),
        `${belge.yol} doldurulacak alan işareti taşımalı`
      );
    }
  });

  test("Gizlilik Politikası kendi işaretlerini kullanır", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.gizlilikPolitikasi.yol);

    assert.ok(
      icerik.includes("YASİN TARAFINDAN DOLDURULACAK"),
      "işletme bilgisi işareti bulunmalı"
    );

    assert.ok(
      icerik.includes("HUKUK DANIŞMANI ONAYI GEREKİYOR"),
      "hukuki değerlendirme işareti bulunmalı"
    );
  });

  test("Gizlilik Politikası kanıtlanmamış güvenlik iddiası içermez", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    /*
      Doğrulanamayan güvenlik iddialari hem yaniltici hem de hukuken
      risklidir; metinde bulunmamalidir.
    */
    const { icerik } = await sayfa(HUKUKI_BELGELER.gizlilikPolitikasi.yol);

    for (const yasak of [
      "en üst düzey güvenlik",
      "tamamen güvenli",
      "sızma testi",
      "Tüm veriler SSL",
      "kabul etmiş sayılırsınız",
      "Google Analytics",
      "0850",
    ]) {
      assert.ok(
        !icerik.includes(yasak),
        `metinde bulunmamalı: ${yasak}`
      );
    }
  });

  test("Gizlilik Politikası KVKK metninin yerine geçmediğini söyler", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.gizlilikPolitikasi.yol);

    assert.ok(
      icerik.includes("aynı belge değildir"),
      "iki belgenin ayrı olduğu açıkça yazılmalı"
    );

    assert.ok(
      icerik.includes(`href="${HUKUKI_BELGELER.kvkkAydinlatma.yol}"`),
      "KVKK metnine bağlantı bulunmalı"
    );
  });

  test("Mesafeli Satış Sözleşmesi kendi işaretlerini kullanır", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.mesafeliSatis.yol);

    assert.ok(icerik.includes("YASİN TARAFINDAN DOLDURULACAK"));
    assert.ok(icerik.includes("HUKUK DANIŞMANI ONAYI GEREKİYOR"));
  });

  test("Sözleşme cayma istisnalarını KESİNLEŞTİRMEZ", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    /*
      Aktivasyonun, ambalaj açılmasının veya etiketin yapıştırılmasının
      cayma hakkını kaldırdığı bir hüküm olarak yazılmamalidir; bunlar
      hukuki degerlendirme gerektirir.
    */
    const { icerik } = await sayfa(HUKUKI_BELGELER.mesafeliSatis.yol);

    assert.ok(
      icerik.includes("kesinleştirilmemiştir"),
      "istisnaların kesinleştirilmediği yazılmalı"
    );

    assert.ok(
      icerik.includes("ayıplı mala ilişkin kanuni haklarını etkilemez"),
      "cayma ile ayıplı mal hakları ayrıldığı belirtilmeli"
    );
  });

  test("Sözleşme başvuru hakkını satıcının yeriyle sınırlamaz", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.mesafeliSatis.yol);

    assert.ok(
      icerik.includes("kendi yerleşim yerindeki"),
      "alıcının kendi yerleşim yerine başvurabileceği yazılmalı"
    );
  });

  test("Sözleşme bulunmayan özellikleri saymaz", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.mesafeliSatis.yol);

    for (const yasak of [
      "0850",
      "maskeleme",
      "SMS paketi",
      "dakika paketi",
      "abonelik",
      "kontör",
      "Hayat Kartım",
    ]) {
      assert.ok(!icerik.includes(yasak), `metinde bulunmamalı: ${yasak}`);
    }
  });

  test("Teslimat–İade politikası kendi işaretlerini kullanır", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.teslimatIade.yol);

    assert.ok(icerik.includes("YASİN TARAFINDAN DOLDURULACAK"));
    assert.ok(icerik.includes("HUKUK DANIŞMANI ONAYI GEREKİYOR"));
  });

  test("Teslimat politikası olmayan özellikleri varmış gibi anlatmaz", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    /*
      Uygulamada siparis iptal islevi ve otomatik geri odeme YOK.
      Metin bunu gizlemek yerine acikca yaziyor.
    */
    const { icerik } = await sayfa(HUKUKI_BELGELER.teslimatIade.yol);

    assert.ok(
      icerik.includes("otomatik geri ödeme işlevi bulunmamaktadır"),
      "otomatik geri ödeme olmadığı yazılmalı"
    );

    assert.ok(
      icerik.includes("iptal edebileceğiniz bir ekran"),
      "kullanıcı iptal ekranı olmadığı yazılmalı"
    );

    assert.ok(
      icerik.includes("kargo takip numarası alanı bulunmamaktadır"),
      "takip numarası alanı olmadığı yazılmalı"
    );
  });

  test("Teslimat politikası yasaklı hükümleri içermez", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.teslimatIade.yol);

    for (const yasak of [
      "hiçbir hak ileri süremez",
      "sorumluluğu tamamen sona erer",
      "Yasal ekiplerimiz",
      "bütün tüketici haklarını",
      "0850",
    ]) {
      assert.ok(!icerik.includes(yasak), `metinde bulunmamalı: ${yasak}`);
    }

    // Tutanak tutulmamasinin hak kaybina yol acmadigi acikca yazilmali.
    assert.ok(
      icerik.includes("haklarınızı kullanmanıza engel değildir"),
      "tutanak yokluğunun hak kaybı olmadığı belirtilmeli"
    );
  });

  test("KVKK metni kendi işaretlerini kullanır", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    /*
      KVKK Aydınlatma Metni iki ayrı işaret kullanır: işletme bilgisi
      ("YASİN TARAFINDAN DOLDURULACAK") ile hukuki değerlendirme
      gerektiren maddeler ("HUKUK DANIŞMANI ONAYI GEREKİYOR") aynı şey
      değildir ve karıştırılmamalıdır.
    */
    const { icerik } = await sayfa(HUKUKI_BELGELER.kvkkAydinlatma.yol);

    assert.ok(
      icerik.includes("YASİN TARAFINDAN DOLDURULACAK"),
      "işletme bilgisi işareti bulunmalı"
    );

    assert.ok(
      icerik.includes("HUKUK DANIŞMANI ONAYI GEREKİYOR"),
      "hukuki değerlendirme işareti bulunmalı"
    );
  });

  test("KVKK metninde rakip marka veya yabancı iletişim bilgisi yoktur", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.kvkkAydinlatma.yol);

    for (const yasak of [
      "Hayat Kartım",
      "hayatkartim",
      "Funda Akın",
      "0850",
      "Google Analytics",
      "SGK",
      "numara maskeleme",
    ]) {
      assert.ok(
        !icerik.includes(yasak),
        `metinde bulunmamalı: ${yasak}`
      );
    }
  });

  test("KVKK metni aydınlatma ile rızayı karıştırmaz", async (t) => {
    /*
      Bu test hukuki sayfanın METNİNİ okur. Taslak kilidi kapalıyken
      sayfa 404 döner ve metin yoktur; kilit açıldığında test
      kendiliğinden devreye girer.
    */
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — sayfalar yayında değil");

      return;
    }

    const { icerik } = await sayfa(HUKUKI_BELGELER.kvkkAydinlatma.yol);

    assert.ok(
      icerik.includes("onay veya rıza belgesi"),
      "belgenin rıza metni olmadığı açıkça yazılmalı"
    );
  });
});

describe("belgeler arası bağlantılar", () => {
  for (const belge of HUKUKI_BELGE_LISTESI) {
    test(`${belge.yol} diğer belgelere ve çerez politikasına bağlanır`, async () => {
      const { icerik } = await sayfa(belge.yol);

      for (const diger of HUKUKI_BELGE_LISTESI) {
        if (diger.yol === belge.yol) {
          continue;
        }

        assert.ok(
          icerik.includes(`href="${diger.yol}"`),
          `${belge.yol} → ${diger.yol} bağlantısı eksik`
        );
      }

      assert.ok(
        icerik.includes(`href="${CEREZ_POLITIKASI_YOLU}"`),
        `${belge.yol} → çerez politikası bağlantısı eksik`
      );
    });
  }
});

describe("footer bağlantıları", () => {
  test("ana sayfa footer'ı dört belgeye de bağlanır", async () => {
    const { icerik } = await sayfa("/");

    for (const belge of HUKUKI_BELGE_LISTESI) {
      assert.ok(
        icerik.includes(`href="${belge.yol}"`),
        `ana sayfa → ${belge.yol} bağlantısı eksik`
      );
    }
  });

  test("ürün sayfası footer'ı da bağlanır", async () => {
    const { icerik } = await sayfa("/urun/arac-stickeri");

    for (const belge of HUKUKI_BELGE_LISTESI) {
      assert.ok(
        icerik.includes(`href="${belge.yol}"`),
        `ürün sayfası → ${belge.yol} bağlantısı eksik`
      );
    }
  });
});

describe("sipariş onay alanı", () => {
  test("sipariş sayfası onay belgelerine bağlanır", async () => {
    const urun = SIPARIS_URUNLERI[0];

    const { yanit, icerik } = await sayfa(`/siparis?urun=${urun.kod}`);

    assert.equal(yanit.status, 200);

    for (const belge of SIPARIS_ONAY_BELGELERI) {
      assert.ok(
        icerik.includes(`href="${belge.yol}"`),
        `sipariş sayfası → ${belge.yol} bağlantısı eksik`
      );
    }
  });

  test("onay kutusu zorunludur", async (t) => {
    if (!HUKUKI_BELGELER_YAYINDA) {
      t.skip("taslak kilidi kapalı — onaya tabi yayınlanmış belge yok");

      return;
    }

    const urun = SIPARIS_URUNLERI[0];

    const { icerik } = await sayfa(`/siparis?urun=${urun.kod}`);

    assert.ok(icerik.includes("onaylıyorum"), "onay metni görünmeli");
  });
});

/**
 * TASLAK KİLİDİ KAPALIYKEN beklenen davranış.
 *
 * Kilit açıldığında bu blok kendini atlar; silinmesi gerekmez.
 */
describe("TASLAK KİLİDİ KAPALI", () => {
  const belgeler = Object.values(HUKUKI_BELGELER);

  test("beş hukuki sayfa da 404 döner", async (t) => {
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    for (const belge of belgeler) {
      const { yanit } = await sayfa(belge.yol);

      assert.equal(yanit.status, 404, `${belge.yol} yayında olmamalı`);
    }
  });

  test("YER TUTUCULU METİN hiçbir sayfada görünmez", async (t) => {
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    for (const belge of belgeler) {
      const { icerik } = await sayfa(belge.yol);

      assert.ok(
        !icerik.includes(DOLDURULACAK),
        `${belge.yol} taslak işareti sızdırmamalı`
      );
    }
  });

  test("çerez politikası ETKİLENMEZ ve açılır", async (t) => {
    /*
      Çerez politikasında yer tutucu yoktur ve çerez onayı bandı bu
      sayfaya bağlanır; kilit onu kapatmamalıdır.
    */
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    const { yanit } = await sayfa(CEREZ_POLITIKASI_YOLU);

    assert.equal(yanit.status, 200);
  });

  test("footer'larda yayından kaldırılmış belgeye bağlantı KALMAZ", async (t) => {
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    for (const yol of ["/", "/urun/arac-stickeri"]) {
      const { icerik } = await sayfa(yol);

      for (const belge of belgeler) {
        assert.ok(
          !icerik.includes(`href="${belge.yol}"`),
          `${yol} sayfasında ${belge.yol} bağlantısı kalmamalı`
        );
      }
    }
  });

  test("SİPARİŞ AKIŞI ÇALIŞIR: sayfa açılır, onay istenmez", async (t) => {
    /*
      En kritik kural: hukuki metinler yayından kaldırıldı diye sipariş
      akışı kırılmamalıdır. Sayfa açılmalı ve müşteri açılamayan bir
      belgeyi onaylamak zorunda bırakılmamalıdır.
    */
    if (HUKUKI_BELGELER_YAYINDA) {
      t.skip("kilit açık");

      return;
    }

    const urun = SIPARIS_URUNLERI[0];
    const { yanit, icerik } = await sayfa(`/siparis?urun=${urun.kod}`);

    assert.equal(yanit.status, 200, "sipariş sayfası açılmalı");
    assert.ok(!icerik.includes("onaylıyorum"), "onay kutusu görünmemeli");
  });
});
