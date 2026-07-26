import { createHash, randomBytes, randomInt } from "crypto";

/**
 * Etiket kodu, aktivasyon kodu ve genel erişim tokenı üretimi.
 *
 * Üç farklı değer vardır, karıştırılmamalıdır:
 *
 * 1. `code` — etiketin üzerine basılan tanımlayıcı (ARK-XXXX-XXXX).
 *    Gizli DEĞİLDİR. Kullanıcı aktivasyon ekranına bunu yazar.
 *
 * 2. `activationCode` — etiketin üzerinde kazınarak açılan gizli kod.
 *    Etikete fiziksel olarak sahip olmanın kanıtıdır.
 *    Veritabanında düz metin saklanmaz, yalnızca SHA-256 özeti tutulur.
 *
 * 3. `publicToken` — QR/NFC adresinde geçen değer (/t/<token>).
 *    256 bit rastgeledir; veritabanı ID'si içermez ve tahmin edilemez.
 */

/**
 * Crockford Base32 alfabesi.
 * I, L, O ve U bilerek yoktur: 1/I, 0/O gibi karışıklıkları ve istenmeyen
 * kelimelerin oluşmasını engeller. Etiketler elle okunup yazılacağı için önemli.
 */
const ALFABE = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const KOD_ONEKI = "ARK";
const KOD_UZUNLUGU = 8; // 8 karakter × 5 bit = 40 bit
const AKTIVASYON_UZUNLUGU = 12; // 12 karakter × 5 bit = 60 bit
const PUBLIC_TOKEN_BAYT = 32; // 256 bit

export type TagDurumu = "unused" | "active" | "inactive" | "revoked";

export const TAG_DURUMLARI: readonly TagDurumu[] = [
  "unused",
  "active",
  "inactive",
  "revoked",
];

export const TAG_DURUM_ETIKETLERI: Record<TagDurumu, string> = {
  unused: "Kullanılmamış",
  active: "Aktif",
  inactive: "Pasif",
  revoked: "İptal edilmiş",
};

/** Kriptografik olarak güvenli rastgele Base32 dizisi üretir. */
function rastgeleBase32(uzunluk: number): string {
  let sonuc = "";

  for (let i = 0; i < uzunluk; i += 1) {
    // randomInt kriptografik kaynağı kullanır ve modulo yanlılığı yapmaz.
    sonuc += ALFABE[randomInt(ALFABE.length)];
  }

  return sonuc;
}

function dortluGrupla(deger: string): string {
  return deger.match(/.{1,4}/g)?.join("-") ?? deger;
}

/**
 * Etiket kodu üretir.
 *
 * Değer NORMALLEŞTİRİLMİŞ biçimde (ARKXXXXXXXX) döner ve veritabanına da
 * böyle yazılır. Kullanıcı kodu tireli, boşluklu veya küçük harfle yazsa
 * bile `etiketKoduNormalize` aynı değere indirger; böylece arama her zaman
 * eşleşir. Baskı ve ekran için `etiketKoduBicimle` kullanılır.
 */
export function etiketKoduUret(): string {
  return `${KOD_ONEKI}${rastgeleBase32(KOD_UZUNLUGU)}`;
}

/** Saklanan kodu okunabilir biçime çevirir: ARKXXXXXXXX -> ARK-XXXX-XXXX */
export function etiketKoduBicimle(kod: string): string {
  const temiz = etiketKoduNormalize(kod);
  const govde = temiz.slice(KOD_ONEKI.length);

  return `${KOD_ONEKI}-${dortluGrupla(govde)}`;
}

/**
 * Gizli aktivasyon kodu (XXXX-XXXX-XXXX).
 *
 * Okunabilirlik için tireli döner; doğrulamada `aktivasyonKoduOzetle`
 * her iki tarafı da normalleştirdiği için tire farkı sorun çıkarmaz.
 */
export function aktivasyonKoduUret(): string {
  return dortluGrupla(rastgeleBase32(AKTIVASYON_UZUNLUGU));
}

/** QR/NFC adresinde kullanılan tahmin edilemez token. */
export function publicTokenUret(): string {
  return randomBytes(PUBLIC_TOKEN_BAYT).toString("base64url");
}

/**
 * Kullanıcı girdisini normalleştirir.
 * Boşluk, tire ve küçük harf farklarını tolere eder; ayrıca Base32'de
 * bulunmayan benzer karakterleri karşılıklarına çevirir (O -> 0, I -> 1).
 */
export function kodNormalize(girdi: string): string {
  return girdi
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

/** Etiket kodunu karşılaştırma için normalleştirir (ARK öneki dâhil). */
export function etiketKoduNormalize(girdi: string): string {
  const temiz = kodNormalize(girdi);

  return temiz.startsWith(KOD_ONEKI) ? temiz : `${KOD_ONEKI}${temiz}`;
}

/**
 * Aktivasyon kodunun veritabanında saklanan özetini üretir.
 *
 * Kod önce normalleştirilir; böylece kullanıcının yazım farkları
 * (küçük harf, tire, O/0 karışıklığı) doğrulamayı bozmaz.
 */
export function aktivasyonKoduOzetle(kod: string): string {
  return createHash("sha256").update(kodNormalize(kod)).digest("hex");
}

export type UretilenEtiket = {
  code: string;
  activationCode: string;
  publicToken: string;
  activationCodeHash: string;
};

/**
 * Baskıya hazır tek bir etiket üretir.
 * `activationCode` yalnızca burada döner; veritabanına yazılmaz.
 */
export function etiketUret(): UretilenEtiket {
  const activationCode = aktivasyonKoduUret();

  return {
    code: etiketKoduUret(),
    activationCode,
    publicToken: publicTokenUret(),
    activationCodeHash: aktivasyonKoduOzetle(activationCode),
  };
}

/** Etiketin genel erişim adresini üretir. */
export function etiketAdresi(publicToken: string, tabanAdres: string): string {
  return `${tabanAdres.replace(/\/+$/, "")}/t/${publicToken}`;
}
