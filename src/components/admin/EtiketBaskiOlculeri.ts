/**
 * 30x30 mm etiket baskısının ÖLÇÜ TABLOSU.
 *
 * Tek kaynak: hem baskı bileşeni hem de ölçü testleri bu dosyayı okur.
 * Bir sayı değişip 30 mm'yi aşarsa test hemen yakalar.
 *
 * ─────────────────────────────────────────────────────────────
 * QR MODÜL BOYUTU HESABI
 *
 * QR adresi: https://www.arkvium.com/t/<43 karakter base64url token>
 * Toplam ~69 bayt. Bayt kipinde, hata düzeltme seviyesi M ile bu uzunluk
 * SÜRÜM 5 QR üretir: 37x37 modül.
 *
 * `marginSize: 4` ile her kenara 4 modülük sessiz alan (quiet zone)
 * eklenir. Sessiz alan QR standardının zorunlu parçasıdır; olmadan
 * telefon kamerası kodu bulamaz.
 *
 *   Toplam modül = 37 + (2 x 4) = 45
 *   Modül boyutu = QR kutu boyutu / 45
 *
 * Etiket kodu ön yüzde YOKKEN  : 24.2 / 45 = 0.538 mm
 * Etiket kodu ön yüzde VARKEN  : 22.4 / 45 = 0.498 mm
 *
 * İkisi de lazer yazıcı ve telefon kamerası için güvenli aralıkta
 * (pratik alt sınır ~0.4 mm). Gerçek doğrulama baskı sonrası yapılmalıdır;
 * kontrol listesi arayüzde yer alıyor.
 *
 * KESİM ÇİZGİSİ `outline` ile çizilir, `border` ile DEĞİL: outline kutu
 * ölçüsüne eklenmez, bu yüzden etiket tam 30 mm kalır.
 * ─────────────────────────────────────────────────────────────
 */

/** Nihai kesim ölçüsü. Değiştirilmemelidir. */
export const ETIKET_MM = 30;

/** Kesim çizgisi ile içeriğin arasındaki güvenlik payı. */
export const ETIKET_IC_BOSLUK_MM = 1.4;

/** Sessiz alan genişliği, modül cinsinden. QR standardının gereği. */
export const SESSIZ_ALAN_MODUL = 4;

/** Sürüm 5 QR'ın veri alanı + iki yanda sessiz alan. */
export const TOPLAM_MODUL = 37 + SESSIZ_ALAN_MODUL * 2;

/**
 * İki yerleşim seçeneği.
 *
 * `kodsuz` QR'ı en büyük hâlinde kullanır (öncelik okunabilirlik).
 * `kodlu` ön yüze etiket kodunu da basar; bunun bedeli QR'ın 1.8 mm
 * küçülmesidir. Kod, basılmış etiketi aktivasyon kartıyla elle
 * eşleştirmeyi mümkün kıldığı için varsayılan budur.
 */
type Yerlesim = {
  qrKutuMm: number;
  arkviumSatirMm: number;
  kodSatirMm: number | null;
  satirArasiMm: number;
};

export const YERLESIM: Record<"kodsuz" | "kodlu", Yerlesim> = {
  kodsuz: {
    qrKutuMm: 24.2,
    arkviumSatirMm: 2.4,
    kodSatirMm: null,
    satirArasiMm: 0.3,
  },
  kodlu: {
    qrKutuMm: 22.4,
    arkviumSatirMm: 2.2,
    kodSatirMm: 2.0,
    satirArasiMm: 0.25,
  },
};

export function yerlesimAl(kodGoster: boolean): Yerlesim {
  return kodGoster ? YERLESIM.kodlu : YERLESIM.kodsuz;
}

/** Seçilen düzende bir QR modülünün milimetre karşılığı. */
export function modulBoyutuMm(kodGoster: boolean): number {
  return yerlesimAl(kodGoster).qrKutuMm / TOPLAM_MODUL;
}

/** Sessiz alanın milimetre karşılığı. */
export function sessizAlanMm(kodGoster: boolean): number {
  return modulBoyutuMm(kodGoster) * SESSIZ_ALAN_MODUL;
}

/**
 * Etiketin dikey içerik yüksekliği.
 *
 * 30 mm'yi AŞMAMALIDIR; aşarsa tarayıcı içeriği taşırır ve kesim ölçüsü
 * tutmaz. Birim testi bu değeri doğrular.
 */
export function dikeyToplamMm(kodGoster: boolean): number {
  const y = yerlesimAl(kodGoster);

  const metin =
    y.kodSatirMm === null
      ? y.arkviumSatirMm
      : y.arkviumSatirMm + y.satirArasiMm + y.kodSatirMm;

  return ETIKET_IC_BOSLUK_MM * 2 + y.qrKutuMm + y.satirArasiMm + metin;
}

/** A4 yerleşimi (10 mm sayfa kenarlığı sonrası 190 x 277 mm alan). */
export const ETIKET_SUTUN = 5;
export const ETIKET_SATIR = 7;
export const ETIKET_ARALIK_MM = 6;

/** Aktivasyon kartı yerleşimi. */
export const KART_EN_MM = 60;
export const KART_BOY_MM = 40;
export const KART_SUTUN = 3;
export const KART_SATIR = 6;
export const KART_ARALIK_MM = 5;

/** Bir A4 sayfasına sığan adet. */
export const SAYFADA_ETIKET = ETIKET_SUTUN * ETIKET_SATIR;
export const SAYFADA_KART = KART_SUTUN * KART_SATIR;

/** A4'te 10 mm kenarlık sonrası kullanılabilir alan. */
export const A4_KULLANILABILIR_EN_MM = 190;
export const A4_KULLANILABILIR_BOY_MM = 277;

/** Izgaranın kapladığı toplam ölçü — A4 alanını aşmamalıdır. */
export function izgaraEnMm(
  sutun: number,
  parcaEnMm: number,
  aralikMm: number
): number {
  return sutun * parcaEnMm + (sutun - 1) * aralikMm;
}

export function izgaraBoyMm(
  satir: number,
  parcaBoyMm: number,
  aralikMm: number
): number {
  return satir * parcaBoyMm + (satir - 1) * aralikMm;
}
