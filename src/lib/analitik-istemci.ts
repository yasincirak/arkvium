import {
  CEREZ_ONAY_COOKIE,
  onayDegeriCoz,
  ONAY_DEGISTI_OLAYI,
  type OnayDurumu,
} from "./cerez-onayi";

/**
 * Tarayıcı tarafı analitik gönderimi.
 *
 * TEK YOL: tüm olaylar `/api/analitik/olay` ucuna gider. Üçüncü taraf
 * hiçbir analitik hizmetine istek yapılmaz, hiçbir betik dışarıdan
 * yüklenmez ve `localStorage` kullanılmaz.
 *
 * ONAY OLMADAN HİÇ İSTEK ATILMAZ: kullanıcı çerez bildiriminde açıkça
 * kabul etmediyse `olayGonder` hemen döner. Sunucu ucu da aynı kontrolü
 * bağımsız olarak yapar (asıl garanti oradadır).
 *
 * SESSİZ BAŞARISIZLIK: gönderim başarısız olursa kullanıcıya hiçbir şey
 * gösterilmez ve sayfa akışı etkilenmez.
 */

/** Tarayıcıdaki onay çerezini okur (çerez `httpOnly` değildir). */
export function cerezOnayiOku(): OnayDurumu {
  if (typeof document === "undefined") {
    return "belirsiz";
  }

  const deger = document.cookie
    .split(";")
    .map((parca) => parca.trim())
    .find((parca) => parca.startsWith(`${CEREZ_ONAY_COOKIE}=`))
    ?.slice(CEREZ_ONAY_COOKIE.length + 1);

  return onayDegeriCoz(deger ? decodeURIComponent(deger) : undefined);
}

/**
 * Tercihi sunucuya kaydeder.
 *
 * Sunucu ucu kullanılır çünkü REDDETME kararı, daha önce oluşmuş
 * `httpOnly` analitik çerezlerinin de silinmesini gerektirir; bunu
 * yalnızca sunucu yapabilir.
 *
 * Kayıt başarılıysa sayfa içindeki dinleyicilere haber verilir
 * (ör. sayfa görüntüleme izleyicisi bekleyen olayı gönderir).
 */
export async function cerezOnayiKaydet(
  durum: "kabul" | "red"
): Promise<boolean> {
  try {
    const yanit = await fetch("/api/cerez-onayi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durum }),
      credentials: "same-origin",
    });

    if (!yanit.ok) {
      return false;
    }

    window.dispatchEvent(new CustomEvent(ONAY_DEGISTI_OLAYI));

    return true;
  } catch {
    return false;
  }
}

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

  // ONAY KAPISI: açık kabul yoksa hiçbir istek atılmaz.
  if (cerezOnayiOku() !== "kabul") {
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
