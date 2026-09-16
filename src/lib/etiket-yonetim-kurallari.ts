import { etiketKoduNormalize, kodNormalize, type TagDurumu } from "./tags";

/**
 * Yönetim panelindeki etiket arama, iptal ve yenileme KURALLARI.
 *
 * Bu dosya BİLEREK saf tutulur: Prisma, oturum veya ağ çağrısı içermez.
 * Böylece kurallar `DATABASE_URL` olmadan birim testiyle doğrulanabilir
 * (projedeki `*-kurallari.ts` düzeni).
 *
 * GİZLİ DEĞER TAŞIMAZ. Burada ne aktivasyon kodu, ne `activationCodeHash`,
 * ne de `publicToken` işlenir; yalnızca etiketin ÜZERİNE BASILAN ve gizli
 * olmayan `code` değeri ile durum bilgisi kullanılır.
 */

/** Aramanın çalışması için gereken en az karakter (normalleştirme sonrası). */
export const EN_AZ_ARAMA_UZUNLUGU = 2;

/** Tek aramada dönecek en fazla satır. */
export const EN_FAZLA_ARAMA_SONUCU = 50;

export type AramaTerimi = {
  /**
   * `code` sütununda `contains` ile aranacak parça.
   * ARK öneki ATILIR: kullanıcı "ARK-1A2B" da yazsa "1A2B" de yazsa aynı
   * sonuç döner.
   */
  parca: string;
  /**
   * Girdi tam bir etiket koduna benziyorsa (ARK + 8 karakter) tam eşleşme
   * için kullanılacak normalleştirilmiş kod; değilse null.
   */
  tamKod: string | null;
};

/**
 * Kullanıcının yazdığı aramayı sorguya hazır hâle getirir.
 *
 * `kodNormalize` büyük/küçük harf, boşluk ve tire farklarını siler; ayrıca
 * Base32 alfabesinde bulunmayan benzer karakterleri karşılığına çevirir
 * (O→0, I/L→1, U→V). Etiket kodları veritabanında bu normalleştirilmiş
 * biçimde saklandığı için arama her iki tarafta da aynı kurala uyar.
 *
 * Yetersiz uzunlukta girdi `null` döner: tek harfle tüm stoğun taranmasını
 * ve yanlışlıkla devasa sonuç kümesi üretilmesini engeller.
 */
export function aramaTerimiCoz(girdi: unknown): AramaTerimi | null {
  const ham = typeof girdi === "string" ? girdi : "";
  const temiz = kodNormalize(ham);

  if (!temiz) {
    return null;
  }

  // ARK öneki aramada anlam taşımaz; her kodda var.
  const parca = temiz.startsWith("ARK") ? temiz.slice(3) : temiz;

  if (parca.length < EN_AZ_ARAMA_UZUNLUGU) {
    return null;
  }

  const tamKod = parca.length === 8 ? etiketKoduNormalize(parca) : null;

  return { parca, tamKod };
}

/** İptal ve yenileme için etiketin taşıdığı durum bilgisi. */
export type IslemGirdisi = {
  durum: TagDurumu | string;
  /** Etiket bir siparişe rezerve mi? Süresi geçmiş rezervasyon sayılmaz. */
  rezerveMi: boolean;
  /** Ürün türü atanmış mı? Yenileme türü yeni etikete taşır. */
  productKod: string | null;
};

export type IslemUygunlugu = {
  iptalEdilebilir: boolean;
  yenilenebilir: boolean;
  /** Kullanıcıya gösterilecek kısa sebep; uygunsa null. */
  sebep: string | null;
};

