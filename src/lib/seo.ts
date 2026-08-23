/**
 * Arama motoru meta değerleri.
 *
 * Canonical adresler bu sabitten üretilir ve ORTAM DEĞİŞKENİNDEN BAĞIMSIZDIR;
 * böylece önizleme dağıtımları kendini kanonik ilan edemez.
 *
 * GLOBAL canonical tanımlanmaz: her indekslenebilir sayfa kendi canonical
 * adresini kendi `metadata` nesnesinde verir.
 */

/** Canlı ana adres (apex kalıcı olarak buraya yönlenir). */
export const CANLI_ADRES = "https://www.arkvium.com";

/** Open Graph ve Twitter paylaşım görseli; canlıda mevcuttur. */
export const PAYLASIM_GORSELI = `${CANLI_ADRES}/gorseller/hero.jpg`;
