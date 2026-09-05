import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, test } from "node:test";

/**
 * Araç QR dosyası — fiziksel ölçü ve okunabilirlik.
 *
 * Bu dosya matbaaya gider ve araç camına basılır; hatası geri alınamaz.
 * Bu yüzden ölçü, sessiz alan ve QR yapısı gerçek çıktı üzerinden ölçülür,
 * sabit bir dizeye bakılmaz.
 */

const {
  ARAC_SVG_MM,
  EN_AZ_SESSIZ_ALAN_MM,
  SESSIZ_ALAN_MODUL,
  URETIM_TABAN_ADRESI,
  sessizAlanMmHesapla,
  svgOlcuUygula,
  uretimNotuMetni,
} = await import("../../src/lib/baskici-paketi.ts");

const nodeRequire = createRequire(import.meta.url);

/** Uçtaki üretimin aynısı: aynı kütüphane, aynı ayarlar. */
function qrUret(adres: string): string {
  const React = nodeRequire("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server");
  const { QRCodeSVG } = nodeRequire("qrcode.react");

  return renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: adres,
      level: "M",
      marginSize: SESSIZ_ALAN_MODUL,
      bgColor: "#ffffff",
      fgColor: "#000000",
    })
  );
}

/** Gerçek üretim adresi uzunluğunda örnek (43 karakter base64url token). */
const ORNEK_ADRES = `${URETIM_TABAN_ADRESI}/t/${"A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v"}`;

const SVG = svgOlcuUygula(qrUret(ORNEK_ADRES), ARAC_SVG_MM);

/**
 * Tek modül sırasını yakalar.
 *
 * `qrcode.react` aynı yol içinde iki biçim kullanır: "M4 4h7" ve
 * "M34,4 h7". İkisi de eşleşmezse çizimin bir bölümü görünmez olur ve
 * test yanlış yere "bozuk" der.
 */
const MODUL_DESENI = /M(\d+)[ ,](\d+)\s*h(\d+)/g;

function viewBoxModulu(svg: string): number {
  const kutu = svg.match(/viewBox="0 0 (\d+) \1"/);

  assert.ok(kutu, "viewBox okunamadı");

  return Number(kutu[1]);
}

/** Siyah çizimin kutu kenarından kaç modül içeride başladığını ölçer. */
function kenarBosluklari(svg: string) {
  const yol = svg.match(/fill="#000000" d="([^"]+)"/)?.[1] ?? "";

  const parcalar = [...yol.matchAll(MODUL_DESENI)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    en: Number(m[3]),
  }));

  assert.ok(parcalar.length > 0, "QR çizimi bulunamadı");

  const kutu = viewBoxModulu(svg);

  return {
    sol: Math.min(...parcalar.map((p) => p.x)),
    ust: Math.min(...parcalar.map((p) => p.y)),
    sag: kutu - Math.max(...parcalar.map((p) => p.x + p.en)),
    alt: kutu - Math.max(...parcalar.map((p) => p.y + 1)),
    kutu,
  };
}

