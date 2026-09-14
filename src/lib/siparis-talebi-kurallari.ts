import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * Müşteri iptal/iade talebi KURALLARI — saf karar tablosu.
 *
 * Veritabanı bağımlılığı YOKTUR; `siparis-iptal-kurallari.ts` ile aynı
 * gerekçeyle ayrı dosyadadır.
 *
 * TALEP KARAR DEĞİLDİR: bu kurallar yalnızca "müşteri bu sipariş için
 * bu türde talep açabilir mi" sorusunu yanıtlar. Talebin kabul edilip
 * edilmeyeceğine yönetici karar verir.
 */

export type TalepTuru = "cancel" | "refund";

export function talepTuruMu(deger: unknown): deger is TalepTuru {
  return deger === "cancel" || deger === "refund";
}

/** Gerekçe alanının uzunluk sınırları. */
export const GEREKCE_EN_AZ = 10;
export const GEREKCE_EN_FAZLA = 1000;

/** Yönetici notunun uzunluk sınırı. */
export const YONETICI_NOTU_EN_FAZLA = 1000;

export const TALEP_ACILAMAZ =
  "Bu sipariş için şu anda talep oluşturulamıyor.";

export const IPTAL_ICIN_GEC =
  "Sipariş kargoya verildiği için iptal edilemez. İade talebi oluşturabilirsiniz.";

export const IADE_ICIN_ERKEN =
  "Sipariş henüz kargoya verilmedi. İade yerine iptal talebi oluşturabilirsiniz.";

export const SIPARIS_IPTAL_EDILMIS =
  "Bu sipariş iptal edilmiş; yeni talep oluşturulamaz.";

export const SIPARIS_BASARISIZ =
  "Ödemesi tamamlanmamış sipariş için talep oluşturulamaz.";

export const ZATEN_AKTIF_TALEP =
  "Bu sipariş için bekleyen bir talebiniz zaten var. Sonuçlanmasını bekleyin.";

export const GEREKCE_KISA = `Gerekçe en az ${GEREKCE_EN_AZ} karakter olmalıdır.`;

export type TalepKarari = {
  izinli: boolean;
  /** İzin verilmiyorsa kullanıcıya gösterilecek gerekçe. */
  gerekce?: string;
};

/**
 * Verilen sipariş durumunda istenen türde talep açılabilir mi.
 *
 * Her durum AÇIKÇA ele alınır; varsayılan dal yoktur ki yeni bir
 * sipariş durumu eklendiğinde sessizce izinli sayılmasın.
 */
export function talepAcilabilirMi(
  durum: OrderStatus,
  tur: TalepTuru
): TalepKarari {
  switch (durum) {
    /*
      Ödemesi tamamlanmamış sipariş. İptal talebi anlamlıdır; iade
      talebi değildir çünkü ortada tahsil edilmiş bir bedel yoktur.
    */
    case "pending":
      return tur === "cancel"
        ? { izinli: true }
        : { izinli: false, gerekce: IADE_ICIN_ERKEN };

    /*
      Ödenmiş veya hazırlanıyor. Ürün henüz yola çıkmadığı için doğru
      yol iptaldir; iade talebi kargo sonrasına aittir.
    */
    case "paid":
    case "preparing":
      return tur === "cancel"
        ? { izinli: true }
        : { izinli: false, gerekce: IADE_ICIN_ERKEN };

    /*
      KARGOYA VERİLMİŞ. İptal artık mümkün değildir; müşteri iade
      talebine yönlendirilir.
    */
    case "shipped":
      return tur === "refund"
        ? { izinli: true }
        : { izinli: false, gerekce: IPTAL_ICIN_GEC };

    /*
      İptal edilmiş sipariş için yeni talep anlamsızdır.
    */
    case "cancelled":
      return { izinli: false, gerekce: SIPARIS_IPTAL_EDILMIS };

    /*
      Ödemesi başarısız sipariş hiç geçerli olmamıştır.
    */
    case "failed":
      return { izinli: false, gerekce: SIPARIS_BASARISIZ };
  }
}

/**
 * Gerekçe metnini temizler ve doğrular.
 *
 * Boş veya çok kısa gerekçe kabul edilmez: yöneticinin kararı
 * verebilmesi için bir açıklama gerekir. Üst sınır, tek bir talebin
 * veritabanını şişirmesini engeller.
 */
export function gerekceDogrula(deger: unknown): string {
  const metin = typeof deger === "string" ? deger.trim() : "";

  if (metin.length < GEREKCE_EN_AZ) {
    throw new Error(GEREKCE_KISA);
  }

  return metin.slice(0, GEREKCE_EN_FAZLA);
}
