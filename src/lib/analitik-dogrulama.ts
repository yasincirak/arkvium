import type { AnalyticsEventType } from "@/generated/prisma/enums";
import { SIPARIS_URUNLERI } from "./siparis";

/**
 * Analitik giriş doğrulaması — saf fonksiyonlar, veritabanı bağımlılığı YOK.
 *
 * Ayrı dosyada olmasının nedeni `request-ip.ts` ile aynı: bu kurallar
 * uygulamanın en kritik güvenlik sınırını çizer ve veritabanı bağlantısı
 * kurmadan test edilebilmelidir.
 *
 * ────────────────────────────────────────────────────────────
 * EN ÖNEMLİ KURAL
 *
 * "Satın alma" olayı TARAYICIDAN ÜRETİLEMEZ. `ISTEMCIDEN_KABUL_EDILEN`
 * listesi yalnızca görüntüleme ve sepet olaylarını içerir; ödeme
 * başlatma, başarısız ödeme ve satış olayları yalnızca sunucu tarafında,
 * doğrulanmış ödeme sonucundan yazılır.
 * ────────────────────────────────────────────────────────────
 */

export type AnalitikOlayTuru = AnalyticsEventType;

/**
 * Tarayıcıdan gelen isteklerde KABUL EDİLEN olay türleri.
 *
 * Bu listenin dışındaki hiçbir tür `/api/analitik/olay` ucundan
 * yazılamaz. Liste bilerek dardır: satış ve ödeme olayları paranın
 * gerçekten alındığı yerden üretilir.
 */
export const ISTEMCIDEN_KABUL_EDILEN = [
  "page_view",
  "product_view",
  "cart_add",
  "cart_remove",
] as const;

export type IstemciOlayTuru = (typeof ISTEMCIDEN_KABUL_EDILEN)[number];

export function istemciOlayTuruMu(deger: unknown): deger is IstemciOlayTuru {
  return (
    typeof deger === "string" &&
    (ISTEMCIDEN_KABUL_EDILEN as readonly string[]).includes(deger)
  );
}

/** Ürün kodu yalnızca sunucudaki katalogdan doğrulanır. */
export function urunKoduGecerliMi(deger: unknown): deger is string {
  return (
    typeof deger === "string" &&
    SIPARIS_URUNLERI.some((urun) => urun.kod === deger)
  );
}

/** Yol alanının en fazla uzunluğu. */
const YOL_SINIRI = 120;

/**
 * Yolu güvenli hâle getirir.
 *
 * - Yalnızca `/` ile başlayan göreli yol kabul edilir (tam adres değil).
 * - SORGU DİZESİ VE FRAGMAN ATILIR: `?token=...` gibi değerler analitiğe
 *   sızmamalıdır.
 * - Uzunluk sınırlanır.
 *
 * Geçersiz değerde null döner; olay yine kaydedilir, yalnızca yolu boş kalır.
 */
export function yoluTemizle(deger: unknown): string | null {
  if (typeof deger !== "string") {
    return null;
  }

  const ham = deger.trim();

  if (!ham.startsWith("/")) {
    return null;
  }

  const yol = ham.split("?")[0].split("#")[0];

  if (yol.length === 0) {
    return null;
  }

  return yol.slice(0, YOL_SINIRI);
}

/**
 * Analitiğe HİÇ girmemesi gereken yollar.
 *
 * Yönetim paneli ve hesap alanı müşteri davranışı değildir. İstemci
 * tarafı zaten olay göndermez; bu liste ikinci kapıdır.
 */
const HARIC_YOL_ONEKLERI = ["/admin", "/account", "/api"];

export function yolHaricMi(yol: string | null): boolean {
  if (!yol) {
    return false;
  }

  return HARIC_YOL_ONEKLERI.some(
    (onek) => yol === onek || yol.startsWith(`${onek}/`)
  );
}

