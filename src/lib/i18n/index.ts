import { cookies, headers } from "next/headers";
import { DIL_COOKIE, dilMi, tarayiciDili, type Dil } from "./diller";
import { SOZLUKLER } from "./sozlukler";
import type { Sozluk } from "./tr";

/**
 * Sunucu tarafı dil çözümü.
 *
 * Dil SUNUCUDA belirlenir; ilk HTML zaten doğru dilde gelir. Bu yüzden
 * "önce yanlış dil görünüp sonra düzelme" (flash) durumu OLUŞMAZ ve
 * hidrasyon uyuşmazlığı üretmez.
 */

/**
 * Aktif dili belirler.
 *
 * SIRA:
 *   1. Kullanıcının daha önce seçtiği dil (çerez)
 *   2. Tarayıcının `Accept-Language` başlığı
 *   3. Türkçe
 */
export function aktifDil(): Dil {
  const secilen = cookies().get(DIL_COOKIE)?.value;

  if (dilMi(secilen)) {
    return secilen;
  }

  return tarayiciDili(headers().get("accept-language"));
}

/** Aktif dilin sözlüğünü döndürür. */
export function sozluk(): Sozluk {
  return SOZLUKLER[aktifDil()];
}

export { DESTEKLENEN_DILLER, DIL_COOKIE, VARSAYILAN_DIL, dilMi } from "./diller";
export type { Dil } from "./diller";
export { sozlukAl, mesajCevir } from "./sozlukler";
export type { Sozluk } from "./tr";
