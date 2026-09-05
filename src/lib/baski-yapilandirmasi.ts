/**
 * Ürün türüne göre baskı davranışı — TEK KAYNAK.
 *
 * NEDEN AYRI DOSYA?
 * Baskı kararı hem yönetim arayüzünde (hangi düğme görünecek) hem de API
 * ucunda (hangi paket, hangi ölçüde üretilecek) gerekiyor. İki yerde ayrı
 * `if` yazılsaydı biri güncellenip diğeri unutulduğunda yanlış ölçüde
 * binlerce etiket basılabilirdi. Karar bu dosyada verilir, iki taraf da
 * buradan okur.
 *
 * GÜVENLİ VARSAYILAN
 * Tabloda olmayan her ürün `tanimsiz` sayılır: hiçbir baskı düğmesi
 * gösterilmez ve baskıcı paketi üretilmez. Yeni bir ürün eklendiğinde
 * yanlışlıkla 30x30 mm çıktı verilmesi bu sayede imkânsızdır.
 */

export type BaskiTuru =
  /** A4 üzerine 30x30 mm kesimli etiket sayfası (tarayıcıdan yazdırılır). */
  | "etiket-30"
  /** Üreticinin kendi gövdesine işleyeceği, ölçüsü sabit SVG QR paketi. */
  | "baskici-paketi"
  /** Ölçüsü henüz kesinleşmemiş ürün. Hiçbir baskı çıktısı sunulmaz. */
  | "tanimsiz";

/**
 * Baskıcı paketinin ürün özel ölçüleri.
 *
 * `qrMm` doğrudan SVG'nin `width`/`height` değeri olur; üretici dosyayı
 * ölçekleMEDEN kullanır.
 */
export type BaskiciAyari = {
  /** QR dosyasının fiziksel kenar ölçüsü (mm). */
  qrMm: number;
  /** Bitmiş ürünün gövde ölçüsü — üretim notunda yazar. */
  govde: string;
  /** Üretim yöntemi — üretim notunda yazar. */
  yontem: string;
  /**
   * Sessiz alanın fiziksel alt sınırı (mm).
   *
   * Modül sayısı (4) her üründe aynıdır; ancak QR küçüldükçe o 4 modülün
   * milimetre karşılığı düşer. Bu sınır, ürünün gerçek ölçüsüne göre
   * ayrı ayrı belirlenir ve üretimde doğrulanır.
   */
  enAzSessizAlanMm: number;
};

export type BaskiYapilandirmasi = {
  tur: BaskiTuru;
  /** 30x30 mm yazdırma sayfası düğmesi gösterilsin mi? */
  etiketYazdirma: boolean;
  /** Baskıcı ZIP paketi indirilebilsin mi? */
  baskiciPaketi: boolean;
  /** Paket ölçüleri. Yalnızca `baskiciPaketi` true ise doludur. */
  baskiciAyari: BaskiciAyari | null;
  /** Arayüzde gösterilecek kısa açıklama. */
  aciklama: string;
};

const TANIMSIZ: BaskiYapilandirmasi = {
  tur: "tanimsiz",
  etiketYazdirma: false,
  baskiciPaketi: false,
  baskiciAyari: null,
  aciklama:
    "Baskı ölçüsü henüz tanımlanmadı. Bu ürün için baskı çıktısı üretilmez.",
};

/** Baskıcı paketi olan bir ürünü tanımlar. */
function baskiciUrunu(
  ayar: BaskiciAyari,
  aciklama: string
): BaskiYapilandirmasi {
  return {
    tur: "baskici-paketi",
    etiketYazdirma: false,
    baskiciPaketi: true,
    baskiciAyari: ayar,
    aciklama,
  };
}

const TABLO: Record<string, BaskiYapilandirmasi> = {
  "sticker-seti": {
    tur: "etiket-30",
    etiketYazdirma: true,
    baskiciPaketi: false,
    baskiciAyari: null,
    aciklama: "30×30 mm kesimli etiket sayfası (A4).",
  },

  "arac-stickeri": baskiciUrunu(
    {
      qrMm: 40,
      govde: "60 x 80 mm, dikey",
      yontem:
        "Araç camının İÇ YÜZEYİNE uygulanacak; dışarıdan normal okunacak şekilde cam içi TERS BASKI yapılacak.",
      enAzSessizAlanMm: 3,
    },
    "Üretici 60×80 mm dikey tasarımı basar; buradan 40×40 mm QR dosyaları indirilir."
  ),

  /*
    METAL ÜRÜNLER — lazer kazıma.

    QR ölçüleri gövdeye göre küçüktür; sessiz alan alt sınırları her ürünün
    kendi ölçüsünden hesaplanmıştır (45 modül üzerinden 4 modül).
  */
  "metal-anahtarlik": baskiciUrunu(
    {
      qrMm: 20,
      govde: "30 x 30 mm",
      yontem: "Metal gövdeye LAZER KAZIMA ile işlenecek.",
      enAzSessizAlanMm: 1.7,
    },
    "Üretici 30×30 mm metal gövdeye işler; buradan 20×20 mm QR dosyaları indirilir."
  ),

  "evcil-hayvan-kunyesi": baskiciUrunu(
    {
      qrMm: 18,
      govde: "Ø30 mm (yuvarlak)",
      yontem: "Metal künyeye LAZER KAZIMA ile işlenecek.",
      enAzSessizAlanMm: 1.5,
    },
    "Üretici Ø30 mm yuvarlak künyeye işler; buradan 18×18 mm QR dosyaları indirilir."
  ),

  "valiz-etiketi": baskiciUrunu(
    {
      qrMm: 25,
      govde: "60 x 40 mm",
      yontem: "Gövdeye LAZER KAZIMA ile işlenecek.",
      enAzSessizAlanMm: 2.1,
    },
    "Üretici 60×40 mm gövdeye işler; buradan 25×25 mm QR dosyaları indirilir."
  ),
};

/** Ürün kodunun baskı yapılandırması. Bilinmeyen kod güvenli varsayılana düşer. */
export function baskiYapilandirmasi(
  urunKod: string | null | undefined
): BaskiYapilandirmasi {
  const kod = String(urunKod ?? "").trim();

  return TABLO[kod] ?? TANIMSIZ;
}

/** Bu ürün için baskıcı ZIP paketi üretilebilir mi? */
export function baskiciPaketiUretilebilirMi(
  urunKod: string | null | undefined
): boolean {
  return baskiYapilandirmasi(urunKod).baskiciPaketi;
}

/** Paket ölçüleri; ürünün paketi yoksa `null`. */
export function baskiciAyariAl(
  urunKod: string | null | undefined
): BaskiciAyari | null {
  return baskiYapilandirmasi(urunKod).baskiciAyari;
}

/** Bu ürün için 30x30 mm yazdırma sayfası sunulur mu? */
export function etiketYazdirmaVarMi(
  urunKod: string | null | undefined
): boolean {
  return baskiYapilandirmasi(urunKod).etiketYazdirma;
}

/** Baskıcı paketi olan tüm ürün kodları. */
export function baskiciPaketiOlanUrunler(): string[] {
  return Object.keys(TABLO).filter((kod) => TABLO[kod].baskiciPaketi);
}
