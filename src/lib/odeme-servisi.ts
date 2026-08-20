import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import {
  checkoutFormBaslat,
  checkoutFormSonucuGetir,
  tutariKurusaCevir,
  OdemeHatasi,
  ODEME_BASLATILAMADI,
  type CfBaslatmaIstegi,
  type CfBaslatmaSonucu,
  type CfDogrulamaSonucu,
} from "./odeme-saglayici";
import { rezervasyonuSerbestBirak } from "./qr-rezervasyon";

/**
 * Ödeme başlatma servisi.
 *
 * GÜVENLİK:
 * - Ödenecek tutar YALNIZCA veritabanındaki siparişten okunur. İstemciden
 *   gelen fiyat, tutar veya sepet verisi bu katmanda hiç kullanılmaz.
 * - Kart bilgisi bu sunucuya hiç gelmez (Checkout Form).
 * - Ödeme burada "ödendi" olmaz: `Payment` kaydı `pending` açılır, sipariş
 *   `pending` kalır. Kesinleşme sağlayıcı doğrulamasıyla (sonraki aşama) olur.
 */

export const SIPARIS_BULUNAMADI = "Sipariş bulunamadı.";

export const SIPARIS_ODENEMEZ =
  "Bu sipariş için ödeme başlatılamıyor.";

export type OdemeBaslatGirdisi = {
  orderId: string;
  /** İstemci IP'si; sağlayıcı alıcı bilgisinde ister. */
  istemciIp?: string;
  /**
   * Kimlik numarası. Kalıcı olarak SAKLANMAZ; yalnızca sağlayıcıya iletilir.
   * iyzico hesabı gereksinimi doğrulanmadığı için varsayılan olarak boştur.
   */
  kimlikNo?: string;
  /** Testlerde gerçek sağlayıcıya çıkmamak için değiştirilebilir. */
  saglayici?: (istek: CfBaslatmaIstegi) => Promise<CfBaslatmaSonucu>;
};

export type OdemeBaslatSonucu = {
  paymentId: string;
  conversationId: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
};

/** Sağlayıcıya gönderilen ve dönüşte eşleştirmeyi sağlayan tekil referans. */
function konusmaKimligiUret(orderNumber: string): string {
  return `${orderNumber}-${randomBytes(4).toString("hex")}`;
}

/** "Ad Soyad" biçimini iyzico'nun ayrı alanlarına böler. */
function adiAyir(fullName: string): { ad: string; soyad: string } {
  const parcalar = fullName.trim().split(/\s+/);

  if (parcalar.length === 1) {
    return { ad: parcalar[0], soyad: parcalar[0] };
  }

  return {
    ad: parcalar.slice(0, -1).join(" "),
    soyad: parcalar[parcalar.length - 1],
  };
}

/**
 * Sipariş için ödeme oturumu başlatır.
 *
 * Sipariş `pending` değilse (ödenmiş, iptal edilmiş veya kargolanmış)
 * ödeme başlatılmaz. Sağlayıcı çağrısı başarısız olursa `Payment` kaydı
 * `failed` yapılır; sipariş ve QR rezervasyonu olduğu gibi kalır.
 */
