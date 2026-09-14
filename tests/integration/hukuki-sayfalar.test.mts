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
 * Doğrulananlar:
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

  test("satıcı bilgisi gerektiren sayfalar doldurulacak alan işaretler", async () => {
    /*
      Satıcı unvanı, adresi ve vergi bilgisi koddan doğrulanamaz;
      uydurulmak yerine açıkça işaretlenmelidir.
    */
    for (const belge of [
      HUKUKI_BELGELER.kvkkAydinlatma,
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

  test("onay kutusu zorunludur", async () => {
    const urun = SIPARIS_URUNLERI[0];

    const { icerik } = await sayfa(`/siparis?urun=${urun.kod}`);

    assert.ok(
      icerik.includes("onaylıyorum"),
      "onay metni görünmeli"
    );
  });
});
