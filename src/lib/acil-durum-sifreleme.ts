import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Acil Durum Profili hassas alanları için alan bazlı şifreleme.
 *
 * Sağlık bilgileri KVKK m.6 kapsamında ÖZEL NİTELİKLİ kişisel veridir; bu
 * yüzden veritabanında düz metin tutulmaz.
 *
 * Yöntem: AES-256-GCM (kimlik doğrulamalı şifreleme).
 * - Her kayıt için RASTGELE 12 baytlık IV üretilir; IV asla tekrar kullanılmaz.
 * - GCM etiketi (16 bayt) veriyle birlikte saklanır; kurcalanan veri çözülmez.
 * - Saklama biçimi: `v1.<iv-b64url>.<etiket-b64url>.<sifreli-b64url>`
 *
 * GÜVENLİK KURALLARI:
 * - Anahtar YALNIZCA `EMERGENCY_DATA_ENCRYPTION_KEY` ortam değişkeninden gelir.
 * - Anahtar veritabanına YAZILMAZ, istemciye GÖNDERİLMEZ.
 * - Anahtar eksik/geçersizse fonksiyon HATA FIRLATIR; sessizce düz metne
 *   düşmez. Böylece yanlış yapılandırmada veri korumasız yazılamaz.
 * - Hata mesajları hiçbir zaman açık veriyi veya anahtarı İÇERMEZ.
 */

const SURUM = "v1";
const IV_UZUNLUGU = 12;
const ETIKET_UZUNLUGU = 16;

export class SifrelemeHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "SifrelemeHatasi";
  }
}

/**
 * Şifreleme anahtarını okur ve doğrular.
 *
 * Anahtar 32 baytlık (256 bit) olmalıdır; base64 veya hex kabul edilir.
 * Üretmek için: `openssl rand -base64 32`
 */
function anahtariOku(): Buffer {
  const ham = process.env.EMERGENCY_DATA_ENCRYPTION_KEY;

  if (!ham || !ham.trim()) {
    throw new SifrelemeHatasi(
      "EMERGENCY_DATA_ENCRYPTION_KEY tanımlı değil. Acil durum profili verisi şifrelenemediği için işlem durduruldu."
    );
  }

  const temiz = ham.trim();

  let anahtar: Buffer;

  if (/^[0-9a-fA-F]{64}$/.test(temiz)) {
    anahtar = Buffer.from(temiz, "hex");
  } else {
    anahtar = Buffer.from(temiz, "base64");
  }

  if (anahtar.length !== 32) {
    throw new SifrelemeHatasi(
      "EMERGENCY_DATA_ENCRYPTION_KEY 32 bayt (256 bit) olmalıdır. Değeri 'openssl rand -base64 32' ile üretin."
    );
  }

  return anahtar;
}

/** Anahtarın yapılandırıldığını sessizce kontrol eder (değeri döndürmez). */
export function sifrelemeHazirMi(): boolean {
  try {
    anahtariOku();

    return true;
  } catch {
    return false;
  }
}

/** Metni şifreler. Boş/tanımsız değer null döner (alan boş bırakılmıştır). */
export function sifrele(duzMetin: string | null | undefined): string | null {
  if (duzMetin === null || duzMetin === undefined) {
    return null;
  }

  const metin = String(duzMetin);

  if (!metin) {
    return null;
  }

  const anahtar = anahtariOku();
  const iv = randomBytes(IV_UZUNLUGU);
  const sifreleyici = createCipheriv("aes-256-gcm", anahtar, iv);

  const sifreli = Buffer.concat([
    sifreleyici.update(metin, "utf8"),
    sifreleyici.final(),
  ]);

  const etiket = sifreleyici.getAuthTag();

  return [
    SURUM,
    iv.toString("base64url"),
    etiket.toString("base64url"),
    sifreli.toString("base64url"),
  ].join(".");
}

/**
 * Şifreli metni çözer.
 *
 * Biçim bozuksa veya doğrulama etiketi tutmuyorsa `null` döner ve olay
 * loglanmaz — log kaydına hassas veri düşmemesi için. Çağıran taraf `null`
 * değeri "gösterilecek bilgi yok" olarak ele alır.
 */
export function coz(sifreliMetin: string | null | undefined): string | null {
  if (!sifreliMetin) {
    return null;
  }

  const parcalar = String(sifreliMetin).split(".");

  if (parcalar.length !== 4 || parcalar[0] !== SURUM) {
    return null;
  }

  try {
    const anahtar = anahtariOku();
    const iv = Buffer.from(parcalar[1], "base64url");
    const etiket = Buffer.from(parcalar[2], "base64url");
    const sifreli = Buffer.from(parcalar[3], "base64url");

    if (iv.length !== IV_UZUNLUGU || etiket.length !== ETIKET_UZUNLUGU) {
      return null;
    }

    const cozucu = createDecipheriv("aes-256-gcm", anahtar, iv);

    cozucu.setAuthTag(etiket);

    return Buffer.concat([cozucu.update(sifreli), cozucu.final()]).toString(
      "utf8"
    );
  } catch {
    // Kurcalanmış veya farklı anahtarla şifrelenmiş veri. Ayrıntı loglanmaz.
    return null;
  }
}
