import { randomBytes } from "crypto";

/**
 * Anonim ziyaretçi kimliği.
 *
 * KİŞİSEL VERİ DEĞİLDİR ve kişisel veriden TÜRETİLMEZ: değer tamamen
 * rastgeledir, IP adresi veya tarayıcı parmak izi kullanılmaz. Yalnızca
 * "tekil ziyaretçi" sayımı ve huni hesabı için vardır.
 *
 * Çerez BİRİNCİ TARAFTIR ve üçüncü taraf hiçbir hizmete gönderilmez.
 * `httpOnly` olduğu için sayfa betikleri okuyamaz; değer yalnızca
 * sunucuya gider.
 */

export const ZIYARETCI_COOKIE = "arkvium_va";

/** Ziyaretçi kimliğinin ömrü (saniye). */
export const ZIYARETCI_COOKIE_OMRU = 60 * 60 * 24 * 180;

/** Kimlik uzunluğu: 16 bayt = 32 onaltılık karakter. */
const KIMLIK_UZUNLUGU = 32;

export function ziyaretciKimligiUret(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Çerezden okunan değeri doğrular.
 *
 * Biçimi bozuk değer KABUL EDİLMEZ: aksi hâlde istemci çereze istediği
 * metni yazıp analitik satırlarına kendi seçtiği bir etiket
 * ekleyebilirdi.
 */
export function ziyaretciKimligiGecerliMi(deger: unknown): deger is string {
  return (
    typeof deger === "string" &&
    deger.length === KIMLIK_UZUNLUGU &&
    /^[0-9a-f]+$/.test(deger)
  );
}

export const ziyaretciCookieAyarlari = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: ZIYARETCI_COOKIE_OMRU,
} as const;

/**
 * ZİYARET (oturum) çerezi.
 *
 * "Tekil ziyaretçi" ile "toplam ziyaret" arasındaki farkı üretir: aynı
 * kişi bir hafta içinde üç kez gelirse tekil ziyaretçi 1, ziyaret 3 olur.
 *
 * Kısa ömürlüdür ve her olayda tazelenir (kayan pencere): ziyaretçi
 * `ZIYARET_COOKIE_OMRU` kadar hareketsiz kalırsa bir sonraki gelişi YENİ
 * ziyaret sayılır.
 *
 * Ziyaretçi kimliği gibi tamamen rastgeledir; kişisel veriden türetilmez.
 */
export const ZIYARET_COOKIE = "arkvium_vo";

/** Ziyaretin hareketsizlik sonrası sonlanma süresi (saniye). */
export const ZIYARET_COOKIE_OMRU = 30 * 60;

export function ziyaretKimligiUret(): string {
  return randomBytes(16).toString("hex");
}

export const ziyaretCookieAyarlari = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: ZIYARET_COOKIE_OMRU,
} as const;
