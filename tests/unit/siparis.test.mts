import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * WhatsApp sipariş yapılandırması.
 *
 * Sipariş yolu tek bir bağlantıdan ibaret: bağlantı bozuksa ürün kartındaki
 * buton ya hiç görünmez ya da boş bir sohbet açar; her iki durumda da sipariş
 * gelmez. Numara ve mesajlar tek yerde (`src/lib/siparis.ts`) tutulduğu için
 * burada doğrulanır.
 */

const { SIPARIS_URUNLERI, SIPARIS_WHATSAPP_NUMARASI, KARGO_NOTU } =
  await import("../../src/lib/siparis.ts");

const { whatsappBaglantisi, whatsappNumarasi } = await import(
  "../../src/lib/telefon.ts"
);

describe("sipariş yapılandırması", () => {
  test("beş ürün de benzersiz kodla tanımlı", () => {
    assert.equal(SIPARIS_URUNLERI.length, 5);

    const kodlar = SIPARIS_URUNLERI.map((u) => u.kod);

    assert.equal(new Set(kodlar).size, 5, "kodlar benzersiz olmalı");
  });

  test("her üründe ad, açıklama, fiyat ve sipariş mesajı dolu", () => {
    for (const urun of SIPARIS_URUNLERI) {
      assert.ok(urun.ad.length > 0, `${urun.kod}: ad boş`);
      assert.ok(urun.aciklama.length > 0, `${urun.kod}: açıklama boş`);
      assert.match(urun.fiyat, /^\d+ TL$/, `${urun.kod}: fiyat biçimi`);
      assert.ok(
        urun.siparisMesaji.startsWith("Merhaba,"),
        `${urun.kod}: sipariş mesajı`
      );
    }
  });

  test("kargo notu tüm ürünler için tanımlı", () => {
    assert.match(KARGO_NOTU, /kargo/i);
  });
});

describe("sipariş WhatsApp bağlantısı", () => {
  /** Yapılandırmadaki yer tutucu: gerçek numarayla değiştirilene kadar bu kalır. */
  const YER_TUTUCU = "90XXXXXXXXXX";

  /** Bağlantı kurulumunu sınamak için örnek numara. */
  const ORNEK_NUMARA = "905551112233";

  test("sipariş numarası ya yer tutucu ya da çözülebilir bir numara", () => {
    if (SIPARIS_WHATSAPP_NUMARASI === YER_TUTUCU) {
      return;
    }

    assert.ok(
      whatsappNumarasi(SIPARIS_WHATSAPP_NUMARASI),
      "sipariş numarası WhatsApp biçimine çevrilemiyor; sipariş butonu hiç görünmez"
    );
  });

  test("her ürün için bağlantı üretilir ve hazır mesajı taşır", () => {
    for (const urun of SIPARIS_URUNLERI) {
      const adres = whatsappBaglantisi(ORNEK_NUMARA, urun.siparisMesaji);

      assert.ok(adres, `${urun.kod}: bağlantı üretilmedi`);
      assert.ok(
        adres.startsWith(`https://api.whatsapp.com/send?phone=${ORNEK_NUMARA}`),
        `${urun.kod}: bağlantı sipariş numarasına gitmiyor`
      );

      const mesaj = new URL(adres).searchParams.get("text");

      assert.equal(mesaj, urun.siparisMesaji, `${urun.kod}: hazır mesaj hatalı`);
    }
  });

  test("çözülemeyen numarada bozuk bağlantı üretilmez", () => {
    // Yer tutucu duruyorken kartta buton hiç gösterilmez; bozuk bir WhatsApp adresi
    // üretmek yerine sipariş butonunu gizlemek bilinçli tercihtir.
    assert.equal(whatsappBaglantisi(YER_TUTUCU, "Merhaba"), null);
  });

  test("her ürünün hazır mesajı birbirinden farklı", () => {
    const mesajlar = SIPARIS_URUNLERI.map((u) => u.siparisMesaji);

    assert.equal(new Set(mesajlar).size, 5, "mesajlar birbirinden farklı olmalı");
  });
});