describe("araç QR dosyası — fiziksel ölçü", () => {
  test("width ve height tam 40 mm'dir", () => {
    assert.match(SVG, /<svg[^>]*\swidth="40mm"/);
    assert.match(SVG, /<svg[^>]*\sheight="40mm"/);
  });

  test("piksel ölçüsü kalmaz", () => {
    const acilis = SVG.match(/^<svg[^>]*>/)![0];

    assert.doesNotMatch(acilis, /width="\d+"/, "piksel genişlik kalmış");
    assert.doesNotMatch(acilis, /height="\d+"/, "piksel yükseklik kalmış");
  });

  test("viewBox korunur — dosya vektörel ve ölçeklenebilir kalır", () => {
    assert.ok(viewBoxModulu(SVG) > 0);
  });

  test("bağımsız dosya olarak açılabilmesi için xmlns taşır", () => {
    assert.match(SVG, /<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  });

  test("siyah QR ve opak beyaz zemin içerir", () => {
    assert.ok(SVG.includes('fill="#000000"'), "siyah QR yok");
    assert.match(
      SVG,
      /fill="#ffffff" d="M0,0 h\d+v\d+H0z"/,
      "kutuyu tamamen kaplayan opak beyaz zemin yok"
    );
  });

  test("bitmap gömülmez — çizim yalnızca vektör yollarıdır", () => {
    assert.doesNotMatch(SVG, /<image\b/);
    assert.doesNotMatch(SVG, /data:image/);
  });
});

describe("araç QR dosyası — sessiz alan", () => {
  test("dört tarafta en az 4 modül boşluk vardır", () => {
    const bosluk = kenarBosluklari(SVG);

    for (const [ad, deger] of Object.entries({
      sol: bosluk.sol,
      ust: bosluk.ust,
      sag: bosluk.sag,
      alt: bosluk.alt,
    })) {
      assert.ok(
        deger >= SESSIZ_ALAN_MODUL,
        `${ad} sessiz alan ${deger} modül; en az ${SESSIZ_ALAN_MODUL} olmalı`
      );
    }
  });

  test("sessiz alan fiziksel olarak en az 3 mm'dir", () => {
    const kutu = viewBoxModulu(SVG);
    const mm = sessizAlanMmHesapla(ARAC_SVG_MM, kutu);

    assert.ok(
      mm >= EN_AZ_SESSIZ_ALAN_MM,
      `sessiz alan ${mm.toFixed(2)} mm; en az ${EN_AZ_SESSIZ_ALAN_MM} mm olmalı`
    );
  });

  test("sessiz alan yetersiz kalırsa dosya üretilmez", () => {
    // 10 mm'lik bir kenarda 4 modül ≈ 0.9 mm; eşiğin çok altında.
    assert.throws(
      () => svgOlcuUygula(qrUret(ORNEK_ADRES), 10),
      /Sessiz alan/
    );
  });

  test("bozuk SVG sessizce kabul edilmez", () => {
    assert.throws(() => svgOlcuUygula("<div></div>", ARAC_SVG_MM));
    assert.throws(() => svgOlcuUygula("<svg></svg>", ARAC_SVG_MM), /viewBox/);
  });
});

describe("araç QR dosyası — okunabilirlik yapısı", () => {
  /**
   * Kütüphane olmadan gerçek "decode" yapılamıyor. Bunun yerine kameranın
   * kodu bulmak için aradığı YAPI doğrulanır: üç köşedeki 7x7 bulucu desen
   * (position detection pattern). Bu desenler bozuksa hiçbir telefon kodu
   * okuyamaz.
   */
  function moduller(svg: string): boolean[][] {
    const kutu = viewBoxModulu(svg);
    const izgara = Array.from({ length: kutu }, () =>
      Array.from({ length: kutu }, () => false)
    );

    const yol = svg.match(/fill="#000000" d="([^"]+)"/)?.[1] ?? "";

    for (const parca of yol.matchAll(MODUL_DESENI)) {
      const x = Number(parca[1]);
      const y = Number(parca[2]);
      const en = Number(parca[3]);

      for (let i = 0; i < en; i += 1) {
        izgara[y][x + i] = true;
      }
    }

    return izgara;
  }

  const IZGARA = moduller(SVG);
  const KUTU = viewBoxModulu(SVG);

  /** Bulucu desen: 7x7 kare, dış çerçeve siyah, iç 3x3 siyah. */
  function bulucuDesenVarMi(ustX: number, ustY: number): boolean {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const kenardaMi = x === 0 || x === 6 || y === 0 || y === 6;
        const ortadaMi = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        const beklenen = kenardaMi || ortadaMi;

        if (IZGARA[ustY + y][ustX + x] !== beklenen) {
          return false;
        }
      }
    }

    return true;
  }

  test("üç köşede de bulucu desen doğru çizilmiştir", () => {
    const kenar = SESSIZ_ALAN_MODUL;

    assert.ok(bulucuDesenVarMi(kenar, kenar), "sol üst bulucu desen bozuk");
    assert.ok(
      bulucuDesenVarMi(KUTU - kenar - 7, kenar),
      "sağ üst bulucu desen bozuk"
    );
    assert.ok(
      bulucuDesenVarMi(kenar, KUTU - kenar - 7),
      "sol alt bulucu desen bozuk"
    );
  });

  test("aynı adres her zaman aynı çizimi verir", () => {
    const ikinci = svgOlcuUygula(qrUret(ORNEK_ADRES), ARAC_SVG_MM);

    assert.equal(SVG, ikinci, "QR çizimi kararlı değil");
  });

  test("QR adresi üretim adresidir", () => {
    assert.ok(ORNEK_ADRES.startsWith("https://www.arkvium.com/t/"));
  });
});

describe("üretim notu", () => {
  const NOT = uretimNotuMetni();

  const BEKLENEN = [
    "60 x 80 mm",
    "dikey",
    "40 x 40 mm",
    "sessiz alan",
    "İÇ YÜZEY",
    "TERS BASKI",
    "esnetilmeyecek",
    "okuma testi",
  ];

  for (const parca of BEKLENEN) {
    test(`not "${parca}" bilgisini içerir`, () => {
      assert.ok(NOT.includes(parca), `eksik: ${parca}`);
    });
  }

  test("üretim notu kişisel veri veya aktivasyon kodu içermez", () => {
    assert.doesNotMatch(NOT, /@/);
    assert.doesNotMatch(NOT, /\b[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\b/);
  });
});
