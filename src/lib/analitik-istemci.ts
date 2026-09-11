/**
 * Tarayıcı tarafı analitik gönderimi.
 *
 * TEK YOL: tüm olaylar `/api/analitik/olay` ucuna gider. Üçüncü taraf
 * hiçbir analitik hizmetine istek yapılmaz, hiçbir betik dışarıdan
 * yüklenmez ve `localStorage` kullanılmaz.
 *
 * SESSİZ BAŞARISIZLIK: gönderim başarısız olursa kullanıcıya hiçbir şey
 * gösterilmez ve sayfa akışı etkilenmez.
 */

export type IstemciOlayi = {
  tur: "page_view" | "product_view" | "cart_add" | "cart_remove";
  /** Yalnızca yol; sorgu dizesi gönderilmez. */
  yol?: string;
  urunKodu?: string;
};

/** Analitiğe hiç gönderilmeyen yollar (yönetim ve hesap alanı). */
const HARIC_ONEKLER = ["/admin", "/account"];

export function yolHaricTutuluyorMu(yol: string): boolean {
  return HARIC_ONEKLER.some(
    (onek) => yol === onek || yol.startsWith(`${onek}/`)
  );
}

export function olayGonder(olay: IstemciOlayi): void {
  if (typeof window === "undefined") {
    return;
  }

  const yol = olay.yol ?? window.location.pathname;

  if (yolHaricTutuluyorMu(yol)) {
    return;
  }

  const govde = JSON.stringify({
    tur: olay.tur,
    yol,
    ...(olay.urunKodu ? { urunKodu: olay.urunKodu } : {}),
  });

  /*
    `keepalive`: kullanıcı bağlantıya tıklayıp sayfadan ayrılsa bile
    istek iptal edilmez. "Satın Al" tıklamasının kaybolmaması için gerekli.
  */
  void fetch("/api/analitik/olay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: govde,
    keepalive: true,
    // Çerez gönderimi zorunlu: tekil ziyaretçi kimliği çerezde taşınır.
    credentials: "same-origin",
  }).catch(() => {
    // Sessiz: analitik hatası kullanıcı akışını bozmaz.
  });
}
