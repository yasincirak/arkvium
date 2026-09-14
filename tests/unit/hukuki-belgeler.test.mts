import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Hukuki belge kayıt defteri ve sayfa varlığı.
 *
 * Bu testin amacı, footer ve sipariş formundaki bağlantıların BOŞA
 * DÜŞMEMESİNİ garanti etmektir: kayıt defterinde tanımlı her belge için
 * gerçekten bir sayfa dosyası bulunmalıdır. Bir belge yeniden
 * adlandırılır ama sayfası taşınmazsa test düşer.
 */

const {
  HUKUKI_BELGELER,
  HUKUKI_BELGE_LISTESI,
  SIPARIS_ONAY_BELGELERI,
  CEREZ_POLITIKASI_YOLU,
  DOLDURULACAK,
} = await import("../../src/lib/hukuki-belgeler.ts");

/** Adresten App Router sayfa dosyasının yolunu üretir. */
function sayfaDosyasi(yol: string): string {
  return resolve("src/app", yol.replace(/^\//, ""), "page.tsx");
}

describe("kayıt defteri tutarlılığı", () => {
  test("dört hukuki belge tanımlıdır", () => {
    assert.equal(HUKUKI_BELGE_LISTESI.length, 4);
  });

  test("her belgenin adresi kök yoldan başlar", () => {
    for (const belge of HUKUKI_BELGE_LISTESI) {
      assert.ok(
        belge.yol.startsWith("/"),
        `${belge.baslik} adresi "/" ile başlamalı`
      );
    }
  });

  test("adresler ve başlıklar benzersizdir", () => {
    const yollar = HUKUKI_BELGE_LISTESI.map((b) => b.yol);
    const basliklar = HUKUKI_BELGE_LISTESI.map((b) => b.baslik);

    assert.equal(new Set(yollar).size, yollar.length, "adresler benzersiz");
    assert.equal(
      new Set(basliklar).size,
      basliklar.length,
      "başlıklar benzersiz"
    );
  });

  test("her belgenin sürümü tanımlıdır", () => {
    for (const belge of HUKUKI_BELGE_LISTESI) {
      assert.match(
        belge.surum,
        /^\d+\.\d+$/,
        `${belge.baslik} sürümü "1.0" biçiminde olmalı`
      );
    }
  });

  test("çerez politikası hukuki belge listesinde DEĞİLDİR", () => {
    /*
      Çerez politikası sipariş onayına konu değildir; ayrı sayfadır ve
      çerez bildiriminden erişilir.
    */
    assert.ok(
      !HUKUKI_BELGE_LISTESI.some((b) => b.yol === CEREZ_POLITIKASI_YOLU)
    );
  });
});

describe("sayfalar gerçekten var (bağlantılar boşa düşmez)", () => {
  test("her hukuki belge için bir sayfa dosyası bulunur", () => {
    for (const belge of HUKUKI_BELGE_LISTESI) {
      assert.ok(
        existsSync(sayfaDosyasi(belge.yol)),
        `${belge.yol} için sayfa dosyası yok`
      );
    }
  });

  test("çerez politikası sayfası da bulunur", () => {
    assert.ok(existsSync(sayfaDosyasi(CEREZ_POLITIKASI_YOLU)));
  });
});

describe("sipariş onayı belgeleri", () => {
  test("onaya dâhil belgelerin OrderConsent kodu vardır", () => {
    /*
      `OrderConsent.belge` alanına yazılacak kod olmadan onay
      kaydedilemez; onaya dâhil edilen her belgenin kodu bulunmalıdır.
    */
    for (const belge of SIPARIS_ONAY_BELGELERI) {
      assert.ok(
        belge.onayBelgeKodu,
        `${belge.baslik} için OrderConsent kodu tanımlı olmalı`
      );
    }
  });

  test("kodlar şemadaki değerlerle eşleşir", () => {
    // prisma/schema.prisma OrderConsent: mesafeli_satis | on_bilgilendirme
    // | kvkk_aydinlatma | iade_kosullari
    const semaKodlari = [
      "mesafeli_satis",
      "on_bilgilendirme",
      "kvkk_aydinlatma",
      "iade_kosullari",
    ];

    for (const belge of SIPARIS_ONAY_BELGELERI) {
      assert.ok(
        semaKodlari.includes(belge.onayBelgeKodu as string),
        `${belge.onayBelgeKodu} şemada tanımlı değil`
      );
    }
  });

  test("onay kodları benzersizdir", () => {
    const kodlar = SIPARIS_ONAY_BELGELERI.map((b) => b.onayBelgeKodu);

    assert.equal(new Set(kodlar).size, kodlar.length);
  });

  test("gizlilik politikası sipariş onayına dâhil DEĞİLDİR", () => {
    // Bilgilendirme belgesidir; sözleşme onayına konu olmaz.
    assert.equal(HUKUKI_BELGELER.gizlilikPolitikasi.siparisOnayinaDahil, false);
    assert.equal(HUKUKI_BELGELER.gizlilikPolitikasi.onayBelgeKodu, null);
  });

  test("sözleşme, aydınlatma ve iade koşulları onaya dâhildir", () => {
    assert.equal(SIPARIS_ONAY_BELGELERI.length, 3);
  });
});

describe("doldurulacak alan işareti", () => {
  test("işaret açık ve aranabilir bir metindir", () => {
    assert.equal(DOLDURULACAK, "[YAYIN ÖNCESİ DOLDURULACAK]");
  });
});
