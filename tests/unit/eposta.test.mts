import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

/**
 * E-posta katmanı — gönderim anahtarı ve şablonlar.
 *
 * GÜVENLİK: Bu dosya hiçbir koşulda gerçek e-posta göndermez. Testlerin
 * hiçbirinde GMAIL_USER / GMAIL_APP_PASSWORD tanımlı değildir; taşıyıcı
 * bu yüzden hiç kurulmaz ve nodemailer ağa çıkmaz.
 *
 * En kritik davranış `EPOSTA_GONDERIMI_KAPALI` anahtarıdır: entegrasyon
 * testleri gerçek posta gitmesin diye bu anahtara güvenir.
 */

const {
  epostaGonder,
  epostaYapilandirilmisMi,
  uygulamaAdresi,
  sifreSifirlamaEpostasi,
  epostaDogrulamaEpostasi,
  taramaBildirimiEpostasi,
  devirDavetiEpostasi,
} = await import("../../src/lib/email.ts");

const ONCEKI = { ...process.env };

beforeEach(() => {
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  delete process.env.EPOSTA_GONDERIMI_KAPALI;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

afterEach(() => {
  process.env = { ...ONCEKI };
});

describe("e-posta gönderim anahtarı", () => {
  test("anahtar açıkken gönderim yapılmaz ve sebebi bildirilir", async () => {
    process.env.EPOSTA_GONDERIMI_KAPALI = "1";
    process.env.GMAIL_USER = "test@test.invalid";
    process.env.GMAIL_APP_PASSWORD = "kullanilmayacak";

    const sonuc = await epostaGonder({
      alici: "kimse@test.invalid",
      konu: "Konu",
      metin: "Metin",
    });

    assert.equal(sonuc.gonderildi, false);
    assert.equal(sonuc.hataSebebi, "E-posta gönderimi kapalı.");
  });

  test("yalnızca tam olarak '1' değeri gönderimi kapatır", async () => {
    process.env.EPOSTA_GONDERIMI_KAPALI = "true";

    const sonuc = await epostaGonder({
      alici: "kimse@test.invalid",
      konu: "Konu",
      metin: "Metin",
    });

    // Kapalı sayılmadığı için eksik yapılandırma sebebi dönmeli.
    assert.equal(sonuc.gonderildi, false);
    assert.equal(sonuc.hataSebebi, "E-posta sağlayıcısı yapılandırılmamış.");
  });

  test("yapılandırma eksikse sahte başarı üretilmez", async () => {
    const sonuc = await epostaGonder({
      alici: "kimse@test.invalid",
      konu: "Konu",
      metin: "Metin",
    });

    assert.equal(sonuc.gonderildi, false);
    assert.equal(sonuc.hataSebebi, "E-posta sağlayıcısı yapılandırılmamış.");
  });

  test("tek başına kullanıcı adı yapılandırma sayılmaz", () => {
    assert.equal(epostaYapilandirilmisMi(), false);

    process.env.GMAIL_USER = "test@test.invalid";
    assert.equal(epostaYapilandirilmisMi(), false);

    process.env.GMAIL_APP_PASSWORD = "sifre";
    assert.equal(epostaYapilandirilmisMi(), true);
  });
});

describe("uygulamaAdresi", () => {
  test("adres tanımlı değilse null döner", () => {
    assert.equal(uygulamaAdresi(), null);
  });

  test("sondaki eğik çizgiler temizlenir", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.arkvium.com///";

    assert.equal(uygulamaAdresi(), "https://www.arkvium.com");
  });

  test("baştaki ve sondaki boşluklar temizlenir", () => {
    process.env.NEXT_PUBLIC_APP_URL = "  https://www.arkvium.com  ";

    assert.equal(uygulamaAdresi(), "https://www.arkvium.com");
  });

  test("yalnızca boşluktan oluşan adres tanımsız sayılır", () => {
    process.env.NEXT_PUBLIC_APP_URL = "   ";

    assert.equal(uygulamaAdresi(), null);
  });
});

describe("e-posta şablonları", () => {
  test("şifre sıfırlama bağlantıyı ve süreyi içerir", () => {
    const eposta = sifreSifirlamaEpostasi("Ayşe Yılmaz", "https://a.test/x", 30);

    assert.match(eposta.konu, /şifre sıfırlama/i);
    assert.ok(eposta.metin.includes("https://a.test/x"));
    assert.ok(eposta.metin.includes("30 dakika"));
    assert.ok(eposta.metin.includes("Ayşe Yılmaz"));
  });

  test("e-posta doğrulama bağlantıyı ve süreyi içerir", () => {
    const eposta = epostaDogrulamaEpostasi(null, "https://a.test/dogrula", 24);

    assert.match(eposta.konu, /doğrulayın/i);
    assert.ok(eposta.metin.includes("https://a.test/dogrula"));
    assert.ok(eposta.metin.includes("24 saat"));
    assert.ok(!eposta.metin.includes("null"), "ad yoksa 'null' yazılmamalı");
  });

  test("tarama bildirimi ürün adını ve zamanı içerir, konum vermez", () => {
    const eposta = taramaBildirimiEpostasi(
      "Ayşe Yılmaz",
      "Cüzdan",
      "16.08.2026 14:30"
    );

    assert.ok(eposta.konu.includes("Cüzdan"));
    assert.ok(eposta.metin.includes("16.08.2026 14:30"));
    assert.ok(
      eposta.metin.includes("kesin konumunu içermez"),
      "bildirim konum vermediğini açıkça söylemeli"
    );
  });

  test("devir daveti gönderen adı yoksa genel ifade kullanır", () => {
    const eposta = devirDavetiEpostasi(null, "Bisiklet", "https://a.test/d", 24);

    assert.ok(eposta.metin.includes("Bir ARKVIUM kullanıcısı"));
    assert.ok(eposta.metin.includes("Bisiklet"));
    assert.ok(eposta.metin.includes("https://a.test/d"));
    assert.ok(eposta.metin.includes("24 saat"));
    assert.ok(!eposta.metin.includes("null"));
  });

  test("devir daveti onaysız sahiplik geçmeyeceğini belirtir", () => {
    const eposta = devirDavetiEpostasi("Ali Veli", "Bisiklet", "https://a.test/d", 24);

    assert.ok(eposta.metin.includes("Ali Veli"));
    assert.ok(eposta.metin.includes("siz onaylamadan hesabınıza geçmez"));
  });
});
