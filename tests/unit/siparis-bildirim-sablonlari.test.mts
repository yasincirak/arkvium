import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * İptal / kargo / iade bilgilendirme e-postası şablonları.
 *
 * EN KRİTİK KURAL: bu metinlerde HASSAS VERİ OLMAZ. Sağlık bilgisi,
 * kimlik numarası, adres, telefon, şifre, kart verisi veya ödeme
 * sağlayıcısı anahtarı hiçbir şablona girmez.
 *
 * TÜRKÇE BÜYÜK/KÜÇÜK HARF TUZAĞI: JavaScript'te `"İ".toLowerCase()`
 * "i" değil "i̇" üretir. Bu yüzden metin aramalarında `/i` bayrağı
 * kullanılmaz; kalıplar birebir yazılır.
 */

const {
  siparisIptalEpostasi,
  siparisKargoEpostasi,
  siparisIadeEpostasi,
} = await import("../../src/lib/email.ts");

const NUMARA = "ARK-2026-0001";
const AD = "Test Müşteri";
const TAKIP = "https://ornek.example/odeme/sonuc/gizli-token";

/** Hiçbir şablonda görünmemesi gereken değerler. */
const SIZMAMASI_GEREKENLER = [
  "05551112233",
  "Örnek Mahallesi 1. Sokak No 2 Daire 3",
  "12345678901",
  "sandbox-abc123",
  "4111111111111111",
  "GMAIL_APP_PASSWORD",
];

describe("iptal e-postası", () => {
  test("sipariş numarası konuda ve gövdede yer alır", () => {
    const e = siparisIptalEpostasi(AD, NUMARA, "304,00 TL", true, TAKIP);

    assert.ok(e.konu.includes(NUMARA));
    assert.ok(e.metin.includes(NUMARA));
    assert.ok(e.metin.includes("304,00 TL"));
  });

  test("ödeme alınmışsa iade süreci bildirilir", () => {
    const e = siparisIptalEpostasi(AD, NUMARA, "304,00 TL", true, TAKIP);

    assert.ok(e.metin.includes("iade süreci"));
  });

  test("ÖDEME ALINMAMIŞSA iade sözü VERİLMEZ", () => {
    /*
      En kolay yapılacak hata: her iptalde "paranız iade edilecek"
      demek. Tahsilat yoksa bu yanlış bir taahhüttür.
    */
    const e = siparisIptalEpostasi(AD, NUMARA, "304,00 TL", false, TAKIP);

    assert.ok(e.metin.includes("iade\nişlemi yapılmayacaktır"));
    assert.ok(!e.metin.includes("iade süreci yürütülecektir"));
  });

  test("takip adresi yoksa boş bağlantı satırı yazılmaz", () => {
    const e = siparisIptalEpostasi(AD, NUMARA, "304,00 TL", true, null);

    assert.ok(!e.metin.includes("http"));
  });

  test("ad boşsa şablon yine üretilir", () => {
    const e = siparisIptalEpostasi(null, NUMARA, "304,00 TL", true, TAKIP);

    assert.ok(e.metin.length > 0);
    assert.ok(!e.metin.includes("null"));
  });
});

