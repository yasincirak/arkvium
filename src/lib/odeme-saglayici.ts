import { createHmac, timingSafeEqual } from "crypto";
import Iyzipay from "iyzipay";

/**
 * Ödeme sağlayıcı adaptörü — iyzico Checkout Form (CF).
 *
 * KART VERİSİ BU SUNUCUDAN GEÇMEZ: CF, kart alanlarını iyzico'nun kendi
 * formunda toplar. Bu dosya yalnızca ödeme oturumu başlatır.
 *
 * Anahtarlar ve callback adresi YALNIZCA ortam değişkenlerinden okunur;
 * koda gömülmez ve hiçbir log/ hata mesajında gösterilmez. Değişkenlerden
 * biri eksikse ödeme hiç başlatılmaz.
 */

export const ODEME_YAPILANDIRMA_HATASI =
  "Ödeme altyapısı şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.";

export const ODEME_BASLATILAMADI =
  "Ödeme başlatılamadı. Lütfen tekrar deneyin.";

/** Yapılandırma veya sağlayıcı kaynaklı, kullanıcıya gösterilebilir hata. */
export class OdemeHatasi extends Error {
  /**
   * Sağlayıcıdan gelen hata kodu/mesajı (yalnızca `errorCode` ve
   * `errorMessage`).
   *
   * KULLANICIYA GÖSTERİLMEZ: `message` genel metin olarak kalır, bu alan
   * yalnızca denetim kaydı (`OrderEvent.note`) ve log içindir. Anahtar,
   * token, imza veya kişisel veri İÇERMEZ.
   */
  readonly saglayiciAyrinti?: string;

  constructor(mesaj: string, saglayiciAyrinti?: string) {
    super(mesaj);
    this.name = "OdemeHatasi";
    this.saglayiciAyrinti = saglayiciAyrinti;
  }
}

/** `OrderEvent.note` alanına yazılacak ayrıntının üst sınırı. */
export const AYRINTI_UZUNLUK_SINIRI = 300;

/**
 * Sağlayıcı yanıtından YALNIZCA `errorCode` ve `errorMessage` alanlarını alır.
 *
 * Başka hiçbir alan okunmaz: `token`, `checkoutFormContent`, `paymentPageUrl`
 * ve sağlayıcının döndürebileceği diğer değerler bu fonksiyondan asla
 * geçmez. Böylece denetim kaydına anahtar veya kişisel veri sızamaz.
 *
 * İki alan da yoksa `undefined` döner ve `note` boş bırakılır.
 */
export function saglayiciHataAyrintisi(yanit: unknown): string | undefined {
  const kayit = (yanit ?? {}) as Record<string, unknown>;
  const parcalar: string[] = [];

  for (const ad of ["errorCode", "errorMessage"] as const) {
    const deger = kayit[ad];

    if (typeof deger !== "string" && typeof deger !== "number") {
      continue;
    }

    const metin = String(deger).trim();

    if (metin) {
      parcalar.push(`${ad}=${metin}`);
    }
  }

  if (parcalar.length === 0) {
    return undefined;
  }

  return parcalar.join(" | ").slice(0, AYRINTI_UZUNLUK_SINIRI);
}

type SaglayiciYapilandirmasi = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  callbackUrl: string;
};

function ortamDegeri(ad: string): string {
  return (process.env[ad] ?? "").trim();
}

/**
 * Ortam değişkenlerini okur ve eksik olanı ADIYLA bildirir.
 *
 * Eksik değişkenin ADI loglanır (değeri asla); kullanıcıya yalnızca genel
 * mesaj döner.
 */
