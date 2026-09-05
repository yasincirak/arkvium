import { deflateRawSync } from "node:zlib";

/**
 * Küçük ZIP yazıcısı (yalnızca yazma).
 *
 * NEDEN KENDİ YAZICIMIZ?
 * Projeye yeni bir bağımlılık eklememek için. İhtiyacımız olan tek şey
 * birkaç küçük metin dosyasını tek arşive koymak; bunun için Node'un
 * yerleşik `zlib` modülü yeterli.
 *
 * GİZLİLİK KARARI — SABİT ZAMAN DAMGASI
 * Her girdiye ZIP çağının başlangıcı (1980-01-01 00:00) yazılır. Gerçek
 * tarih/saat yazılsaydı arşiv metadata'sı üzerinden "bu paket ne zaman,
 * hangi çalışma saatinde üretildi" bilgisi sızardı. Sabit damga ayrıca
 * çıktıyı yeniden üretilebilir kılar: aynı girdi her zaman aynı baytları
 * verir, bu da testlerde doğrulanabilir.
 *
 * Dosya adları UTF-8'dir ve genel amaçlı bayrakta 0x0800 biti işaretlenir;
 * Türkçe karakterli adlar tüm arşiv programlarında doğru açılır.
 */

export type ZipGirdisi = {
  /** Arşiv içindeki yol. Yalnızca ileri bölü kullanılır. */
  ad: string;
  icerik: Buffer | string;
};

/** ZIP çağının başlangıcı: 1980-01-01 00:00:00. */
const SABIT_TARIH = 0x0021;
const SABIT_SAAT = 0x0000;

/** UTF-8 dosya adı bayrağı. */
const UTF8_BAYRAGI = 0x0800;

const CRC32_TABLOSU = (() => {
  const tablo = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let c = i;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    tablo[i] = c >>> 0;
  }

  return tablo;
})();

function crc32(veri: Buffer): number {
  let c = 0xffffffff;

  for (let i = 0; i < veri.length; i += 1) {
    c = CRC32_TABLOSU[(c ^ veri[i]) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Arşiv içindeki dosya adını güvenli hâle getirir.
 *
 * Dizin kaçışı (`../`), mutlak yol ve ters bölü kabul edilmez: kötü bir ad,
 * arşivi açan tarafta beklenmeyen bir yere dosya yazılmasına yol açabilir
 * (zip slip). Ad zaten kod tarafından üretiliyor, bu ikinci savunma hattı.
 */
function adiDogrula(ad: string): string {
  const temiz = ad.replace(/\\/g, "/");

  if (
    temiz.length === 0 ||
    temiz.startsWith("/") ||
    temiz.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(temiz)
  ) {
    throw new Error("Arşiv içinde geçersiz dosya adı.");
  }

  return temiz;
}

export function zipOlustur(girdiler: ZipGirdisi[]): Buffer {
  const yerelBloklar: Buffer[] = [];
  const merkeziBloklar: Buffer[] = [];

  let ofset = 0;

  for (const girdi of girdiler) {
    const ad = Buffer.from(adiDogrula(girdi.ad), "utf8");

    const ham = Buffer.isBuffer(girdi.icerik)
      ? girdi.icerik
      : Buffer.from(girdi.icerik, "utf8");

    const sikistirilmis = deflateRawSync(ham);
    const ozet = crc32(ham);

    const yerelBaslik = Buffer.alloc(30);
    yerelBaslik.writeUInt32LE(0x04034b50, 0);
    yerelBaslik.writeUInt16LE(20, 4); // gereken sürüm
    yerelBaslik.writeUInt16LE(UTF8_BAYRAGI, 6);
    yerelBaslik.writeUInt16LE(8, 8); // yöntem: deflate
    yerelBaslik.writeUInt16LE(SABIT_SAAT, 10);
    yerelBaslik.writeUInt16LE(SABIT_TARIH, 12);
    yerelBaslik.writeUInt32LE(ozet, 14);
    yerelBaslik.writeUInt32LE(sikistirilmis.length, 18);
    yerelBaslik.writeUInt32LE(ham.length, 22);
    yerelBaslik.writeUInt16LE(ad.length, 26);
    yerelBaslik.writeUInt16LE(0, 28); // ek alan yok

    yerelBloklar.push(yerelBaslik, ad, sikistirilmis);

    const merkezi = Buffer.alloc(46);
    merkezi.writeUInt32LE(0x02014b50, 0);
    merkezi.writeUInt16LE(20, 4); // üreten sürüm
    merkezi.writeUInt16LE(20, 6); // gereken sürüm
    merkezi.writeUInt16LE(UTF8_BAYRAGI, 8);
    merkezi.writeUInt16LE(8, 10);
    merkezi.writeUInt16LE(SABIT_SAAT, 12);
    merkezi.writeUInt16LE(SABIT_TARIH, 14);
    merkezi.writeUInt32LE(ozet, 16);
    merkezi.writeUInt32LE(sikistirilmis.length, 20);
    merkezi.writeUInt32LE(ham.length, 24);
    merkezi.writeUInt16LE(ad.length, 28);
    merkezi.writeUInt16LE(0, 30); // ek alan
    merkezi.writeUInt16LE(0, 32); // yorum
    merkezi.writeUInt16LE(0, 34); // disk
    merkezi.writeUInt16LE(0, 36); // iç öznitelik
    merkezi.writeUInt32LE(0, 38); // dış öznitelik
    merkezi.writeUInt32LE(ofset, 42);

    merkeziBloklar.push(merkezi, ad);

    ofset += yerelBaslik.length + ad.length + sikistirilmis.length;
  }

  const merkeziDizin = Buffer.concat(merkeziBloklar);

  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0);
  son.writeUInt16LE(0, 4); // disk numarası
  son.writeUInt16LE(0, 6); // merkezi dizinin başladığı disk
  son.writeUInt16LE(girdiler.length, 8);
  son.writeUInt16LE(girdiler.length, 10);
  son.writeUInt32LE(merkeziDizin.length, 12);
  son.writeUInt32LE(ofset, 16);
  son.writeUInt16LE(0, 20); // arşiv yorumu yok

  return Buffer.concat([...yerelBloklar, merkeziDizin, son]);
}
