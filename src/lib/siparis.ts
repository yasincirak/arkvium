/**
 * Sipariş yapılandırması — WhatsApp üzerinden manuel sipariş.
 *
 * Ödeme sistemi, sepet ve sipariş tablosu YOKTUR: ziyaretçi ürün kartındaki
 * butona basar, hazır mesajla WhatsApp açılır ve sipariş elle alınır.
 *
 * Numara ve ürün listesi YALNIZCA burada tutulur; arayüz bileşenleri bu
 * dosyayı okur. Numara değişince tek satır güncellenir.
 */

/**
 * Siparişlerin alındığı WhatsApp numarası.
 *
 * Biçim: ülke kodu ile, `+`, boşluk ve baştaki sıfır olmadan (örn. 90 ile
 * başlayan 12 haneli). Yayına almadan önce gerçek numarayla değiştirilmelidir.
 */
export const SIPARIS_WHATSAPP_NUMARASI = "905076046894";

/**
 * Kuruş tutarını görünen metne çevirir: 19900 → "199,00 TL".
 *
 * Para tutarları her yerde kuruş TAMSAYISI olarak taşınır; kayan noktalı
 * hesap yapılmaz, biçimlendirme yalnızca gösterim anında uygulanır.
 */
export function fiyatBicimle(kurus: number): string {
  const lira = Math.trunc(kurus / 100);
  const kalan = Math.abs(kurus % 100);

  return `${lira},${String(kalan).padStart(2, "0")} TL`;
}

/**
 * Sabit kargo ücreti (kuruş).
 *
 * Kargo hizmeti Kargonomi üzerinden yönetilir. Tutarın TEK kaynağı burasıdır;
 * istemciden gelen hiçbir kargo değeri kabul edilmez. Ücretsiz kargo eşiği
 * yoktur; tutar değişince yalnızca bu satır güncellenir.
 */
export const KARGO_UCRETI_KURUS = 5500;

/**
 * Ürün kartlarında gösterilen kargo notu.
 *
 * Kesin tutar sepet ve ödeme adımında hesaplanıp gösterilir.
 */
export const KARGO_NOTU = "Kargo ücreti ödeme adımında gösterilir.";

export type SiparisUrunu = {
  /** React listesi ve sipariş mesajı için sabit kimlik. */
  kod: string;
  ad: string;
  aciklama: string;
  /** Birim fiyat, kuruş cinsinden. Sipariş toplamı bu değerden hesaplanır. */
  fiyatKurus: number;
  /** WhatsApp sohbetine önceden yazılan sipariş mesajı. */
  siparisMesaji: string;
};

export const SIPARIS_URUNLERI: SiparisUrunu[] = [
  {
    kod: "sticker-seti",
    ad: "3'lü QR Sticker Seti",
    aciklama:
      "Değer verdiğiniz eşyaları ARKVIUM'un güvenli iletişim sistemine bağlayın.",
    fiyatKurus: 19900,
    siparisMesaji:
      "Merhaba, 3'lü ARKVIUM QR Sticker Seti sipariş etmek istiyorum.",
  },
  {
    kod: "arac-stickeri",
    ad: "Araç İletişim QR Sticker'ı",
    aciklama:
      "Aracınızın camına yapıştırın. Uygunsuz park, açık kalan far veya araçla ilgili başka bir durumda telefon numaranız görünmeden güvenli bildirim alın.",
    fiyatKurus: 24900,
    siparisMesaji:
      "Merhaba, ARKVIUM Araç İletişim QR Sticker'ı sipariş etmek istiyorum.",
  },
  {
    kod: "metal-anahtarlik",
    ad: "Metal QR Anahtarlık",
    aciklama:
      "Anahtarlarınızı ARKVIUM'un güvenli buluntu iletişim sistemine bağlayan dayanıklı metal etiket.",
    fiyatKurus: 34900,
    siparisMesaji:
      "Merhaba, ARKVIUM Metal QR Anahtarlık sipariş etmek istiyorum.",
  },
  {
    kod: "evcil-hayvan-kunyesi",
    ad: "Evcil Hayvan QR Künyesi",
    aciklama:
      "Evcil dostunuzu bulan kişi, kişisel iletişim bilgileriniz açıkça gösterilmeden size mesaj gönderebilsin.",
    fiyatKurus: 44900,
    siparisMesaji:
      "Merhaba, ARKVIUM Evcil Hayvan QR Künyesi sipariş etmek istiyorum.",
  },
  {
    kod: "valiz-etiketi",
    ad: "QR Valiz Etiketi",
    aciklama:
      "Valiziniz kaybolduğunda bulan kişinin güvenli biçimde size ulaşmasını sağlayın.",
    fiyatKurus: 29900,
    siparisMesaji:
      "Merhaba, ARKVIUM QR Valiz Etiketi sipariş etmek istiyorum.",
  },
];
