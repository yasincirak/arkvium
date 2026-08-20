import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import {
  checkoutFormBaslat,
  OdemeHatasi,
  ODEME_BASLATILAMADI,
  type CfBaslatmaIstegi,
  type CfBaslatmaSonucu,
} from "./odeme-saglayici";

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
