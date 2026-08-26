import { derinBirlestir } from "./birlestir";
import type { Dil } from "./diller";
import { EN } from "./en";
import { TR, type Sozluk } from "./tr";

/**
 * Birleştirilmiş sözlükler — İSTEK BAĞLAMINDAN BAĞIMSIZ.
 *
 * `index.ts` `next/headers` kullanır ve yalnızca istek kapsamında
 * çağrılabilir. E-posta şablonları gibi arka plan kodları buradan okur;
 * böylece `cookies()`/`headers()` bağımlılığı taşımazlar ve birim
 * testlerinde çalışabilirler.
 */
export const SOZLUKLER: Record<Dil, Sozluk> = {
  tr: TR,
  // Eksik İngilizce alanlar Türkçesiyle doldurulur.
  en: derinBirlestir(TR, EN),
};

/** Belirli bir dilin sözlüğü. */
export function sozlukAl(dil: Dil): Sozluk {
  return SOZLUKLER[dil];
}

/** Sunucudan gelen mesajı verilen dile çevirir; karşılık yoksa aynen döner. */
export function mesajCevir(ceviri: Sozluk, metin: string): string {
  return (ceviri.mesajlar as Record<string, string>)[metin] ?? metin;
}
