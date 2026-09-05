import { inflateRawSync } from "node:zlib";

/**
 * Test amaçlı küçük ZIP okuyucu.
 *
 * `src/lib/zip.ts` yazdığı arşivi BAĞIMSIZ biçimde çözer. Aynı kodu
 * kullansaydı test, yazıcının kendi hatasını doğrulamış olurdu; bu okuyucu
 * arşivi merkezi dizinden okur, yani gerçek bir arşiv programının izlediği
 * yolu izler.
 */

export type ZipDosyasi = {
  ad: string;
  icerik: Buffer;
  /** Sıkıştırılmamış boyut (merkezi dizinden). */
  boyut: number;
  /** Değiştirme tarihi/saati alanları — metadata sızıntısı testi için. */
  tarih: number;
  saat: number;
};

/** Arşivin sonundaki EOCD kaydını bulur. */
function sonKaydiBul(tampon: Buffer): number {
  for (let i = tampon.length - 22; i >= 0; i -= 1) {
    if (tampon.readUInt32LE(i) === 0x06054b50) {
      return i;
    }
  }

  throw new Error("ZIP sonu kaydı bulunamadı.");
}

export function zipOku(tampon: Buffer): ZipDosyasi[] {
  const son = sonKaydiBul(tampon);

  const girdiSayisi = tampon.readUInt16LE(son + 10);
  let ofset = tampon.readUInt32LE(son + 16);

  const dosyalar: ZipDosyasi[] = [];

  for (let i = 0; i < girdiSayisi; i += 1) {
    if (tampon.readUInt32LE(ofset) !== 0x02014b50) {
      throw new Error("Merkezi dizin kaydı bozuk.");
    }

    const yontem = tampon.readUInt16LE(ofset + 10);
    const saat = tampon.readUInt16LE(ofset + 12);
    const tarih = tampon.readUInt16LE(ofset + 14);
    const sikistirilmisBoyut = tampon.readUInt32LE(ofset + 20);
    const boyut = tampon.readUInt32LE(ofset + 24);
    const adUzunlugu = tampon.readUInt16LE(ofset + 28);
    const ekUzunluk = tampon.readUInt16LE(ofset + 30);
    const yorumUzunlugu = tampon.readUInt16LE(ofset + 32);
    const yerelOfset = tampon.readUInt32LE(ofset + 42);

    const ad = tampon
      .subarray(ofset + 46, ofset + 46 + adUzunlugu)
      .toString("utf8");

    // Yerel başlıktan veri başlangıcını hesapla.
    const yerelAdUzunlugu = tampon.readUInt16LE(yerelOfset + 26);
    const yerelEkUzunluk = tampon.readUInt16LE(yerelOfset + 28);
    const veriBasi = yerelOfset + 30 + yerelAdUzunlugu + yerelEkUzunluk;

    const ham = tampon.subarray(veriBasi, veriBasi + sikistirilmisBoyut);
    const icerik = yontem === 8 ? inflateRawSync(ham) : Buffer.from(ham);

    dosyalar.push({ ad, icerik, boyut, tarih, saat });

    ofset += 46 + adUzunlugu + ekUzunluk + yorumUzunlugu;
  }

  return dosyalar;
}
