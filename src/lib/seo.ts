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

/**
 * Herkese açık olmayan / işlem amaçlı sayfalar için arama motoru kuralı.
 *
 * Yalnızca `/` ve `/urun/arac-stickeri` indekslenir; giriş, kayıt, hesap,
 * yönetim, sipariş, ödeme sonucu ve tokene bağlı sayfalar indekslenmez.
 *
 * `robots.txt` bazı yolları zaten engelliyor; bu meta etiketi ise robots.txt
 * ile engellenmeyen (ör. /login, /register, /siparis) sayfaları da kapsar ve
 * dış bağlantıyla keşfedilen adreslerin indekslenmesini önler.
 */
export const GIZLI_SAYFA_ROBOTS = {
  index: false,
  follow: false,
} as const;