export function odemeYapilandirmasi(): SaglayiciYapilandirmasi {
  const apiKey = ortamDegeri("IYZICO_API_KEY");
  const secretKey = ortamDegeri("IYZICO_SECRET_KEY");
  const baseUrl = ortamDegeri("IYZICO_BASE_URL");
  const callbackUrl = ortamDegeri("IYZICO_CALLBACK_URL");

  const eksikler = [
    ["IYZICO_API_KEY", apiKey],
    ["IYZICO_SECRET_KEY", secretKey],
    ["IYZICO_BASE_URL", baseUrl],
    ["IYZICO_CALLBACK_URL", callbackUrl],
  ]
    .filter(([, deger]) => !deger)
    .map(([ad]) => ad);

  if (eksikler.length > 0) {
    console.error(
      `Ödeme yapılandırması eksik: ${eksikler.join(", ")} tanımlı değil.`
    );

    throw new OdemeHatasi(ODEME_YAPILANDIRMA_HATASI);
  }

  return { apiKey, secretKey, baseUrl, callbackUrl };
}

/** Kuruş tamsayısını iyzico'nun beklediği ondalık metne çevirir: 5500 → "55.00". */
export function kurusuTutaraCevir(kurus: number): string {
  if (!Number.isSafeInteger(kurus) || kurus < 0) {
    throw new OdemeHatasi(ODEME_BASLATILAMADI);
  }

  const lira = Math.trunc(kurus / 100);
  const kalan = kurus % 100;

  return `${lira}.${String(kalan).padStart(2, "0")}`;
}

/**
 * Sağlayıcının ondalık tutar metnini kuruş tamsayısına çevirir.
 *
 * Biçim farkına dayanıklıdır: iyzico tam sayılarda "55.0", bazen "55.00"
 * veya "55" gönderebilir. Metin karşılaştırması yerine sayısal karşılaştırma
 * yapılabilmesi için kullanılır. Çözülemezse null döner.
 */
export function tutariKurusaCevir(metin: string): number | null {
  const temiz = metin.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(temiz)) {
    return null;
  }

  const [lira, kesir = ""] = temiz.split(".");
  const kurus = Number(lira) * 100 + Number(kesir.padEnd(2, "0"));

  return Number.isSafeInteger(kurus) ? kurus : null;
}

export type CfSepetKalemi = {
  id: string;
  ad: string;
  fiyatKurus: number;
};

export type CfAlici = {
  id: string;
  ad: string;
  soyad: string;
  eposta: string;
  telefon: string;
  adres: string;
  il: string;
  ilce: string;
  postaKodu?: string;
  /** İstemci IP'si; iyzico alıcı bilgisinde ister. */
  ip?: string;
  /**
   * Kimlik numarası. Kalıcı olarak SAKLANMAZ ve varsayılan olarak
   * gönderilmez; iyzico hesabı gereksinimi doğrulanınca çağıran taraf verir.
   */
  kimlikNo?: string;
};

export type CfBaslatmaIstegi = {
  conversationId: string;
  basketId: string;
  toplamKurus: number;
  alici: CfAlici;
  kalemler: CfSepetKalemi[];
};

export type CfBaslatmaSonucu = {
  /** CF oturumunu doğrulamak için kullanılan token. */
  token: string;
  /** Sayfaya gömülecek form içeriği (sağlayıcı döndürürse). */
  checkoutFormContent?: string;
  /** Barındırılan ödeme sayfası adresi (sağlayıcı döndürürse). */
  paymentPageUrl?: string;
};

/**
 * Checkout Form oturumu açar.
 *
 * Paketin geri çağırma (callback) tabanlı API'si burada Promise'e sarılır.
 * Yanıtın yalnızca doğrulanmış alanları okunur; ham gövde loglanmaz.
 */
