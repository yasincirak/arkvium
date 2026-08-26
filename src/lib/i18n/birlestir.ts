/**
 * Sözlük birleştirme yardımcıları.
 *
 * İngilizce sözlük, Türkçe sözlüğün DERİN KISMİ bir kopyasıdır: eksik
 * bırakılan her alan Türkçesiyle doldurulur. Böylece çeviri tamamlanmadan da
 * uygulama çalışır ve hiçbir yerde boş metin görünmez.
 */

/** Nesnenin her seviyesini isteğe bağlı yapan tip. */
export type DerinKismi<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends readonly (infer E)[]
      ? readonly E[]
      : T[K] extends object
        ? DerinKismi<T[K]>
        : T[K];
};

/**
 * `kismi` içindeki dolu alanları `temel` üzerine yazar.
 *
 * Yalnızca düz nesnelere iner; dizi ve ilkel değerler olduğu gibi kopyalanır.
 * Sonuç YENİ bir nesnedir, `temel` değiştirilmez.
 */
export function derinBirlestir<T extends object>(
  temel: T,
  kismi: DerinKismi<T> | undefined
): T {
  if (!kismi) {
    return temel;
  }

  const sonuc = { ...temel } as Record<string, unknown>;

  for (const [anahtar, deger] of Object.entries(kismi)) {
    if (deger === undefined || deger === null) {
      continue;
    }

    const mevcut = sonuc[anahtar];

    const ikisiDeNesne =
      typeof deger === "object" &&
      !Array.isArray(deger) &&
      typeof mevcut === "object" &&
      mevcut !== null &&
      !Array.isArray(mevcut);

    sonuc[anahtar] = ikisiDeNesne
      ? derinBirlestir(mevcut as object, deger as DerinKismi<object>)
      : deger;
  }

  return sonuc as T;
}
