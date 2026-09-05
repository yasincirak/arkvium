import { zipOlustur, type ZipGirdisi } from "./zip";

/**
 * Baskıcı QR paketi.
 *
 * Bu paket ARKVIUM DIŞINA, baskı firmasına gider. Bu yüzden içeriği bir
 * "beyaz liste" olarak tanımlanır: yalnızca aşağıdaki dört alan pakete
 * girer, başka hiçbir şey girmez.
 *
 *   urun · etiket_kodu · qr_adresi · qr_dosyasi
 *
 * PAKETE ASLA GİRMEYECEKLER
 * Aktivasyon kodu, kullanıcı adı/e-posta/telefon, sipariş ve adres bilgisi,
 * şifre/token/çerez/oturum, veritabanı kimliği, yönetim paneli bağlantısı,
 * ortam değişkenleri.
 *
 * Bu dosyanın aldığı girdi tipi (`BaskiciEtiketi`) bilerek DAR tutulmuştur:
 * aktivasyon kodu taşıyan bir nesne buraya tip düzeyinde geçemez.
 */

/** Pakete girecek tek etiket. Aktivasyon kodu alanı BİLEREK yoktur. */
export type BaskiciEtiketi = {
  /** Basılan, insan tarafından okunabilen kod: ARK-XXXX-XXXX */
  etiketKodu: string;
  /** Etiket üretiminden gelen gerçek QR adresi. Yeniden türetilmez. */
  qrAdresi: string;
  /** Sunucuda üretilmiş, baskıya hazır SVG içeriği. */
  qrSvg: string;
};

export const CSV_DOSYA_ADI = "baskici-listesi.csv";
export const URETIM_NOTU_DOSYA_ADI = "URETIM-NOTU.txt";

/**
 * Baskıya giden QR adresinin tabanı — HER ZAMAN ÜRETİM ADRESİ.
 *
 * Ortam değişkeni kullanılmaz: geliştirme makinesinde `localhost`,
 * önizleme dağıtımında `*.vercel.app` değerini alır ve basılmış binlerce
 * etiket çöp olur. Basılan adres geri alınamadığı için bu değer sabittir.
 */
export const URETIM_TABAN_ADRESI = "https://www.arkvium.com";

/** Araç etiketi QR dosyasının fiziksel kenar ölçüsü. */
export const ARAC_SVG_MM = 40;

/** QR standardının gerektirdiği sessiz alan, modül cinsinden. */
export const SESSIZ_ALAN_MODUL = 4;

/**
 * Sessiz alanın fiziksel alt sınırı.
 *
 * Modül sayısı tek başına yetmez: QR sürümü adres uzunluğuna göre büyürse
 * modül küçülür ve 4 modüllük boşluk milimetre olarak daralır. Araç camına
 * uygulanan etiket uzaktan okunacağı için fiziksel sınır de ayrıca aranır.
 */
export const EN_AZ_SESSIZ_ALAN_MM = 3;

/** Verilen kenar ölçüsünde sessiz alanın milimetre karşılığı. */
export function sessizAlanMmHesapla(
  kenarMm: number,
  toplamModul: number
): number {
  if (!(kenarMm > 0) || !(toplamModul > 0)) {
    throw new Error("Sessiz alan hesaplanamadı.");
  }

  return (kenarMm / toplamModul) * SESSIZ_ALAN_MODUL;
}

/**
 * Üretilen QR SVG'sine GERÇEK FİZİKSEL ÖLÇÜ yazar.
 *
 * `qrcode.react` çıktısı `width="128" height="128"` (piksel) taşır. Bu dosya
 * matbaaya gittiğinde tasarım programı onu rastgele bir ölçüde açar ve
 * operatörün elle ölçeklemesi gerekir — yanlış ölçüde basma riski. Burada
 * ölçü `mm` cinsine sabitlenir; `viewBox` korunduğu için çizim vektörel
 * kalır ve kalite kaybı olmaz.
 *
 * Ayrıca `xmlns` eklenir: React tarayıcı içi çizim için bunu atlar, ama
 * bağımsız bir `.svg` dosyası ad alanı olmadan birçok programda açılmaz.
 *
 * Sessiz alan fiziksel olarak yetersizse dosya ÜRETİLMEZ; sessizce küçük
 * bir QR basmaktansa paketin hiç oluşmaması tercih edilir.
 */