export async function odemeBaslat(
  girdi: OdemeBaslatGirdisi
): Promise<OdemeBaslatSonucu> {
  const siparis = await prisma.order.findUnique({
    where: { id: girdi.orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalKurus: true,
      subtotalKurus: true,
      shippingKurus: true,
      currency: true,
      fullName: true,
      email: true,
      phone: true,
      addressLine: true,
      district: true,
      city: true,
      postalCode: true,
      items: {
        select: {
          id: true,
          productAdi: true,
          quantity: true,
          lineTotalKurus: true,
        },
      },
    },
  });

  if (!siparis) {
    throw new OdemeHatasi(SIPARIS_BULUNAMADI);
  }

  if (siparis.status !== "pending") {
    throw new OdemeHatasi(SIPARIS_ODENEMEZ);
  }

  if (siparis.items.length === 0) {
    throw new OdemeHatasi(SIPARIS_ODENEMEZ);
  }

  const conversationId = konusmaKimligiUret(siparis.orderNumber);
  const { ad, soyad } = adiAyir(siparis.fullName);

  // Sepet kalemleri + kargo satırı; toplamları siparişin toplamına eşittir.
  const kalemler = [
    ...siparis.items.map((kalem) => ({
      id: kalem.id,
      ad: `${kalem.productAdi} x${kalem.quantity}`,
      fiyatKurus: kalem.lineTotalKurus,
    })),
    {
      id: `kargo-${siparis.id}`,
      ad: "Kargo",
      fiyatKurus: siparis.shippingKurus,
    },
  ];

  // Ödeme kaydı sağlayıcı çağrısından ÖNCE açılır: sağlayıcı yanıt vermese
  // bile denemenin izi kalır.
  const odeme = await prisma.payment.create({
    data: {
      orderId: siparis.id,
      provider: "iyzico",
      providerConversationId: conversationId,
      status: "pending",
      amountKurus: siparis.totalKurus,
      currency: siparis.currency,
    },
    select: { id: true },
  });

  await prisma.orderEvent.create({
    data: { orderId: siparis.id, type: "payment_started" },
  });

  const saglayici = girdi.saglayici ?? checkoutFormBaslat;

  try {
    const sonuc = await saglayici({
      conversationId,
      basketId: siparis.orderNumber,
      toplamKurus: siparis.totalKurus,
      alici: {
        id: siparis.id,
        ad,
        soyad,
        eposta: siparis.email,
        telefon: siparis.phone,
        adres: `${siparis.addressLine} ${siparis.district}`.trim(),
        il: siparis.city,
        ilce: siparis.district,
        postaKodu: siparis.postalCode ?? undefined,
        ip: girdi.istemciIp,
        kimlikNo: girdi.kimlikNo,
      },
      kalemler,
    });

    return {
      paymentId: odeme.id,
      conversationId,
      checkoutFormContent: sonuc.checkoutFormContent,
      paymentPageUrl: sonuc.paymentPageUrl,
    };
  } catch (hata) {
    await prisma.payment.update({
      where: { id: odeme.id },
      data: { status: "failed" },
    });

    await prisma.orderEvent.create({
      data: { orderId: siparis.id, type: "payment_failed" },
    });

    if (hata instanceof OdemeHatasi) {
      throw hata;
    }

    // Sağlayıcı kaynaklı ham hata kullanıcıya gösterilmez.
    console.error("Ödeme başlatma hatası:", (hata as Error)?.name ?? "bilinmeyen");

    throw new OdemeHatasi(ODEME_BASLATILAMADI);
  }
}


/**
 * Sağlayıcı doğrulamasından sonra siparişin ulaştığı durum.
 *
 * `beklemede`: ödeme henüz kesinleşmedi (ör. 3D adımı sürüyor). Sipariş ve
 * rezervasyon olduğu gibi bırakılır.
 */
export type OdemeSonucDurumu = "odendi" | "basarisiz" | "beklemede";

export type OdemeSonucu = {
  durum: OdemeSonucDurumu;
  orderId?: string;
  publicToken?: string;
  /** Aynı bildirim daha önce işlendiyse true; hiçbir değişiklik yapılmaz. */
  zatenIslenmis: boolean;
};

export const ODEME_DOGRULANAMADI =
  "Ödeme doğrulanamadı. Lütfen sipariş durumunu kontrol edin.";

/** Sağlayıcının kesin başarı durumu. */
const BASARILI_DURUM = "SUCCESS";

/** Sağlayıcının kesin başarısızlık durumu. */
const BASARISIZ_DURUM = "FAILURE";

/**
 * Tekrarlanan bildirimleri ayırt eden anahtar.
 *
 * Sağlayıcının bağımsız bir olay kimliği verdiği VARSAYILMAZ: anahtar,
 * doğrulanmış alanların (ödeme kimliği veya konuşma kimliği + durum)
 * kararlı birleşiminden üretilir.
 */
function olayAnahtariUret(sonuc: CfDogrulamaSonucu): string {
  const kimlik = sonuc.paymentId ?? sonuc.conversationId ?? "bilinmeyen";

  return `iyzico:${kimlik}:${sonuc.paymentStatus ?? "bilinmeyen"}`;
}

/**
 * Checkout Form dönüşünü işler.
 *
 * Akış: token ile sağlayıcıdan doğrulama → tekrar kontrolü (PaymentEvent
 * unique kısıtı) → tutar/para birimi karşılaştırması → tek transaction'da
 * durum güncellemesi.
 *
 * Callback gövdesindeki hiçbir alan (tutar, durum, sipariş kimliği) dikkate
 * alınmaz; yalnızca `token` kullanılır.
 */
