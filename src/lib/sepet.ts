import {
  KARGO_UCRETI_KURUS,
  SIPARIS_URUNLERI,
  type SiparisUrunu,
} from "./siparis";

/**
 * Sepet hesaplaması — saf fonksiyonlar, sunucu tarafı tek doğruluk kaynağı.
 *
 * GÜVENLİK: İstemciden YALNIZCA ürün kodu ve adet kabul edilir. Fiyat, ad ve
 * kargo tutarı hiçbir koşulda istemciden okunmaz; hepsi `SIPARIS_URUNLERI` ve
 * `KARGO_UCRETI_KURUS` üzerinden sunucuda belirlenir. Böylece istemci fiyat
 * değiştirerek indirimli sipariş oluşturamaz.
 *
 * Tüm para hesapları kuruş TAMSAYISI ile yapılır; kayan noktalı aritmetik
 * kullanılmaz, yuvarlama hatası oluşmaz.
 */

/** İstemciden kabul edilen tek veri: ürün kodu ve adet. */
export type SepetGirdisi = {
  kod: string;
  adet: number;
};

/** Hesaplanmış tek sipariş satırı. Fiyat alanları sunucudan gelir. */
export type SepetKalemi = {
  kod: string;
  ad: string;
  adet: number;
  /** Ürün tanımından gelen QR adedi; sipariş kalemine kopyalanır. */
  qrAdedi: number;
  unitPriceKurus: number;
  lineTotalKurus: number;
};

export type SepetToplami = {
  kalemler: SepetKalemi[];
  subtotalKurus: number;
  shippingKurus: number;
  totalKurus: number;
};

/**
 * PostgreSQL `INTEGER` üst sınırı.
 *
 * Tutar alanları veritabanında INTEGER olduğu için hesaplanan hiçbir değer
 * bu sınırı aşamaz; aşarsa sipariş kaydı sırasında veri bozulur.
 */
const EN_BUYUK_TUTAR = 2147483647;

function urunuBul(kod: string): SiparisUrunu | undefined {
  return SIPARIS_URUNLERI.find((urun) => urun.kod === kod);
}

/**
 * Tek bir sepet satırını doğrular ve satır toplamını hesaplar.
 *
 * Bilinmeyen ürün kodu, tam sayı olmayan adet ve sıfır/negatif adet
 * reddedilir; hata mesajı Türkçedir ve sistem detayı içermez.
 */
export function sepetKalemiHesapla(girdi: SepetGirdisi): SepetKalemi {
  const kod = String(girdi?.kod ?? "").trim();
  const urun = urunuBul(kod);

  if (!urun) {
    throw new Error("Sepetteki ürünlerden biri bulunamadı.");
  }

  const adet = girdi.adet;

  if (typeof adet !== "number" || !Number.isSafeInteger(adet)) {
    throw new Error("Ürün adedi tam sayı olmalıdır.");
  }

  if (adet < 1) {
    throw new Error("Ürün adedi en az 1 olmalıdır.");
  }

  const lineTotalKurus = urun.fiyatKurus * adet;

  if (lineTotalKurus > EN_BUYUK_TUTAR) {
    throw new Error("Ürün adedi çok yüksek.");
  }

  return {
    kod: urun.kod,
    ad: urun.ad,
    adet,
    qrAdedi: urun.qrAdedi,
    unitPriceKurus: urun.fiyatKurus,
    lineTotalKurus,
  };
}

/**
 * Sepetin tamamını hesaplar.
 *
 * Aynı ürün birden çok satırda gelirse satırlar BİRLEŞTİRİLİR; böylece aynı
 * ürün için iki ayrı sipariş kalemi oluşmaz.
 */
export function sepetHesapla(girdiler: SepetGirdisi[]): SepetToplami {
  if (!Array.isArray(girdiler) || girdiler.length === 0) {
    throw new Error("Sepetiniz boş.");
  }

  const adetler: Record<string, number> = {};
  const sira: string[] = [];

  for (const girdi of girdiler) {
    // Doğrulama birleştirmeden önce yapılır: geçersiz satır sessizce yutulmaz.
    const kalem = sepetKalemiHesapla(girdi);

    if (adetler[kalem.kod] === undefined) {
      adetler[kalem.kod] = 0;
      sira.push(kalem.kod);
    }

    adetler[kalem.kod] += kalem.adet;
  }

  const kalemler = sira.map((kod) =>
    sepetKalemiHesapla({ kod, adet: adetler[kod] })
  );

  const subtotalKurus = kalemler.reduce(
    (toplam, kalem) => toplam + kalem.lineTotalKurus,
    0
  );

  const shippingKurus = KARGO_UCRETI_KURUS;
  const totalKurus = subtotalKurus + shippingKurus;

  if (totalKurus > EN_BUYUK_TUTAR) {
    throw new Error("Sepet tutarı çok yüksek.");
  }

  return { kalemler, subtotalKurus, shippingKurus, totalKurus };
}