export async function checkoutFormBaslat(
  istek: CfBaslatmaIstegi
): Promise<CfBaslatmaSonucu> {
  const yapilandirma = odemeYapilandirmasi();

  const iyzipay = new Iyzipay({
    apiKey: yapilandirma.apiKey,
    secretKey: yapilandirma.secretKey,
    uri: yapilandirma.baseUrl,
  });

  const tutar = kurusuTutaraCevir(istek.toplamKurus);

  const govde = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: istek.conversationId,
    price: tutar,
    paidPrice: tutar,
    currency: Iyzipay.CURRENCY.TRY,
    basketId: istek.basketId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: yapilandirma.callbackUrl,
    buyer: {
      id: istek.alici.id,
      name: istek.alici.ad,
      surname: istek.alici.soyad,
      gsmNumber: istek.alici.telefon,
      email: istek.alici.eposta,
      identityNumber: istek.alici.kimlikNo,
      registrationAddress: istek.alici.adres,
      city: istek.alici.il,
      country: "Türkiye",
      zipCode: istek.alici.postaKodu,
      ip: istek.alici.ip,
    },
    shippingAddress: {
      contactName: `${istek.alici.ad} ${istek.alici.soyad}`.trim(),
      city: istek.alici.il,
      country: "Türkiye",
      address: istek.alici.adres,
      zipCode: istek.alici.postaKodu,
    },
    billingAddress: {
      contactName: `${istek.alici.ad} ${istek.alici.soyad}`.trim(),
      city: istek.alici.il,
      country: "Türkiye",
      address: istek.alici.adres,
      zipCode: istek.alici.postaKodu,
    },
    basketItems: istek.kalemler.map((kalem) => ({
      id: kalem.id,
      name: kalem.ad,
      category1: "ARKVIUM",
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: kurusuTutaraCevir(kalem.fiyatKurus),
    })),
  };

  const yanit = await new Promise<Record<string, unknown>>(
    (resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(
        govde,
        (hata: unknown, sonuc: Record<string, unknown>) => {
          if (hata) {
            reject(hata);
            return;
          }

          resolve(sonuc);
        }
      );
    }
  );

  if (yanit?.status !== "success" || typeof yanit?.token !== "string") {
    // Hata kodu/mesajı çağırana taşınır: orada denetim kaydına yazılır.
    // Kullanıcıya yine yalnızca genel mesaj döner.
    const ayrinti = saglayiciHataAyrintisi(yanit);

    console.error(
      "iyzico Checkout Form başlatılamadı:",
      ayrinti ?? "ayrıntı yok"
    );

    throw new OdemeHatasi(ODEME_BASLATILAMADI, ayrinti);
  }

  return {
    token: yanit.token,
    checkoutFormContent:
      typeof yanit.checkoutFormContent === "string"
        ? yanit.checkoutFormContent
        : undefined,
    paymentPageUrl:
      typeof yanit.paymentPageUrl === "string" ? yanit.paymentPageUrl : undefined,
  };
}

export type CfDogrulamaSonucu = {
  /** Sağlayıcı çağrısının kendisi başarılı mı (iş sonucundan bağımsız). */
  basarili: boolean;
  /** Ödemenin sağlayıcıdaki durumu; ham metin olarak taşınır. */
  paymentStatus?: string;
  /** Sağlayıcının ödeme kimliği. */
  paymentId?: string;
  /** Ödeme başlatılırken bizim ürettiğimiz referans. */
  conversationId?: string;
  /** Tahsil edilen tutar, sağlayıcının ondalık metin biçiminde. */
  paidPrice?: string;
  currency?: string;
};

/**
 * İmzaya giren alanlar ve SIRASI. Sıra iyzico tarafından belirlenir ve
 * değiştirilemez; tek bir alanın yeri değişirse imza tutmaz.
 */
const IMZA_ALANLARI = [
  "paymentStatus",
  "paymentId",
  "currency",
  "basketId",
  "conversationId",
  "paidPrice",
  "price",
  "token",
] as const;

/** İmzada tutar biçimine çevrilmesi gereken alanlar. */
const TUTAR_ALANLARI: ReadonlySet<string> = new Set(["paidPrice", "price"]);

/**
 * Tutarı iyzico'nun imzada kullandığı "trailingZero" biçimine çevirir.
 *
 * Kural sağlayıcının kendi biçimlendiricisiyle aynıdır: sayıya çevir, metne
 * dök, nokta yoksa ".0" ekle. Örnek: "304.00" → "304.0", 304 → "304.0",
 * "304.50" → "304.5".
 *
 * Sayıya çevrilemeyen değer olduğu gibi bırakılır; imza zaten tutmayacaktır
 * ve doğrulama fail-closed davranır.
 */
