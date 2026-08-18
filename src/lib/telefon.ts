/**
 * Telefon numarasını WhatsApp bağlantısı için hazırlar.
 *
 * WhatsApp adresi numarayı ülke kodlu ve yalnızca rakamlardan oluşan biçimde
 * ister: `?phone=905551112233`. Kullanıcılar numarayı çok farklı
 * yazar ("0555 111 22 33", "+90 555 111 22 33", "00905551112233"), bu yüzden
 * tek bir yerde normalleştirilir.
 *
 * Ülke kodu yoksa Türkiye (90) varsayılır — bulan kişi formu Türkçedir ve
 * numaralar yerel biçimde giriliyor.
 */

const TURKIYE_KODU = "90";

/** Ülke kodu dâhil en az/en çok hane (E.164 üst sınırı 15'tir). */
const EN_AZ_HANE = 10;
const EN_COK_HANE = 15;

/**
 * Numarayı WhatsApp'ın beklediği biçime çevirir.
 * Anlamlı bir numara çıkaramazsa `null` döner — bu durumda arayüzde
 * WhatsApp düğmesi hiç gösterilmez, bozuk bağlantı üretilmez.
 */
export function whatsappNumarasi(girdi: string | null | undefined): string | null {
  if (!girdi) {
    return null;
  }

  let rakamlar = girdi.replace(/\D/g, "");

  if (!rakamlar) {
    return null;
  }

  if (rakamlar.startsWith("00")) {
    // Uluslararası arama öneki: 0090... → 90...
    rakamlar = rakamlar.slice(2);
  } else if (rakamlar.startsWith("0")) {
    // Yerel biçim: 0555... → 90555...
    rakamlar = TURKIYE_KODU + rakamlar.slice(1);
  } else if (rakamlar.length === 10) {
    // Ülke kodu ve baştaki sıfır olmadan girilmiş: 5551112233 → 905551112233
    rakamlar = TURKIYE_KODU + rakamlar;
  }

  if (rakamlar.length < EN_AZ_HANE || rakamlar.length > EN_COK_HANE) {
    return null;
  }

  return rakamlar;
}

/**
 * Hazır WhatsApp bağlantısı üretir. Numara çözülemezse `null` döner.
 * `mesaj` verilirse sohbet kutusu bu metinle açılır.
 */
export function whatsappBaglantisi(
  telefon: string | null | undefined,
  mesaj?: string
): string | null {
  const numara = whatsappNumarasi(telefon);

  if (!numara) {
    return null;
  }

  // Resmi `api.whatsapp.com/send` adresi kullanılır: kısaltma olan wa.me
  // Safari'de sertifika uyarısı verebiliyor.
  const adres = `https://api.whatsapp.com/send?phone=${numara}`;

  return mesaj ? `${adres}&text=${encodeURIComponent(mesaj)}` : adres;
}