export function svgOlcuUygula(
  svg: string,
  kenarMm: number,
  enAzSessizAlanMm: number = EN_AZ_SESSIZ_ALAN_MM
): string {
  const acilis = String(svg).match(/^<svg\b[^>]*>/);

  if (!acilis) {
    throw new Error("QR dosyası beklenen biçimde değil.");
  }

  const etiket = acilis[0];
  const kutu = etiket.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);

  if (!kutu) {
    throw new Error("QR dosyasında viewBox bulunamadı.");
  }

  const en = Number(kutu[1]);
  const boy = Number(kutu[2]);

  if (!(en > 0) || en !== boy) {
    throw new Error("QR kutusu kare değil.");
  }

  const sessiz = sessizAlanMmHesapla(kenarMm, en);

  if (sessiz < enAzSessizAlanMm) {
    throw new Error(
      `Sessiz alan ${sessiz.toFixed(2)} mm; en az ${enAzSessizAlanMm} mm olmalı.`
    );
  }

  let yeniEtiket = etiket
    .replace(/\swidth="[^"]*"/g, "")
    .replace(/\sheight="[^"]*"/g, "");

  if (!/\sxmlns="/.test(yeniEtiket)) {
    yeniEtiket = yeniEtiket.replace(
      /^<svg/,
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }

  yeniEtiket = yeniEtiket.replace(
    /^<svg/,
    `<svg width="${kenarMm}mm" height="${kenarMm}mm"`
  );

  return yeniEtiket + String(svg).slice(etiket.length);
}

/**
 * Üreticiye giden üretim notu.
 *
 * Sabit alanlardan üretilir: müşteri, sipariş veya etiket bilgisi içermez.
 * Ölçüler ürün yapılandırmasından gelir, burada elle yazılmaz — böylece
 * notta yazan ölçü ile dosyanın gerçek ölçüsü ayrışamaz.
 */
export function uretimNotuMetni(ayar: {
  urunAdi: string;
  govde: string;
  qrMm: number;
  yontem: string;
}): string {
  return (
    [
      `ARKVIUM — ${ayar.urunAdi.toLocaleUpperCase("tr-TR")} / ÜRETİM NOTU`,
      "",
      `1) Bitmiş ürün gövdesi: ${ayar.govde}.`,
      `2) QR dosyası: ${ayar.qrMm} x ${ayar.qrMm} mm.`,
      "3) QR çevresindeki beyaz sessiz alan korunacak; üzerine hiçbir öğe gelmeyecek.",
      `4) ${ayar.yontem}`,
      "5) SVG dosyası esnetilmeyecek; en-boy oranı korunacak.",
      "6) İlk numunede farklı telefonlarla okuma testi yapılacak.",
      "",
      "Dosya eşleşmesi baskici-listesi.csv içindedir.",
    ].join("\r\n") + "\r\n"
  );
}

/** CSV sütunları — sıra ve isimler sabittir, test bunu doğrular. */
export const CSV_SUTUNLARI = [
  "urun",
  "etiket_kodu",
  "qr_adresi",
  "qr_dosyasi",
] as const;

/**
 * Elektronik tablo formül enjeksiyonuna karşı hücre temizliği.
 *
 * Excel ve LibreOffice, `=`, `+`, `-`, `@` ile başlayan hücreleri FORMÜL
 * sayar. Baskıcı dosyayı açtığında `=cmd|...` gibi bir hücre çalıştırılabilir
 * hâle gelir. Tek tırnak öneki hücreyi metne zorlar.
 *
 * Sekme ve satır başı da öne alınırsa bazı programlar önceki karakteri
 * yok sayıp yine formül görür; bu yüzden onlar da tetikleyici sayılır.
 */
const TEHLIKELI_BASLANGIC = /^[=+\-@\t\r]/;

export function csvHucresi(deger: string): string {
  const metin = String(deger ?? "");

  const guvenli = TEHLIKELI_BASLANGIC.test(metin) ? `'${metin}` : metin;

  // Alan her zaman tırnaklanır; içindeki tırnak ikilenir.
  return `"${guvenli.replace(/"/g, '""')}"`;
}