export async function odemeSonucunuIsle(girdi: {
  token: string;
  /** Testlerde gerçek sağlayıcıya çıkmamak için değiştirilebilir. */
  dogrulayici?: (token: string) => Promise<CfDogrulamaSonucu>;
}): Promise<OdemeSonucu> {
  const token = String(girdi?.token ?? "").trim();

  if (!token) {
    throw new OdemeHatasi(ODEME_DOGRULANAMADI);
  }

  const dogrula = girdi.dogrulayici ?? checkoutFormSonucuGetir;
  const sonuc = await dogrula(token);

  if (!sonuc.basarili || !sonuc.conversationId) {
    throw new OdemeHatasi(ODEME_DOGRULANAMADI);
  }

  const odeme = await prisma.payment.findUnique({
    where: { providerConversationId: sonuc.conversationId },
    select: {
      id: true,
      status: true,
      amountKurus: true,
      currency: true,
      order: { select: { id: true, status: true, publicToken: true } },
    },
  });

  if (!odeme) {
    console.error("Ödeme bildirimi eşleşmedi: bilinmeyen referans.");

    throw new OdemeHatasi(ODEME_DOGRULANAMADI);
  }

  // IDEMPOTENCY: aynı bildirim ikinci kez gelirse unique kısıt engeller.
  try {
    await prisma.paymentEvent.create({
      data: {
        paymentId: odeme.id,
        eventKey: olayAnahtariUret(sonuc),
        eventType: sonuc.paymentStatus ?? "bilinmeyen",
      },
    });
  } catch (hata) {
    if ((hata as { code?: string })?.code === "P2002") {
      return {
        durum:
          odeme.order.status === "paid"
            ? "odendi"
            : odeme.order.status === "failed"
              ? "basarisiz"
              : "beklemede",
        orderId: odeme.order.id,
        publicToken: odeme.order.publicToken,
        zatenIslenmis: true,
      };
    }

    throw hata;
  }

  const olayAnahtari = olayAnahtariUret(sonuc);

  // Ödeme kesinleşmediyse sipariş ve rezervasyon olduğu gibi kalır.
  if (sonuc.paymentStatus !== BASARILI_DURUM) {
    if (sonuc.paymentStatus !== BASARISIZ_DURUM) {
      return {
        durum: "beklemede",
        orderId: odeme.order.id,
        publicToken: odeme.order.publicToken,
        zatenIslenmis: false,
      };
    }

    await prisma.$transaction(async (islem) => {
      await islem.payment.updateMany({
        where: { id: odeme.id, status: "pending" },
        data: { status: "failed", providerRef: sonuc.paymentId ?? null },
      });

      await islem.order.updateMany({
        where: { id: odeme.order.id, status: "pending" },
        data: { status: "failed" },
      });

      await islem.orderEvent.create({
        data: { orderId: odeme.order.id, type: "payment_failed" },
      });

      await islem.paymentEvent.updateMany({
        where: { eventKey: olayAnahtari },
        data: { processedAt: new Date() },
      });
    });

    // Etiketler stoğa döner (ayrı transaction; kendi olayını yazar).
    await rezervasyonuSerbestBirak(odeme.order.id, "ödeme başarısız");

    return {
      durum: "basarisiz",
      orderId: odeme.order.id,
      publicToken: odeme.order.publicToken,
      zatenIslenmis: false,
    };
  }

  // Tutar SAYISAL olarak karşılaştırılır: sağlayıcı "55", "55.0" veya
  // "55.00" gönderebilir; metin eşitliği yanlış negatif üretirdi.
  const odenenKurus =
    sonuc.paidPrice === undefined ? null : tutariKurusaCevir(sonuc.paidPrice);

  const tutarUyusmuyor =
    sonuc.paidPrice !== undefined &&
    (odenenKurus === null || odenenKurus !== odeme.amountKurus);

  if (tutarUyusmuyor || (sonuc.currency && sonuc.currency !== odeme.currency)) {
    console.error("Ödeme tutarı veya para birimi siparişle eşleşmiyor.");

    throw new OdemeHatasi(ODEME_DOGRULANAMADI);
  }

  const simdi = new Date();

  await prisma.$transaction(async (islem) => {
    // Koşullu güncelleme: yalnızca hâlâ bekleyen kayıtlar ilerletilir.
    await islem.payment.updateMany({
      where: { id: odeme.id, status: "pending" },
      data: {
        status: "succeeded",
        providerRef: sonuc.paymentId ?? null,
        confirmedAt: simdi,
      },
    });

    await islem.order.updateMany({
      where: { id: odeme.order.id, status: "pending" },
      data: { status: "paid", paidAt: simdi },
    });

    await islem.orderEvent.create({
      data: { orderId: odeme.order.id, type: "paid" },
    });

    await islem.paymentEvent.updateMany({
      where: { eventKey: olayAnahtari },
      data: { processedAt: simdi },
    });
  });

  // QR rezervasyonu KORUNUR: ödenmiş siparişin etiketleri serbest bırakılmaz.
  return {
    durum: "odendi",
    orderId: odeme.order.id,
    publicToken: odeme.order.publicToken,
    zatenIslenmis: false,
  };
}
