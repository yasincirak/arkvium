import { prisma } from "./prisma";
import { fiyatBicimle } from "./siparis";
import { kargoFirmaAdi } from "./kargo";
import {
  epostaGonder,
  siparisIadeEpostasi,
  siparisIptalEpostasi,
  siparisKargoEpostasi,
  uygulamaAdresi,
  type EpostaIcerigi,
  type EpostaSonucu,
} from "./email";

/**
 * Sipariş bilgilendirme e-postaları (iptal, kargo, iade).
 *
 * ────────────────────────────────────────────────────────────
 * BİLDİRİM HATASI ANA İŞLEMİ BOZMAZ
 *
 * Buradaki fonksiyonların hiçbiri HATA FIRLATMAZ. Hepsi kendi
 * `try/catch` bloğuna sarılıdır ve `Promise<void>` döner. Çağıran
 * katmanlar (iptal, kargo, iade) bunları KENDİ TRANSACTION'LARI
 * KAPANDIKTAN SONRA çağırır: e-posta sağlayıcısı çökse bile sipariş
 * iptali, kargo geçişi veya iade kaydı geri alınmaz.
 * ────────────────────────────────────────────────────────────
 *
 * ALICI YALNIZCA SİPARİŞ KAYDINDAN OKUNUR. Hiçbir fonksiyon dışarıdan
 * adres almaz; böylece bir istek gövdesine yazılan adrese sipariş
 * bilgisi gönderilemez.
 *
 * İÇERİKTE HASSAS VERİ YOKTUR: sağlık bilgisi, kimlik numarası, şifre,
 * ödeme sağlayıcısı anahtarı ve kart verisi ne e-postaya ne de loga
 * yazılır. Loglara yalnızca gönderimin başarılı olup olmadığı düşer.
 */

/** Bildirim türü; olay notunda ve testlerde kullanılır. */
export type BildirimTuru = "iptal" | "kargo" | "iade";

export const BILDIRIM_OLAY_TURU = "notification";

const NOT_METNI: Record<BildirimTuru, { basarili: string; basarisiz: string }> =
  {
    iptal: {
      basarili: "İptal bilgilendirme e-postası gönderildi.",
      basarisiz: "İptal bilgilendirme e-postası gönderilemedi.",
    },
    kargo: {
      basarili: "Kargo bilgilendirme e-postası gönderildi.",
      basarisiz: "Kargo bilgilendirme e-postası gönderilemedi.",
    },
    iade: {
      basarili: "İade bilgilendirme e-postası gönderildi.",
      basarisiz: "İade bilgilendirme e-postası gönderilemedi.",
    },
  };

/** Müşterinin kendi sipariş takip sayfası; token yoksa bağlantı üretilmez. */
function siparisTakipAdresi(publicToken: string): string | null {
  const taban = uygulamaAdresi();

  return taban ? `${taban}/odeme/sonuc/${publicToken}` : null;
}

/**
 * Gönderim sonucunu `OrderEvent` satırına yazar.
 *
 * Mevcut bir olayın notu EZİLMEZ: iptal olayının notunda yöneticinin
 * girdiği gerekçe durur ve kaybolmamalıdır. Bunun yerine ayrı bir
 * `notification` olayı açılır.
 */
async function sonucuKaydet(
  orderId: string,
  tur: BildirimTuru,
  gonderildi: boolean
): Promise<void> {
  const metin = NOT_METNI[tur];

  await prisma.orderEvent.create({
    data: {
      orderId,
      type: BILDIRIM_OLAY_TURU,
      note: gonderildi ? metin.basarili : metin.basarisiz,
    },
  });
}

/**
 * Ortak gönderim yolu: içeriği gönderir, sonucu kaydeder, HATA FIRLATMAZ.
 *
 * `gonderici` yalnızca testler için vardır; verilmezse gerçek gönderim
 * katmanı kullanılır.
 */
async function gonderVeKaydet(
  orderId: string,
  tur: BildirimTuru,
  icerik: EpostaIcerigi,
  gonderici?: (icerik: EpostaIcerigi) => Promise<EpostaSonucu>
): Promise<void> {
  let gonderildi = false;

  try {
    const sonuc = await (gonderici ?? epostaGonder)(icerik);

    gonderildi = sonuc.gonderildi;
  } catch (hata) {
    // Sağlayıcı istisnası da başarısızlıktır; ana işlem etkilenmez.
    // Loga yalnızca hatanın TÜRÜ yazılır, içeriği değil.
    console.error(`${tur} bildirimi gönderilemedi:`, (hata as Error)?.name);
  }

  try {
    await sonucuKaydet(orderId, tur, gonderildi);
  } catch (hata) {
    console.error(
      `${tur} bildirim kaydı yazılamadı:`,
      (hata as Error)?.name
    );
  }
}