/**
 * Bir etikette iptal/yenileme işlemi yapılabilir mi?
 *
 * KURALLAR
 * 1. Zaten iptal edilmiş etiket TEKRAR iptal edilemez ve yenilenemez.
 *    (İptal geri alınamaz; ikinci kez çalıştırmak yeni bir etiket daha
 *    üretirdi.)
 * 2. Bir siparişe REZERVE etiket işleme kapalıdır. Rezerve etiket iptal
 *    edilirse o siparişin karşılanacağı QR ortadan kalkar; bu, sipariş
 *    akışını sessizce bozar.
 * 3. Bunların dışındaki `unused`, `active` ve `inactive` etiketler hem
 *    iptal edilebilir hem yenilenebilir.
 */
export function islemUygunlugu(girdi: IslemGirdisi): IslemUygunlugu {
  if (girdi.durum === "revoked") {
    return {
      iptalEdilebilir: false,
      yenilenebilir: false,
      sebep: "Etiket zaten iptal edilmiş.",
    };
  }

  if (girdi.rezerveMi) {
    return {
      iptalEdilebilir: false,
      yenilenebilir: false,
      sebep: "Etiket bir siparişe rezerve; önce rezervasyon çözülmelidir.",
    };
  }

  return { iptalEdilebilir: true, yenilenebilir: true, sebep: null };
}

/**
 * Rezervasyonun hâlâ geçerli olup olmadığını söyler.
 *
 * `OrderTag.reservationExpiresAt` geçmişte kalmışsa rezervasyon yok
 * sayılır (şemadaki davranışla aynı).
 */
export function rezervasyonGecerliMi(
  sonGecerlilik: Date | null | undefined,
  simdi: Date = new Date()
): boolean {
  if (!sonGecerlilik) {
    return false;
  }

  return sonGecerlilik.getTime() > simdi.getTime();
}

/**
 * Onay için yazılan etiket kodunun doğruluğunu denetler.
 *
 * Yanlış etiket üzerinde işlem yapılmasını engelleyen son kapıdır ve
 * SUNUCUDA da çalıştırılır: istemcideki onay ekranı atlansa bile işlem
 * yanlış koda uygulanamaz.
 *
 * Karşılaştırma normalleştirilmiş kodlar üzerinden yapılır; yöneticinin
 * tireli, boşluklu veya küçük harfle yazması kabul edilir.
 */
export function onayKoduDogru(girilen: unknown, gercekKod: string): boolean {
  const ham = typeof girilen === "string" ? girilen : "";

  if (!ham.trim()) {
    return false;
  }

  return etiketKoduNormalize(ham) === etiketKoduNormalize(gercekKod);
}

/**
 * Tek etiketin QR dosyası için indirme adı.
 *
 * Etiket kodu dosya adına girer; böylece indirilen dosya hangi fiziksel
 * etikete ait olduğu ANLAŞILIR biçimde izlenebilir. Kod gizli değildir
 * (etiketin ön yüzünde yazar). Dosya adı yalnızca güvenli karakterlere
 * indirgenir: yol ayracı, tırnak ve boşluk kalmaz.
 */
export function qrDosyaAdi(etiketKodu: string, kenarMm: number): string {
  const guvenli = String(etiketKodu)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32);

  const olcu = Number.isFinite(kenarMm) && kenarMm > 0 ? kenarMm : 0;

  return `arkvium-qr-${guvenli || "etiket"}-${olcu}mm.svg`;
}

/**
 * Sahibin "Ürün Sayfasını Aç" düğmesinin gideceği adres.
 *
 * Etiketi olan kayıtlar QR okutulduğunda açılan CANONICAL `/t/<token>`
 * sayfasına gider; acil durum kartı yalnızca orada çizilir.
 *
 * Etiketi olmayan (etiket sistemi öncesi) kayıtlar için eski
 * `/item/<kayıt-id>` adresi KORUNUR: basılmış eski QR'lar hâlâ o adrese
 * bakıyor ve bağlantı kırılmamalıdır.
 */
export function urunSayfasiAdresi(girdi: {
  kayitId: string;
  publicToken: string | null;
}): string {
  const token = (girdi.publicToken ?? "").trim();

  return token ? `/t/${token}` : `/item/${girdi.kayitId}`;
}
