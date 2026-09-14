/**
 * Kargo firmaları ve takip bağlantısı üretimi.
 *
 * Veritabanı bağımlılığı YOKTUR; birim testleriyle doğrulanır.
 *
 * ────────────────────────────────────────────────────────────
 * TAKİP BAĞLANTISI KULLANICIDAN ALINMAZ
 *
 * Yönetici bir adres YAZMAZ; yalnızca beyaz listedeki firmayı seçer ve
 * takip numarasını girer. Bağlantı, o firmanın buradaki KALIBINDAN
 * üretilir ve takip numarası adres kodlamasından geçirilir.
 *
 * Neden: serbest adres alanı olsaydı panele `javascript:` veya
 * `data:` şeması, ya da müşteriyi başka bir siteye götüren bir adres
 * yazılabilirdi. Müşteriye gösterilen bağlantı doğrudan bir kullanıcı
 * girdisi olmamalıdır.
 *
 * Firma listesi kodda tutulur (Tag.productKod ile aynı gerekçe:
 * liste zamanla değişir, enum olsaydı her değişiklik migration
 * gerektirirdi). Geçerlilik denetimi uygulama ucunda yapılır.
 * ────────────────────────────────────────────────────────────
 */

export type KargoFirmasi = {
  /** Veritabanına yazılan sabit kod. */
  kod: string;
  ad: string;
  /**
   * Takip adresi kalıbı. `{takipNo}` yer tutucusu, adres kodlamasından
   * geçirilmiş takip numarasıyla değiştirilir.
   *
   * Kalıp yoksa firma için bağlantı üretilmez; yalnızca firma adı ve
   * takip numarası gösterilir.
   */
  takipKalibi?: string;
};

/**
 * Desteklenen kargo firmaları.
 *
 * Takip adresi kalıpları YALNIZCA doğrulanabilir olanlar için yazılır.
 * Bir firmanın kalıbı bilinmiyorsa uydurulmaz: kalıpsız bırakılır ve
 * müşteriye yalnızca firma adı ile takip numarası gösterilir.
 */
export const KARGO_FIRMALARI: KargoFirmasi[] = [
  { kod: "diger", ad: "Diğer / elden teslim" },
];

export function kargoFirmasiniBul(kod: unknown): KargoFirmasi | undefined {
  if (typeof kod !== "string") {
    return undefined;
  }

  return KARGO_FIRMALARI.find((firma) => firma.kod === kod.trim());
}

/** Takip numarasında izin verilen karakterler ve uzunluk sınırı. */
const TAKIP_NO_KALIBI = /^[A-Za-z0-9-]{4,40}$/;

export const FIRMA_GECERSIZ = "Desteklenmeyen kargo firması.";

export const TAKIP_NO_GECERSIZ =
  "Takip numarası 4–40 karakter olmalı ve yalnızca harf, rakam ve tire içermelidir.";

export type KargoBilgisi = {
  firmaKod: string;
  takipNo: string;
  /** Beyaz listeden türetilmiş adres; kalıp yoksa null. */
  takipUrl: string | null;
};

/**
 * Takip adresini KALIPTAN üretir.
 *
 * Takip numarası `encodeURIComponent` ile kodlanır: numaraya sızdırılan
 * bir karakter adresin yapısını değiştiremez.
 */
export function takipAdresiUret(
  firma: KargoFirmasi,
  takipNo: string
): string | null {
  if (!firma.takipKalibi) {
    return null;
  }

  const adres = firma.takipKalibi.replace(
    "{takipNo}",
    encodeURIComponent(takipNo)
  );

  /*
    İkinci kapı: üretilen adres yine de doğrulanır. Kalıp ileride
    yanlışlıkla bozulursa güvensiz bir adres müşteriye gitmemelidir.
  */
  try {
    const url = new URL(adres);

    if (url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Yöneticinin girdiği kargo bilgisini doğrular.
 *
 * Hem firma hem takip numarası verilmelidir; biri eksikse kargo bilgisi
 * yok sayılır (kısmi bilgi müşteriyi yanıltır).
 */
export function kargoBilgisiDogrula(girdi: {
  firmaKod: unknown;
  takipNo: unknown;
}): KargoBilgisi {
  const firma = kargoFirmasiniBul(girdi.firmaKod);

  if (!firma) {
    throw new Error(FIRMA_GECERSIZ);
  }

  const takipNo = typeof girdi.takipNo === "string" ? girdi.takipNo.trim() : "";

  if (!TAKIP_NO_KALIBI.test(takipNo)) {
    throw new Error(TAKIP_NO_GECERSIZ);
  }

  return {
    firmaKod: firma.kod,
    takipNo,
    takipUrl: takipAdresiUret(firma, takipNo),
  };
}

/** Kargo bilgisi gönderilmiş mi (ikisi de dolu mu). */
export function kargoBilgisiVarMi(girdi: {
  firmaKod?: unknown;
  takipNo?: unknown;
}): boolean {
  const firmaDolu =
    typeof girdi.firmaKod === "string" && girdi.firmaKod.trim().length > 0;

  const takipDolu =
    typeof girdi.takipNo === "string" && girdi.takipNo.trim().length > 0;

  return firmaDolu || takipDolu;
}

/** Firma kodundan görünen adı verir; bilinmeyen kodda kodun kendisi. */
export function kargoFirmaAdi(kod: string | null): string | null {
  if (!kod) {
    return null;
  }

  return kargoFirmasiniBul(kod)?.ad ?? kod;
}
