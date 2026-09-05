/**
 * Ürün türüne göre baskı davranışı — TEK KAYNAK.
 *
 * NEDEN AYRI DOSYA?
 * Baskı kararı hem yönetim arayüzünde (hangi düğme görünecek) hem de API
 * ucunda (hangi paket üretilebilir) gerekiyor. İki yerde ayrı `if` yazılsaydı
 * biri güncellenip diğeri unutulduğunda yanlış ölçüde binlerce etiket
 * basılabilirdi. Karar bu dosyada verilir, iki taraf da buradan okur.
 *
 * GÜVENLİ VARSAYILAN
 * Tabloda olmayan her ürün `tanimsiz` sayılır: hiçbir baskı düğmesi
 * gösterilmez ve baskıcı paketi üretilmez. Yeni bir ürün eklendiğinde
 * yanlışlıkla 30x30 mm çıktı verilmesi bu sayede imkânsızdır.
 */

export type BaskiTuru =
  /** A4 üzerine 30x30 mm kesimli etiket sayfası (tarayıcıdan yazdırılır). */
  | "etiket-30"
  /** Matbaanın kendi tasarımına yerleştireceği 40x40 mm SVG QR paketi. */
  | "baskici-arac"
  /** Ölçüsü henüz kesinleşmemiş ürün. Hiçbir baskı çıktısı sunulmaz. */
  | "tanimsiz";

export type BaskiYapilandirmasi = {
  tur: BaskiTuru;
  /** 30x30 mm yazdırma sayfası düğmesi gösterilsin mi? */
  etiketYazdirma: boolean;
  /** Baskıcı ZIP paketi indirilebilsin mi? */
  baskiciPaketi: boolean;
  /** Arayüzde gösterilecek kısa açıklama. */
  aciklama: string;
};

const TANIMSIZ: BaskiYapilandirmasi = {
  tur: "tanimsiz",
  etiketYazdirma: false,
  baskiciPaketi: false,
  aciklama:
    "Baskı ölçüsü henüz tanımlanmadı. Bu ürün için baskı çıktısı üretilmez.",
};

const TABLO: Record<string, BaskiYapilandirmasi> = {
  "sticker-seti": {
    tur: "etiket-30",
    etiketYazdirma: true,
    baskiciPaketi: false,
    aciklama: "30×30 mm kesimli etiket sayfası (A4).",
  },
  "arac-stickeri": {
    tur: "baskici-arac",
    etiketYazdirma: false,
    baskiciPaketi: true,
    aciklama:
      "Matbaa 60×80 mm dikey tasarımı basar; buradan 40×40 mm QR dosyaları indirilir.",
  },
  // Ölçüleri kesinleşmedi; bilerek TANIMSIZ bırakıldı.
  "metal-anahtarlik": TANIMSIZ,
  "evcil-hayvan-kunyesi": TANIMSIZ,
  "valiz-etiketi": TANIMSIZ,
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

/** Bu ürün için 30x30 mm yazdırma sayfası sunulur mu? */
export function etiketYazdirmaVarMi(
  urunKod: string | null | undefined
): boolean {
  return baskiYapilandirmasi(urunKod).etiketYazdirma;
}
