/**
 * Çerez onayı — saf tanımlar ve kurallar.
 *
 * Veritabanı bağımlılığı YOKTUR; hem sunucu hem tarayıcı tarafından
 * kullanılır ve birim testleriyle doğrulanır.
 *
 * ────────────────────────────────────────────────────────────
 * KURAL: ONAY OLMADAN ANALİTİK YOK
 *
 * `arkvium_va` (ziyaretçi) ve `arkvium_vo` (ziyaret) çerezleri ZORUNLU
 * DEĞİLDİR. KVKK ve çerez mevzuatı gereği bu çerezler kullanıcı AÇIKÇA
 * kabul etmeden oluşturulamaz ve hiçbir analitik olay gönderilemez.
 *
 * Kural iki katmanda uygulanır:
 *   1. Tarayıcı: onay yoksa `olayGonder` hiç istek atmaz.
 *   2. Sunucu: `/api/analitik/olay` onay çerezini doğrular; onay yoksa
 *      hiçbir satır yazmaz ve HİÇBİR çerez ayarlamaz.
 *
 * İkinci katman asıl garantidir: istemci atlatılsa bile çerez oluşmaz.
 * ────────────────────────────────────────────────────────────
 *
 * BU ÇEREZİN KENDİSİ ZORUNLUDUR: kullanıcının kararını hatırlamak
 * mevzuatın gerektirdiği bir işlevdir ve onay gerektirmez. Değer
 * kişisel veri içermez; yalnızca "kabul" veya "red" ile metin sürümünü
 * taşır.
 */

export const CEREZ_ONAY_COOKIE = "arkvium_cerez_onayi";

/**
 * Onay metninin sürümü.
 *
 * Çerez politikası veya toplanan çerezler DEĞİŞİRSE bu değer artırılır;
 * eski sürümle verilmiş onaylar geçersiz sayılır ve kullanıcıya yeniden
 * sorulur (acil durum profilindeki `ONAY_METNI_SURUMU` ile aynı kalıp).
 */
export const ONAY_SURUMU = "1";

/** Onay kaydının saklanma süresi (saniye). Bir yıl. */
export const ONAY_COOKIE_OMRU = 60 * 60 * 24 * 365;

/**
 * `belirsiz`: kullanıcı henüz karar vermedi veya kaydı eski sürüme ait.
 * Bu durumda analitik ÇALIŞMAZ ve bildirim gösterilir.
 */
export type OnayDurumu = "kabul" | "red" | "belirsiz";

export function onayDurumuMu(deger: unknown): deger is "kabul" | "red" {
  return deger === "kabul" || deger === "red";
}

/** Çereze yazılacak değeri üretir: "kabul:1" / "red:1". */
export function onayDegeriYaz(durum: "kabul" | "red"): string {
  return `${durum}:${ONAY_SURUMU}`;
}

/**
 * Çerez değerini çözer.
 *
 * Sürüm TAM EŞİTLİKLE karşılaştırılır: politika değiştiğinde eski onay
 * sessizce geçerli sayılmaz, kullanıcıya yeniden sorulur.
 */
export function onayDegeriCoz(deger: unknown): OnayDurumu {
  if (typeof deger !== "string") {
    return "belirsiz";
  }

  const [durum, surum] = deger.split(":");

  if (!onayDurumuMu(durum) || surum !== ONAY_SURUMU) {
    return "belirsiz";
  }

  return durum;
}

/** Analitik çerezleri ve olayları YALNIZCA açık kabulde çalışır. */
export function analitikIzinliMi(cerezDegeri: unknown): boolean {
  return onayDegeriCoz(cerezDegeri) === "kabul";
}

/**
 * Onay çerezinin ayarları.
 *
 * `httpOnly` DEĞİLDİR ve bu bilinçlidir: banner'ın her sayfa açılışında
 * sunucuya sormadan "karar verilmiş mi" sorusunu yanıtlayabilmesi
 * gerekir. Değer kişisel veri taşımaz, yalnızca kararın kendisidir.
 */
export const onayCookieAyarlari = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: ONAY_COOKIE_OMRU,
} as const;

/**
 * Tarayıcıda onay değişince gönderilen olay adı.
 *
 * Kullanıcı bannerdan "Kabul Et" dediğinde o anki sayfa görüntülemesinin
 * kaybolmaması için izleyici bu olayı dinler.
 */
export const ONAY_DEGISTI_OLAYI = "arkvium:cerez-onayi-degisti";
