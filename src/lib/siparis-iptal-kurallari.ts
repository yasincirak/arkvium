import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * Sipariş iptal KURALLARI — saf karar tablosu.
 *
 * Veritabanı bağımlılığı YOKTUR; `request-ip.ts` ve
 * `analitik-dogrulama.ts` ile aynı gerekçeyle ayrı dosyadadır: bu
 * kurallar iptal davranışının tamamını belirler ve veritabanı
 * bağlantısı kurmadan test edilebilmelidir.
 */

/** İptal edilebilen durumlar ve her biri için uygulanacak davranış. */
export type IptalDavranisi = {
  /** Bu durumdan iptal edilebilir mi. */
  izinli: boolean;
  /** İptalde QR rezervasyonu stoğa döndürülür mü. */
  stokGeriDoner: boolean;
  /** Para iadesi gerekip gerekmediği (bu katman ödeme yapmaz). */
  paraIadesiGerekir: boolean;
  /** İzinli değilse kullanıcıya gösterilecek gerekçe. */
  gerekce?: string;
};

export const KARGOYA_VERILMIS =
  "Kargoya verilmiş sipariş iptal edilemez. Bunun yerine iade talebi oluşturun.";

export const ZATEN_IPTAL = "Bu sipariş zaten iptal edilmiş.";

export const ODEME_BASARISIZ_IPTAL =
  "Ödemesi başarısız olan sipariş zaten geçerli değildir; iptal edilemez.";

export const GECERSIZ_DURUM = "Geçersiz sipariş durumu.";

export const IPTAL_EDILEMEDI =
  "Sipariş iptal edilemedi. Sayfayı yenileyip güncel durumu kontrol edin.";

/**
 * Bir sipariş durumunun iptal davranışını belirler.
 *
 * SAF FONKSİYON: veritabanına bakmaz, birim testleriyle doğrulanır.
 * Her durum için karar AÇIKÇA yazılmıştır; varsayılan dal yoktur ki
 * yeni bir durum eklendiğinde sessizce "izinli" sayılmasın.
 */
export function iptalDavranisi(durum: OrderStatus): IptalDavranisi {
  switch (durum) {
    /*
      Ödeme tamamlanmamış. İptal serbesttir ve ayrılan QR etiketleri
      stoğa döner. Para alınmadığı için iade gerekmez.
    */
    case "pending":
      return { izinli: true, stokGeriDoner: true, paraIadesiGerekir: false };

    /*
      Ödeme alınmış ama henüz hazırlanmaya başlanmamış. İptal
      edilebilir; etiketler stoğa döner ve PARA İADESİ GEREKİR.
    */
    case "paid":
      return { izinli: true, stokGeriDoner: true, paraIadesiGerekir: true };

    /*
      Hazırlanıyor. Henüz kargoya verilmediği için iptal edilebilir;
      etiketler stoğa döner ve para iadesi gerekir.
    */
    case "preparing":
      return { izinli: true, stokGeriDoner: true, paraIadesiGerekir: true };

    /*
      KARGOYA VERİLMİŞ. Normal iptal gibi işlenmez: ürün yola çıkmıştır
      ve etiketler fiziksel olarak müşteriye gitmiştir. Stoğa döndürmek
      gerçeğe aykırı olurdu. Müşteri iade talebi akışına yönlendirilir.
    */
    case "shipped":
      return {
        izinli: false,
        stokGeriDoner: false,
        paraIadesiGerekir: false,
        gerekce: KARGOYA_VERILMIS,
      };

    /*
      Zaten iptal edilmiş. Tekrar iptal ikinci bir olay yazmamalıdır.
    */
    case "cancelled":
      return {
        izinli: false,
        stokGeriDoner: false,
        paraIadesiGerekir: false,
        gerekce: ZATEN_IPTAL,
      };

    /*
      Ödemesi başarısız. Sipariş zaten geçerli değildir ve etiketleri
      ödeme başarısız olduğunda serbest bırakılmıştır; iptal edilecek
      bir şey yoktur.
    */
    case "failed":
      return {
        izinli: false,
        stokGeriDoner: false,
        paraIadesiGerekir: false,
        gerekce: ODEME_BASARISIZ_IPTAL,
      };
  }
}