/** Etiket kodundan SVG dosya adı üretir: ARK-XXXX-XXXX.svg */
export function svgDosyaAdi(etiketKodu: string): string {
  /*
    Dosya adı YALNIZCA etiket kodundan oluşur. Kod, sistemin ürettiği
    Crockford Base32 alfabesindedir; yine de burada süzülür ki beklenmedik
    bir değer arşivde yol kaçışına dönüşemesin.
  */
  const temiz = etiketKodu.toUpperCase().replace(/[^A-Z0-9-]/g, "");

  if (temiz.length === 0) {
    throw new Error("Etiket kodu geçersiz.");
  }

  return `${temiz}.svg`;
}

/**
 * CSV metnini üretir.
 *
 * Başına BOM konur: Excel, BOM olmadan UTF-8'i Windows-1252 sanıp Türkçe
 * ürün adlarını bozuyor ("Künye" -> "KÃ¼nye").
 * Satır sonu CRLF'tir; Excel'in beklediği biçim budur.
 */
export function csvUret(
  etiketler: BaskiciEtiketi[],
  urunAdi: string
): string {
  const satirlar = [
    CSV_SUTUNLARI.join(";"),
    ...etiketler.map((etiket) =>
      [
        csvHucresi(urunAdi),
        csvHucresi(etiket.etiketKodu),
        csvHucresi(etiket.qrAdresi),
        csvHucresi(svgDosyaAdi(etiket.etiketKodu)),
      ].join(";")
    ),
  ];

  return `﻿${satirlar.join("\r\n")}\r\n`;
}

/**
 * Paketin tamamını ZIP olarak üretir.
 *
 * İçerik: her etiket için bir SVG + tek bir baskici-listesi.csv.
 * `uretimNotu` verilirse ayrıca URETIM-NOTU.txt eklenir (araç paketi).
 * Başka hiçbir dosya eklenmez.
 */
export function baskiciPaketiOlustur(
  etiketler: BaskiciEtiketi[],
  urunAdi: string,
  secenekler: { uretimNotu?: string } = {}
): Buffer {
  if (etiketler.length === 0) {
    throw new Error("Pakete konacak etiket yok.");
  }

  const girdiler: ZipGirdisi[] = etiketler.map((etiket) => ({
    ad: svgDosyaAdi(etiket.etiketKodu),
    icerik: etiket.qrSvg,
  }));

  girdiler.push({
    ad: CSV_DOSYA_ADI,
    icerik: csvUret(etiketler, urunAdi),
  });

  if (secenekler.uretimNotu) {
    girdiler.push({
      ad: URETIM_NOTU_DOSYA_ADI,
      icerik: secenekler.uretimNotu,
    });
  }

  return zipOlustur(girdiler);
}

/**
 * İndirilecek dosyanın adı: arkvium-baskici-<urun>-<parti>-<adet>etiket.zip
 *
 * ADET NEDEN DOSYA ADINDA?
 * Ad yalnızca tarih taşıdığında aynı gün indirilen her paket BİREBİR AYNI
 * ada sahip oluyordu. İndirilenler klasöründe eski paket dururken yenisi
 * "(1)" ekiyle kaydediliyor ve yanlış dosyanın açılması çok kolay hâle
 * geliyordu — matbaaya yanlış QR gitmesi demek. Adet, iki paketi çıplak
 * gözle ayırt edilebilir kılar.
 *
 * Kişisel veri, kimlik veya aktivasyon kodu taşımaz; yalnızca harf, rakam
 * ve tire kalır.
 */
export function paketDosyaAdi(
  urunKodu: string,
  parti: string | number,
  adet: number
): string {
  const urun = String(urunKodu).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const etiket = String(parti).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const sayi = Number.isFinite(adet) && adet > 0 ? Math.floor(adet) : 0;

  return `arkvium-baskici-${urun || "etiket"}-${etiket || "parti"}-${sayi}etiket.zip`;
}

/** Bugünün tarihinden parti etiketi üretir: 2026-09-05 */
export function bugununPartiEtiketi(tarih: Date = new Date()): string {
  const iki = (deger: number) => String(deger).padStart(2, "0");

  return `${tarih.getFullYear()}-${iki(tarih.getMonth() + 1)}-${iki(
    tarih.getDate()
  )}`;
}
