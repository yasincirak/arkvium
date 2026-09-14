import { prisma } from "./prisma";
import { iptalBildirimiGonder } from "./siparis-bildirim";
import type { EpostaIcerigi, EpostaSonucu } from "./email";

/*
  Karar tablosu ayrı dosyadadır (siparis-iptal-kurallari.ts):
  veritabanı bağlantısı kurmadan test edilebilmelidir. Buradan yeniden
  dışa aktarılır, çağıran kod tek yerden import eder.
*/
export {
  iptalDavranisi,
  KARGOYA_VERILMIS,
  ZATEN_IPTAL,
  ODEME_BASARISIZ_IPTAL,
  GECERSIZ_DURUM,
  IPTAL_EDILEMEDI,
  type IptalDavranisi,
} from "./siparis-iptal-kurallari";

import {
  iptalDavranisi,
  GECERSIZ_DURUM,
  IPTAL_EDILEMEDI,
} from "./siparis-iptal-kurallari";

/**
 * Sipariş iptali.
 *
 * ────────────────────────────────────────────────────────────
 * NEDEN AYRI DOSYA
 *
 * `siparis-yonetim.ts` yalnızca ileri yönlü hazırlık akışını
 * (`paid → preparing → shipped`) yürütür ve ödemeye, stoğa hiç
 * dokunmaz. İptal bunlardan ikisine birden dokunur: sipariş durumunu
 * geriye alır ve QR rezervasyonunu serbest bırakabilir. Aynı dosyaya
 * konsaydı o katmanın "ödemeye ve stoğa dokunmaz" güvencesi bozulurdu.
 * ────────────────────────────────────────────────────────────
 *
 * PARA İADESİ BU KATMANIN İŞİ DEĞİLDİR. İptal, siparişi `cancelled`
 * yapar ve stoğu döndürür; ödenmiş bir siparişte paranın geri
 * ödenmesi ayrı ve denetlenebilir bir süreçtir (bkz. geri-odeme.ts).
 * Bu yüzden iptal, ödenmiş siparişi "iade tamamlandı" gibi göstermez.
 */

export class SiparisIptalHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "SiparisIptalHatasi";
  }
}

export type IptalSonucu = {
  orderId: string;
  /** İptalde stoğa dönen etiket sayısı. */
  serbestBirakilanEtiket: number;
  /** Ödenmiş siparişte para iadesi gerekiyor mu. */
  paraIadesiGerekir: boolean;
};

/**
 * Siparişi iptal eder.
 *
 * TEK TRANSACTION: durum değişikliği, olay kaydı ve stok iadesi ya
 * birlikte gerçekleşir ya da hiçbiri. Koşullu güncelleme yarış
 * durumunu veritabanı seviyesinde çözer: aynı anda gelen iki iptal
 * isteğinden yalnızca biri 1 satır günceller, ikincisi hata alır ve
 * ETİKETLERİ İKİNCİ KEZ SERBEST BIRAKMAZ.
 *
 * Para iadesi YAPMAZ; yalnızca gerekip gerekmediğini bildirir.
 */
export async function siparisiIptalEt(girdi: {
  orderId: string;
  /** Yönetici işleminde e-posta; müşteri talebinde boş bırakılır. */
  adminEmail?: string | null;
  /** Olay notuna yazılacak kısa gerekçe. Kişisel veri içermemelidir. */
  not?: string | null;
  /** Testler için e-posta gönderici; verilmezse gerçek katman kullanılır. */
  epostaGonderici?: (icerik: EpostaIcerigi) => Promise<EpostaSonucu>;
}): Promise<IptalSonucu> {
  const orderId = String(girdi?.orderId ?? "").trim();

  if (!orderId) {
    throw new SiparisIptalHatasi(GECERSIZ_DURUM);
  }

  const siparis = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!siparis) {
    throw new SiparisIptalHatasi(GECERSIZ_DURUM);
  }

  const davranis = iptalDavranisi(siparis.status);

  if (!davranis.izinli) {
    throw new SiparisIptalHatasi(davranis.gerekce ?? IPTAL_EDILEMEDI);
  }

  const simdi = new Date();

  const sonuc = await prisma.$transaction(async (islem) => {
    /*
      Koşullu güncelleme: yalnızca HÂLÂ aynı durumdaki sipariş iptal
      edilir. Durum bu arada değiştiyse (ör. kargoya verildiyse)
      hiçbir satır güncellenmez ve aşağıdaki adımlar çalışmaz.
    */
    const guncelleme = await islem.order.updateMany({
      where: { id: orderId, status: siparis.status },
      data: { status: "cancelled", cancelledAt: simdi },
    });

    if (guncelleme.count !== 1) {
      return null;
    }

    await islem.orderEvent.create({
      data: {
        orderId,
        type: "cancelled",
        actorAdminEmail: girdi.adminEmail ?? null,
        note: girdi.not ?? null,
      },
    });

    let serbestBirakilan = 0;

    if (davranis.stokGeriDoner) {
      /*
        Rezervasyon AYNI transaction içinde silinir: iptal edilip
        etiketleri stokta kalmış bir sipariş oluşamaz.

        `rezervasyonuSerbestBirak` kendi transaction'ını açtığı için
        burada kullanılmaz; aynı davranış bu transaction içinde
        tekrarlanır.
      */
      const silinen = await islem.orderTag.deleteMany({ where: { orderId } });

      serbestBirakilan = silinen.count;

      if (serbestBirakilan > 0) {
        await islem.orderEvent.create({
          data: {
            orderId,
            type: "tags_released",
            note: "sipariş iptal edildi",
          },
        });
      }
    }

    return serbestBirakilan;
  });

  if (sonuc === null) {
    throw new SiparisIptalHatasi(IPTAL_EDILEMEDI);
  }

  /*
    Bildirim TRANSACTION KAPANDIKTAN SONRA gönderilir ve hata fırlatmaz.
    E-posta sağlayıcısı çökse bile iptal geri alınmaz; yalnızca olay
    notuna "gönderilemedi" düşer.

    İkinci bir iptal isteği buraya hiç ulaşamaz (koşullu güncelleme 0
    satır döner ve yukarıda hata fırlatılır); bu yüzden aynı sipariş
    için ikinci bir iptal e-postası gönderilmez.
  */
  await iptalBildirimiGonder({
    orderId,
    paraIadesiGerekir: davranis.paraIadesiGerekir,
    gonderici: girdi.epostaGonderici,
  });

  return {
    orderId,
    serbestBirakilanEtiket: sonuc,
    paraIadesiGerekir: davranis.paraIadesiGerekir,
  };
}
