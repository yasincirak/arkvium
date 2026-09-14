import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

/**
 * Geri ödeme KURALLARI — saf karar tablosu ve tutar hesabı.
 *
 * Veritabanı bağımlılığı YOKTUR; birim testleriyle doğrulanır.
 *
 * ────────────────────────────────────────────────────────────
 * OTOMATİK İADE VARSAYILAN OLARAK KAPALIDIR
 *
 * Dış ödeme çağrısı yalnızca SUNUCU TARAFI özellik bayrağı açıkken ve
 * bir yönetici işlemi başlattığında yapılır. Bayrak tanımlı değilse
 * hiçbir koşulda sağlayıcıya istek gitmez; kayıt `requested` durumunda
 * kalır ve yönetici iyzico panelinden elle işlem yapar.
 *
 * Bayrak `NEXT_PUBLIC_` DEĞİLDİR: istemci bundle'ına girmez ve
 * tarayıcıdan değiştirilemez.
 * ────────────────────────────────────────────────────────────
 */

/**
 * Otomatik iade özelliğini açan ortam değişkeni.
 *
 * YALNIZCA tam olarak "1" değeri açar. "true", "evet" veya boş dize
 * kabul edilmez: yanlışlıkla açılmasını zorlaştırır.
 */
export const OTOMATIK_IADE_ANAHTARI = "IYZICO_OTOMATIK_IADE";

export function otomatikIadeAcikMi(
  ortam: Record<string, string | undefined> = process.env
): boolean {
  return ortam[OTOMATIK_IADE_ANAHTARI] === "1";
}

export const IADE_EDILEBILIR_SIPARIS_DURUMLARI: OrderStatus[] = [
  "paid",
  "preparing",
  "shipped",
  "cancelled",
];

export const ODEME_IADE_EDILEMEZ =
  "Yalnızca başarıyla tahsil edilmiş bir ödeme iade edilebilir.";

export const SIPARIS_IADE_EDILEMEZ =
  "Bu siparişin durumu iade işlemine uygun değil.";

export const TUTAR_GECERSIZ = "İade tutarı geçersiz.";

export const TUTAR_ASIYOR =
  "İade tutarı, tahsil edilen tutardan büyük olamaz.";

export const ZATEN_ACIK_IADE =
  "Bu ödeme için zaten açık bir iade kaydı var. Önce onu sonuçlandırın.";

export const OTOMATIK_IADE_KAPALI =
  "Otomatik iade kapalı. İşlemi iyzico panelinden elle yapıp işlem kimliğini kaydedin.";

export type IadeUygunlugu = {
  uygun: boolean;
  gerekce?: string;
};

/**
 * Sipariş ve ödeme durumuna göre iade yapılabilir mi.
 *
 * İPTAL EDİLMİŞ SİPARİŞ DE İADE EDİLEBİLİR: ödemesi alınmış bir sipariş
 * iptal edildiğinde para hâlâ müşteride değildir; iade tam da o zaman
 * gerekir (bkz. siparis-iptal-kurallari.ts → paraIadesiGerekir).
 */
export function iadeUygunMu(
  siparisDurumu: OrderStatus,
  odemeDurumu: PaymentStatus
): IadeUygunlugu {
  /*
    Ödeme başarıyla tahsil edilmediyse iade edilecek para yoktur.
    Bekleyen, başarısız veya iptal edilmiş ödeme iade edilemez.
  */
  if (odemeDurumu !== "succeeded") {
    return { uygun: false, gerekce: ODEME_IADE_EDILEMEZ };
  }

  if (!IADE_EDILEBILIR_SIPARIS_DURUMLARI.includes(siparisDurumu)) {
    return { uygun: false, gerekce: SIPARIS_IADE_EDILEMEZ };
  }

  return { uygun: true };
}

/**
 * İade tutarını belirler.
 *
 * ────────────────────────────────────────────────────────────
 * TUTAR İSTEMCİDEN GÜVENİLİR KABUL EDİLMEZ
 *
 * Üst sınır her zaman ÖDEMENİN kendi tutarıdır ve o tutar sunucuda
 * sipariş kataloğundan hesaplanmıştır. İstenen tutar verilmezse tam
 * iade yapılır; verilirse tam sayı olmalı, pozitif olmalı ve tahsil
 * edilen tutarı AŞMAMALIDIR.
 *
 * Daha önce başarıyla iade edilmiş tutar da düşülür: kısmi iadeler
 * toplamı tahsil edilen tutarı geçemez.
 * ────────────────────────────────────────────────────────────
 */
export function iadeTutariniBelirle(girdi: {
  /** Ödemenin tahsil edilen tutarı (kuruş). */
  odenenKurus: number;
  /** Bu ödeme için daha önce BAŞARIYLA iade edilmiş toplam (kuruş). */
  oncekiIadeKurus?: number;
  /** Yöneticinin istediği tutar. Verilmezse kalanın tamamı iade edilir. */
  istenenKurus?: unknown;
}): number {
  const odenen = girdi.odenenKurus;
  const onceki = girdi.oncekiIadeKurus ?? 0;

  if (!Number.isSafeInteger(odenen) || odenen <= 0) {
    throw new Error(TUTAR_GECERSIZ);
  }

  const kalan = odenen - onceki;

  if (kalan <= 0) {
    throw new Error(TUTAR_ASIYOR);
  }

  // Tutar verilmediyse kalanın tamamı iade edilir.
  if (girdi.istenenKurus === undefined || girdi.istenenKurus === null) {
    return kalan;
  }

  const istenen = girdi.istenenKurus;

  if (typeof istenen !== "number" || !Number.isSafeInteger(istenen)) {
    throw new Error(TUTAR_GECERSIZ);
  }

  if (istenen <= 0) {
    throw new Error(TUTAR_GECERSIZ);
  }

  if (istenen > kalan) {
    throw new Error(TUTAR_ASIYOR);
  }

  return istenen;
}

/** Bir ödeme için açık iade kaydının tekillik anahtarı. */
export function iadeAnahtari(paymentId: string): string {
  return `iade:${paymentId}`;
}
