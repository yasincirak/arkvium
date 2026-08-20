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
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "OdemeHatasi";
  }
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
    // Sağlayıcı hata kodu loglanır; kullanıcıya sistem detayı gösterilmez.
    console.error(
      "iyzico Checkout Form başlatılamadı:",
      String(yanit?.errorCode ?? "bilinmeyen")
    );

    throw new OdemeHatasi(ODEME_BASLATILAMADI);
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
