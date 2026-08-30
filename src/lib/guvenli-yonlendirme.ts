/**
 * Giriş sonrası dönülecek adresin güvenlik denetimi.
 *
 * AÇIK YÖNLENDİRME (open redirect) AÇIĞI
 * `?next=` parametresi kullanıcıdan gelir. Doğrulanmadan kullanılırsa
 * saldırgan `https://arkvium.com/login?next=https://sahte-site/` bağlantısı
 * paylaşıp kurbanı giriş yaptıktan sonra kendi sayfasına düşürebilir.
 * Adres çubuğunda gerçek alan adı göründüğü için kurban güvenir.
 *
 * Bu yüzden YALNIZCA uygulama içi, `/` ile başlayan göreli yollar kabul
 * edilir. Şüpheli her değer sessizce güvenli varsayılana düşer.
 */

export const VARSAYILAN_DONUS = "/account";

/**
 * Ters bölü ayrı ele alınır: tarayıcılar `/\evil.com` adresini
 * `//evil.com` gibi yorumlayıp protokol-göreli adrese çevirir.
 */
const TERS_BOLU = "\\";

/** Boşluk ve kontrol karakterleri (U+0000–U+0020 ve DEL). */
// eslint-disable-next-line no-control-regex
const KONTROL_KARAKTERI = /[\u0000-\u0020\u007f]/;

function tekSeferCoz(deger: string): string {
  try {
    return decodeURIComponent(deger);
  } catch {
    // Bozuk yüzde kodlaması: değeri olduğu gibi bırak, denetim yine yapılır.
    return deger;
  }
}

function bicimGuvenliMi(yol: string): boolean {
  if (!yol.startsWith("/")) {
    return false;
  }

  // `//host` ve `/\host` protokol-göreli adreslerdir; dış siteye çıkarlar.
  if (yol.startsWith("//") || yol.startsWith(`/${TERS_BOLU}`)) {
    return false;
  }

  if (yol.includes(TERS_BOLU)) {
    return false;
  }

  if (KONTROL_KARAKTERI.test(yol)) {
    return false;
  }

  // Şema içeren hiçbir değer göreli yol değildir.
  if (yol.includes("://")) {
    return false;
  }

  return true;
}

/**
 * Kullanıcıdan gelen dönüş adresini güvenli bir uygulama içi yola indirger.
 *
 * Denetim hem ham hem de bir kez çözülmüş değer üzerinde yapılır:
 * `/%2f%2fevil.com` gibi kodlanmış saldırılar ham hâlde masum görünür.
 */
export function guvenliDonusAdresi(
  deger: string | null | undefined,
  varsayilan: string = VARSAYILAN_DONUS
): string {
  if (typeof deger !== "string" || deger.length === 0) {
    return varsayilan;
  }

  if (!bicimGuvenliMi(deger)) {
    return varsayilan;
  }

  if (!bicimGuvenliMi(tekSeferCoz(deger))) {
    return varsayilan;
  }

  return deger;
}

/**
 * Giriş sayfasına yönlendirirken kullanılacak adresi üretir.
 * Dönüş yolu her zaman kodlanır; parametre sınırları kaçmaz.
 */
export function girisAdresi(donusYolu: string): string {
  return `/login?next=${encodeURIComponent(guvenliDonusAdresi(donusYolu))}`;
}
