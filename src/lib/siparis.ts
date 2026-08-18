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
export const SIPARIS_WHATSAPP_NUMARASI = "90XXXXXXXXXX";

/** Tüm ürünlerde gösterilen kargo notu. */
export const KARGO_NOTU = "Kargo ücreti ayrıca hesaplanır.";

export type SiparisUrunu = {
  /** React listesi ve sipariş mesajı için sabit kimlik. */
  kod: string;
  ad: string;
  aciklama: string;
  fiyat: string;
  /** WhatsApp sohbetine önceden yazılan sipariş mesajı. */
  siparisMesaji: string;
};

export const SIPARIS_URUNLERI: SiparisUrunu[] = [
  {
    kod: "sticker-seti",
    ad: "3'lü QR Sticker Seti",
    aciklama:
      "Değer verdiğiniz eşyaları ARKVIUM'un güvenli iletişim sistemine bağlayın.",
    fiyat: "199 TL",
    siparisMesaji:
      "Merhaba, 3'lü ARKVIUM QR Sticker Seti sipariş etmek istiyorum.",
  },
  {
    kod: "arac-stickeri",
    ad: "Araç İletişim QR Sticker'ı",
    aciklama:
      "Aracınızın camına yapıştırın. Uygunsuz park, açık kalan far veya araçla ilgili başka bir durumda telefon numaranız görünmeden güvenli bildirim alın.",
    fiyat: "249 TL",
    siparisMesaji:
      "Merhaba, ARKVIUM Araç İletişim QR Sticker'ı sipariş etmek istiyorum.",
  },
  {
    kod: "metal-anahtarlik",
    ad: "Metal QR Anahtarlık",
    aciklama:
      "Anahtarlarınızı ARKVIUM'un güvenli buluntu iletişim sistemine bağlayan dayanıklı metal etiket.",
    fiyat: "349 TL",
    siparisMesaji:
      "Merhaba, ARKVIUM Metal QR Anahtarlık sipariş etmek istiyorum.",
  },
  {
    kod: "evcil-hayvan-kunyesi",
    ad: "Evcil Hayvan QR Künyesi",
    aciklama:
      "Evcil dostunuzu bulan kişi, kişisel iletişim bilgileriniz açıkça gösterilmeden size mesaj gönderebilsin.",
    fiyat: "449 TL",
    siparisMesaji:
      "Merhaba, ARKVIUM Evcil Hayvan QR Künyesi sipariş etmek istiyorum.",
  },
  {
    kod: "valiz-etiketi",
    ad: "QR Valiz Etiketi",
    aciklama:
      "Valiziniz kaybolduğunda bulan kişinin güvenli biçimde size ulaşmasını sağlayın.",
    fiyat: "299 TL",
    siparisMesaji:
      "Merhaba, ARKVIUM QR Valiz Etiketi sipariş etmek istiyorum.",
  },
];