export type BildirimSecenekleri = {
  orderId: string;
  gonderici?: (icerik: EpostaIcerigi) => Promise<EpostaSonucu>;
};

/**
 * Sipariş iptal bildirimi.
 *
 * `paraIadesiGerekir` çağıran katmandan gelir (bkz. siparis-iptal.ts):
 * ödemesi alınmamış bir siparişte müşteriye iade sözü verilmez.
 */
export async function iptalBildirimiGonder(
  girdi: BildirimSecenekleri & { paraIadesiGerekir: boolean }
): Promise<void> {
  try {
    const siparis = await prisma.order.findUnique({
      where: { id: girdi.orderId },
      select: {
        id: true,
        orderNumber: true,
        fullName: true,
        email: true,
        totalKurus: true,
        publicToken: true,
      },
    });

    if (!siparis?.email) {
      return;
    }

    await gonderVeKaydet(
      siparis.id,
      "iptal",
      {
        alici: siparis.email,
        ...siparisIptalEpostasi(
          siparis.fullName,
          siparis.orderNumber,
          fiyatBicimle(siparis.totalKurus),
          girdi.paraIadesiGerekir,
          siparisTakipAdresi(siparis.publicToken)
        ),
      },
      girdi.gonderici
    );
  } catch (hata) {
    console.error("İptal bildirimi hazırlanamadı:", (hata as Error)?.name);
  }
}

/**
 * Kargoya verildi bildirimi.
 *
 * Kargo bilgisi SİPARİŞ KAYDINDAN okunur; çağırandan alınmaz. Böylece
 * e-postada yalnızca doğrulanıp veritabanına yazılmış değerler yer alır.
 */
export async function kargoBildirimiGonder(
  girdi: BildirimSecenekleri
): Promise<void> {
  try {
    const siparis = await prisma.order.findUnique({
      where: { id: girdi.orderId },
      select: {
        id: true,
        orderNumber: true,
        fullName: true,
        email: true,
        publicToken: true,
        kargoFirmasi: true,
        kargoTakipNo: true,
        kargoTakipUrl: true,
      },
    });

    if (!siparis?.email) {
      return;
    }

    await gonderVeKaydet(
      siparis.id,
      "kargo",
      {
        alici: siparis.email,
        ...siparisKargoEpostasi(
          siparis.fullName,
          siparis.orderNumber,
          {
            firmaAdi: kargoFirmaAdi(siparis.kargoFirmasi),
            takipNo: siparis.kargoTakipNo,
            takipUrl: siparis.kargoTakipUrl,
          },
          siparisTakipAdresi(siparis.publicToken)
        ),
      },
      girdi.gonderici
    );
  } catch (hata) {
    console.error("Kargo bildirimi hazırlanamadı:", (hata as Error)?.name);
  }
}

/**
 * İade tamamlandı bildirimi.
 *
 * YALNIZCA `succeeded` durumundaki iade için gönderilir: açılmış ama
 * henüz sonuçlanmamış bir kayıt müşteriye "paranız iade edildi" diye
 * bildirilemez. Tutar iade kaydından okunur, istemciden alınmaz.
 */
export async function iadeBildirimiGonder(girdi: {
  refundId: string;
  gonderici?: (icerik: EpostaIcerigi) => Promise<EpostaSonucu>;
}): Promise<void> {
  try {
    const iade = await prisma.refund.findUnique({
      where: { id: girdi.refundId },
      select: {
        id: true,
        status: true,
        amountKurus: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            fullName: true,
            email: true,
            publicToken: true,
          },
        },
      },
    });

    if (!iade || iade.status !== "succeeded" || !iade.order?.email) {
      return;
    }

    await gonderVeKaydet(
      iade.order.id,
      "iade",
      {
        alici: iade.order.email,
        ...siparisIadeEpostasi(
          iade.order.fullName,
          iade.order.orderNumber,
          fiyatBicimle(iade.amountKurus),
          siparisTakipAdresi(iade.order.publicToken)
        ),
      },
      girdi.gonderici
    );
  } catch (hata) {
    console.error("İade bildirimi hazırlanamadı:", (hata as Error)?.name);
  }
}