describe("kargo e-postası", () => {
  const KARGO = {
    firmaAdi: "Diğer / elden teslim",
    takipNo: "AB-1234567890",
    takipUrl: null,
  };

  test("doğrulanmış firma ve takip numarası yazılır", () => {
    const e = siparisKargoEpostasi(AD, NUMARA, KARGO, TAKIP);

    assert.ok(e.konu.includes(NUMARA));
    assert.ok(e.metin.includes("Diğer / elden teslim"));
    assert.ok(e.metin.includes("AB-1234567890"));
  });

  test("kargo bilgisi YOKSA uydurulmaz", () => {
    const e = siparisKargoEpostasi(
      AD,
      NUMARA,
      { firmaAdi: null, takipNo: null, takipUrl: null },
      TAKIP
    );

    assert.ok(e.metin.includes("Kargo firması ve takip numarası eklendiğinde"));
    assert.ok(!e.metin.includes("Takip numarası:"));
  });

  test("YARIM kargo bilgisi gösterilmez", () => {
    for (const kargo of [
      { firmaAdi: "Diğer / elden teslim", takipNo: null, takipUrl: null },
      { firmaAdi: null, takipNo: "AB-1234567890", takipUrl: null },
    ]) {
      const e = siparisKargoEpostasi(AD, NUMARA, kargo, TAKIP);

      assert.ok(
        e.metin.includes("Kargo firması ve takip numarası eklendiğinde"),
        "yarım bilgide bilgi satırı yazılmamalı"
      );
      assert.ok(!e.metin.includes("AB-1234567890"));
    }
  });

  test("takip bağlantısı varsa eklenir", () => {
    const e = siparisKargoEpostasi(
      AD,
      NUMARA,
      { ...KARGO, takipUrl: "https://kargo.example/t/AB-1234567890" },
      TAKIP
    );

    assert.ok(e.metin.includes("https://kargo.example/t/AB-1234567890"));
  });
});

describe("iade e-postası", () => {
  test("iade edilen tutar yazılır", () => {
    const e = siparisIadeEpostasi(AD, NUMARA, "304,00 TL", TAKIP);

    assert.ok(e.konu.includes(NUMARA));
    assert.ok(e.metin.includes("304,00 TL"));
  });

  test("GÜN SAYISI TAAHHÜT EDİLMEZ", () => {
    /*
      "3-5 iş günü içinde hesabınızda" gibi bir ifade bankaya bağlı
      olduğu için taahhüt edilemez.
    */
    const e = siparisIadeEpostasi(AD, NUMARA, "304,00 TL", TAKIP);

    assert.ok(!/\d+\s*(iş günü|gün|hafta)/.test(e.metin));
    assert.ok(e.metin.includes("bankanıza bağlıdır"));
  });

  test("sağlayıcı işlem kimliği parametresi bile yoktur", () => {
    /*
      Şablon imzası yalnızca ad, sipariş numarası, tutar ve takip
      adresini alır (`dil` varsayılanlı olduğu için `length`e girmez).
      Sağlayıcı işlem kimliği veya ödeme anahtarı için parametre YOKTUR;
      dolayısıyla yanlışlıkla bile e-postaya konamaz.
    */
    assert.equal(siparisIadeEpostasi.length, 4);
  });
});

describe("hiçbir şablonda hassas veri yoktur", () => {
  test("adres, telefon, kimlik ve ödeme anahtarı sızmaz", () => {
    const metinler = [
      siparisIptalEpostasi(AD, NUMARA, "304,00 TL", true, TAKIP).metin,
      siparisIptalEpostasi(AD, NUMARA, "304,00 TL", false, TAKIP).metin,
      siparisKargoEpostasi(
        AD,
        NUMARA,
        {
          firmaAdi: "Diğer / elden teslim",
          takipNo: "AB-1234567890",
          takipUrl: "https://kargo.example/t/AB-1234567890",
        },
        TAKIP
      ).metin,
      siparisIadeEpostasi(AD, NUMARA, "304,00 TL", TAKIP).metin,
    ];

    for (const metin of metinler) {
      for (const gizli of SIZMAMASI_GEREKENLER) {
        assert.ok(!metin.includes(gizli), `"${gizli}" sızmamalı`);
      }
    }
  });

  test("şablonlar yer tutucu bırakmaz", () => {
    const metinler = [
      siparisIptalEpostasi(AD, NUMARA, "304,00 TL", true, TAKIP),
      siparisKargoEpostasi(
        AD,
        NUMARA,
        { firmaAdi: "X", takipNo: "AB-1234", takipUrl: null },
        TAKIP
      ),
      siparisIadeEpostasi(AD, NUMARA, "304,00 TL", TAKIP),
    ];

    for (const e of metinler) {
      assert.ok(!e.konu.includes("{"), `konuda yer tutucu kaldı: ${e.konu}`);
      assert.ok(!e.metin.includes("{"), "gövdede yer tutucu kaldı");
    }
  });
});
