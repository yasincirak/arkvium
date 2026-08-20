/**
 * Sipariş durumlarının yönetim panelindeki gösterimi.
 *
 * Liste ve detay sayfası aynı etiketleri kullansın diye tek kaynakta tutulur;
 * durum adları değişince yalnızca burası güncellenir.
 */

/** Sipariş durumlarının Türkçe karşılıkları. */
export const DURUM_ETIKETLERI: Record<string, string> = {
  pending: "Ödeme bekleniyor",
  paid: "Ödendi",
  preparing: "Hazırlanıyor",
  shipped: "Kargolandı",
  cancelled: "İptal edildi",
  failed: "Başarısız",
};

/** Durum rozetinin renk sınıfları. */
export function durumSinifi(durum: string): string {
  if (durum === "paid" || durum === "shipped") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (durum === "preparing") {
    return "border-indigo-500/30 bg-indigo-500/10 text-indigo-200";
  }

  if (durum === "failed" || durum === "cancelled") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-white/10 bg-white/10 text-white/70";
}

/** Durumun Türkçe karşılığı; bilinmeyen durumda ham değer döner. */
export function durumEtiketi(durum: string): string {
  return DURUM_ETIKETLERI[durum] ?? durum;
}
