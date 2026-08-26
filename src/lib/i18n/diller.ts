/**
 * ARKVIUM dil desteği — temel tanımlar.
 *
 * İlk sürümde YALNIZCA iki dil vardır. Türkçe hem varsayılan hem de geri
 * dönüş dilidir: İngilizce sözlükte eksik bir alan olursa Türkçe karşılığı
 * gösterilir, uygulama hata vermez.
 *
 * URL yapısı DEĞİŞMEZ. Adreslerin başına `/tr` veya `/en` EKLENMEZ; basılmış
 * QR etiketleri ve mevcut bağlantılar aynen çalışmaya devam eder. Dil
 * tercihi yalnızca çerezde saklanır.
 */

export const DESTEKLENEN_DILLER = ["tr", "en"] as const;

export type Dil = (typeof DESTEKLENEN_DILLER)[number];

/** Varsayılan ve geri dönüş dili. */
export const VARSAYILAN_DIL: Dil = "tr";

/**
 * Dil tercihinin saklandığı çerez.
 *
 * `httpOnly` DEĞİLDİR: dil bir güvenlik değeri değildir ve dil seçicinin
 * istemci tarafında okuyabilmesi gerekir. Oturum çerezlerinin güvenlik
 * ayarlarına DOKUNULMAZ; bu ayrı ve bağımsız bir çerezdir.
 */
export const DIL_COOKIE = "arkvium_dil";

/** Çerez ömrü: bir yıl. */
export const DIL_COOKIE_OMRU = 60 * 60 * 24 * 365;

/** Değer desteklenen bir dil mi? */
export function dilMi(deger: unknown): deger is Dil {
  return (
    typeof deger === "string" &&
    (DESTEKLENEN_DILLER as readonly string[]).includes(deger)
  );
}

/**
 * `Accept-Language` başlığından dil seçer.
 *
 * KURAL: tarayıcı Türkçe istiyorsa Türkçe, aksi hâlde İngilizce. Yani
 * desteklenmeyen tüm diller İngilizceye düşer — Türkçe bilmeyen bir
 * ziyaretçiye Türkçe göstermek, hiç anlamamasına yol açar.
 */
export function tarayiciDili(acceptLanguage: string | null): Dil {
  if (!acceptLanguage) {
    return VARSAYILAN_DIL;
  }

  // "tr-TR,tr;q=0.9,en;q=0.8" → sırayla ilk eşleşen dil kökü
  const tercihler = acceptLanguage
    .split(",")
    .map((parca) => {
      const [etiket, kalite] = parca.trim().split(";q=");

      return {
        kok: etiket.trim().toLowerCase().split("-")[0],
        agirlik: kalite ? Number.parseFloat(kalite) : 1,
      };
    })
    .filter((t) => Number.isFinite(t.agirlik))
    .sort((a, b) => b.agirlik - a.agirlik);

  for (const tercih of tercihler) {
    if (tercih.kok === "tr") {
      return "tr";
    }

    // Türkçe dışındaki her dil İngilizceye yönlendirilir.
    if (tercih.kok) {
      return "en";
    }
  }

  return VARSAYILAN_DIL;
}
