import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * Kargo bilgisi doğrulaması ve takip bağlantısı üretimi.
 *
 * EN KRİTİK KURAL: müşteriye gösterilen takip bağlantısı bir KULLANICI
 * GİRDİSİ DEĞİLDİR. Yönetici yalnızca beyaz listedeki firmayı seçer ve
 * takip numarasını girer; adres kalıptan üretilir.
 */

const {
  KARGO_FIRMALARI,
  kargoFirmasiniBul,
  takipAdresiUret,
  kargoBilgisiDogrula,
  kargoBilgisiVarMi,
  kargoFirmaAdi,
  FIRMA_GECERSIZ,
  TAKIP_NO_GECERSIZ,
} = await import("../../src/lib/kargo.ts");

describe("firma beyaz listesi", () => {
  test("liste boş değildir ve kodlar benzersizdir", () => {
    assert.ok(KARGO_FIRMALARI.length > 0);

    const kodlar = KARGO_FIRMALARI.map((firma) => firma.kod);

    assert.equal(new Set(kodlar).size, kodlar.length);
  });

  test("tanımlı her takip kalıbı https ile başlar", () => {
    /*
      Kalıbı bilinmeyen firma için kalıp UYDURULMAZ; kalıpsız bırakılır.
      Ama kalıp varsa mutlaka https olmalıdır.
    */
    for (const firma of KARGO_FIRMALARI) {
      if (firma.takipKalibi) {
        assert.ok(
          firma.takipKalibi.startsWith("https://"),
          `${firma.kod} kalıbı https değil`
        );
        assert.ok(
          firma.takipKalibi.includes("{takipNo}"),
          `${firma.kod} kalıbında yer tutucu yok`
        );
      }
    }
  });

  test("listede olmayan kod bulunamaz", () => {
    assert.equal(kargoFirmasiniBul("olmayan-firma"), undefined);
  });

  test("metin olmayan kod bulunamaz", () => {
    for (const kod of [null, undefined, 1, {}, [], true]) {
      assert.equal(kargoFirmasiniBul(kod), undefined);
    }
  });
});

describe("takip adresi üretimi", () => {
  test("kalıbı olmayan firmada adres üretilmez", () => {
    assert.equal(takipAdresiUret({ kod: "x", ad: "X" }, "123456"), null);
  });

  test("kalıptan adres üretilir", () => {
    const adres = takipAdresiUret(
      {
        kod: "x",
        ad: "X",
        takipKalibi: "https://ornek.example/takip?no={takipNo}",
      },
      "AB-123456"
    );

    assert.equal(adres, "https://ornek.example/takip?no=AB-123456");
  });

  test("takip numarası adres kodlamasından geçirilir", () => {
    /*
      Doğrulamayı atlatan bir girdi yine de adresin YAPISINI
      değiştirememelidir.
    */
    const adres = takipAdresiUret(
      {
        kod: "x",
        ad: "X",
        takipKalibi: "https://ornek.example/takip?no={takipNo}",
      },
      "1&yonlendir=kotu.example"
    );

    assert.ok(adres);
    assert.ok(!adres.includes("&yonlendir="));
    assert.ok(adres.includes("%26"));
  });

  test("https OLMAYAN kalıptan adres üretilmez", () => {
    for (const kalip of [
      "http://ornek.example/{takipNo}",
      "javascript:alert('{takipNo}')",
      "data:text/html,{takipNo}",
      "ftp://ornek.example/{takipNo}",
    ]) {
      assert.equal(
        takipAdresiUret({ kod: "x", ad: "X", takipKalibi: kalip }, "123456"),
        null,
        kalip
      );
    }
  });

  test("bozuk kalıptan adres üretilmez", () => {
    assert.equal(
      takipAdresiUret({ kod: "x", ad: "X", takipKalibi: "{takipNo}" }, "123456"),
      null
    );
  });
});

describe("kargo bilgisi doğrulaması", () => {
  const gecerliKod = KARGO_FIRMALARI[0].kod;

  test("beyaz listede olmayan firma reddedilir", () => {
    assert.throws(
      () => kargoBilgisiDogrula({ firmaKod: "uydurma", takipNo: "123456" }),
      new RegExp(FIRMA_GECERSIZ)
    );
  });

  test("geçersiz takip numarası reddedilir", () => {
    const gecersizler = [
      "",
      "123",
      "a".repeat(41),
      "AB 123456",
      "AB/123456",
      "<script>",
      "https://kotu.example",
      "AB_123456",
      "TÜRKÇE1",
    ];

    for (const takipNo of gecersizler) {
      assert.throws(
        () => kargoBilgisiDogrula({ firmaKod: gecerliKod, takipNo }),
        new RegExp(TAKIP_NO_GECERSIZ),
        `"${takipNo}" kabul edilmemeli`
      );
    }
  });

  test("metin olmayan takip numarası reddedilir", () => {
    for (const takipNo of [null, undefined, 123456, {}, [], true]) {
      assert.throws(
        () => kargoBilgisiDogrula({ firmaKod: gecerliKod, takipNo }),
        new RegExp(TAKIP_NO_GECERSIZ)
      );
    }
  });

  test("geçerli bilgi normalleştirilerek döner", () => {
    const bilgi = kargoBilgisiDogrula({
      firmaKod: gecerliKod,
      takipNo: "  AB-123456  ",
    });

    assert.equal(bilgi.firmaKod, gecerliKod);
    assert.equal(bilgi.takipNo, "AB-123456");
  });

  test("üretilen adres ya null ya https'tir", () => {
    const bilgi = kargoBilgisiDogrula({
      firmaKod: gecerliKod,
      takipNo: "AB-123456",
    });

    if (bilgi.takipUrl !== null) {
      assert.ok(bilgi.takipUrl.startsWith("https://"));
    }
  });
});

describe("kısmi kargo bilgisi tespiti", () => {
  test("ikisi de boşsa kargo bilgisi yok sayılır", () => {
    assert.equal(kargoBilgisiVarMi({}), false);
    assert.equal(kargoBilgisiVarMi({ firmaKod: "", takipNo: "" }), false);
    assert.equal(kargoBilgisiVarMi({ firmaKod: "  ", takipNo: "  " }), false);
  });

  test("YALNIZCA BİRİ doluysa da 'var' sayılır — sunucu reddetsin diye", () => {
    /*
      Yarım bilgi sessizce yok sayılırsa yönetici kargo bilgisini
      girdiğini sanır, müşteri hiçbir şey görmez. Bu yüzden yarım girdi
      "yok" değil, "hatalı" sayılmalıdır.
    */
    assert.equal(kargoBilgisiVarMi({ firmaKod: "diger" }), true);
    assert.equal(kargoBilgisiVarMi({ takipNo: "123456" }), true);
  });
});

describe("firma adı çözümleme", () => {
  test("boş kodda null döner", () => {
    assert.equal(kargoFirmaAdi(null), null);
    assert.equal(kargoFirmaAdi(""), null);
  });

  test("bilinen kodun adı döner", () => {
    assert.equal(kargoFirmaAdi(KARGO_FIRMALARI[0].kod), KARGO_FIRMALARI[0].ad);
  });

  test("bilinmeyen kodda kodun kendisi döner", () => {
    // Eski siparişlerde listeden çıkarılmış bir firma olabilir; kayıt
    // görünmez olmamalıdır.
    assert.equal(kargoFirmaAdi("eski-firma"), "eski-firma");
  });
});