function imzaTutarBicimi(deger: string | number): string {
  const sayi = parseFloat(String(deger));

  if (!Number.isFinite(sayi)) {
    return String(deger);
  }

  const metin = sayi.toString();

  return metin.includes(".") ? metin : `${metin}.0`;
}

/** İki hex özeti sabit zamanda karşılaştırır. */
function sabitZamanliEsit(a: string, b: string): boolean {
  const birinci = Buffer.from(a, "utf8");
  const ikinci = Buffer.from(b, "utf8");

  if (birinci.length !== ikinci.length) {
    return false;
  }

  return timingSafeEqual(birinci, ikinci);
}

/**
 * Checkout Form yanıtının imzasını doğrular.
 *
 * Alanlar sabit sırayla ":" ile birleştirilir ve gizli anahtarla
 * HMAC-SHA256 üretilir; sonuç yanıttaki `signature` ile sabit zamanda
 * karşılaştırılır.
 *
 * FAIL-CLOSED: imza yoksa, biçimi bozuksa veya tutmuyorsa `false` döner ve
 * çağıran taraf hiçbir nihai değişiklik yapmaz. İmza ve gizli anahtar
 * hiçbir zaman loglanmaz.
 */
export function cfImzaDogrula(
  yanit: Record<string, unknown>,
  secretKey: string
): boolean {
  const imza = yanit?.signature;

  if (typeof imza !== "string" || !imza.trim() || !secretKey) {
    return false;
  }

  const birlesik = IMZA_ALANLARI.map((ad) => {
    const deger = yanit?.[ad];

    if (typeof deger !== "string" && typeof deger !== "number") {
      return "";
    }

    // Tutar alanları imzada "trailingZero" biçimiyle yer alır: iyzico
    // "304.00" veya 304 döndürse bile imza "304.0" üzerinden üretilmiştir.
    // Ham değer kullanılırsa imza HİÇBİR ZAMAN tutmaz.
    return TUTAR_ALANLARI.has(ad) ? imzaTutarBicimi(deger) : String(deger);
  }).join(":");

  const beklenen = createHmac("sha256", secretKey)
    .update(birlesik)
    .digest("hex");

  return sabitZamanliEsit(beklenen, imza.trim());
}

function metinAlan(kaynak: Record<string, unknown>, ad: string) {
  const deger = kaynak[ad];

  return typeof deger === "string" ? deger : undefined;
}

/**
 * Checkout Form sonucunu SAĞLAYICIDAN doğrular.
 *
 * Callback ile gelen istemci verisine güvenilmez: yalnızca `token` alınır ve
 * ödemenin gerçek durumu bu çağrıyla iyzico'dan sorulur. Ham yanıt loglanmaz.
 */
export async function checkoutFormSonucuGetir(
  token: string
): Promise<CfDogrulamaSonucu> {
  const yapilandirma = odemeYapilandirmasi();

  const iyzipay = new Iyzipay({
    apiKey: yapilandirma.apiKey,
    secretKey: yapilandirma.secretKey,
    uri: yapilandirma.baseUrl,
  });

  const yanit = await new Promise<Record<string, unknown>>(
    (resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        { locale: Iyzipay.LOCALE.TR, token },
        (hata: unknown, sonuc: Record<string, unknown>) => {
          if (hata) {
            reject(hata);
            return;
          }

          resolve(sonuc);
        }
      );
    }
  );

  if (yanit?.status !== "success") {
    console.error(
      "iyzico ödeme sorgusu başarısız:",
      String(yanit?.errorCode ?? "bilinmeyen")
    );

    return { basarili: false };
  }

  // İmza doğrulanmadan hiçbir durum geçişi yapılamaz.
  if (!cfImzaDogrula(yanit, yapilandirma.secretKey)) {
    console.error("iyzico yanıt imzası doğrulanamadı.");

    return { basarili: false };
  }

  return {
    basarili: true,
    paymentStatus: metinAlan(yanit, "paymentStatus"),
    paymentId: metinAlan(yanit, "paymentId"),
    conversationId: metinAlan(yanit, "conversationId"),
    paidPrice: metinAlan(yanit, "paidPrice"),
    currency: metinAlan(yanit, "currency"),
  };
}
