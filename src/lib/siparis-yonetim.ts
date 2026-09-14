import { prisma } from "./prisma";
import {
  kargoBilgisiDogrula,
  kargoBilgisiVarMi,
  type KargoBilgisi,
} from "./kargo";

/**
 * Sipariş hazırlık ve kargo durumu yönetimi (yönetici işlemleri).
 *
 * Bu katman ÖDEMEYE VE QR REZERVASYONUNA DOKUNMAZ: `Payment`, `PaymentEvent`,
 * `OrderTag`, `Tag` ve `TagEvent` kayıtları değişmez. Yalnızca siparişin
 * hazırlık/kargo durumu ilerletilir.
 *
 * Geçişler koşullu güncelleme ile yapılır: aynı anda gelen iki yönetici
 * isteğinden yalnızca biri 1 satır günceller, ikincisi hiçbir değişiklik
 * yapmaz ve olay yazmaz.
 *
 * ────────────────────────────────────────────────────────────
 * KARGO BİLGİSİ ZORUNLU DEĞİLDİR
 *
 * Bu katmanın ilk sürümü `shipped` geçişine kargo bilgisi olmadan izin
 * veriyordu. Bilgiyi zorunlu yapmak mevcut iş kuralını değiştirmek
 * olurdu ve bunun istenip istenmediği koddan okunamıyor; bu yüzden
 * VARSAYIM YAPILMADI. Bilgi gönderilirse doğrulanır ve kaydedilir,
 * gönderilmezse geçiş eskisi gibi çalışır.
 * ────────────────────────────────────────────────────────────
 */

export type YonetimDurumu = "preparing" | "shipped";

/** Hedef duruma geçebilmek için siparişin bulunması gereken durum. */
export type OncekiDurum = "paid" | "preparing";

/**
 * İzin verilen tek yönlü geçişler.
 *
 * `paid → preparing → shipped` dışındaki hiçbir geçiş kabul edilmez;
 * geri alma, iptal ve iade bu aşamanın kapsamı dışındadır.
 */
export const IZINLI_GECISLER: Record<YonetimDurumu, OncekiDurum> = {
  preparing: "paid",
  shipped: "preparing",
};

export const GECERSIZ_DURUM = "Geçersiz sipariş durumu.";

export const GECIS_YAPILAMAZ =
  "Sipariş bu duruma geçirilemiyor. Sayfayı yenileyip güncel durumu kontrol edin.";

/** Yönetici işlemlerinde kullanıcıya gösterilebilir hata. */
export class SiparisYonetimHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "SiparisYonetimHatasi";
  }
}

export type DurumGuncellemeSonucu = {
  orderId: string;
  durum: YonetimDurumu;
  /** `shipped` geçişinde kaydedilen kargo bilgisi; yoksa null. */
  kargo: KargoBilgisi | null;
};

/**
 * Siparişin hazırlık/kargo durumunu ilerletir.
 *
 * Yalnızca beklenen önceki durumdaki sipariş ilerler; başka bir durumdaysa
 * (henüz ödenmemiş, iptal edilmiş veya zaten kargolanmış) işlem reddedilir.
 * `shipped` geçişinde `shippedAt` yazılır; `status` dışındaki ödeme ve tutar
 * alanlarına dokunulmaz.
 */
export async function siparisDurumunuGuncelle(girdi: {
  orderId: string;
  hedefDurum: string;
  adminEmail: string;
  /**
   * `shipped` geçişinde kargo firması ve takip numarası.
   *
   * ZORUNLU DEĞİLDİR: mevcut iş kuralı kargo bilgisi olmadan da
   * kargoya verme geçişine izin veriyordu ve bu davranış korunuyor
   * (bkz. dosya başındaki not). Gönderilirse doğrulanır; kısmi
   * gönderim reddedilir.
   */
  kargoFirmaKod?: unknown;
  kargoTakipNo?: unknown;
}): Promise<DurumGuncellemeSonucu> {
  const orderId = String(girdi?.orderId ?? "").trim();
  const hedef = String(girdi?.hedefDurum ?? "").trim() as YonetimDurumu;

  if (!orderId || !(hedef in IZINLI_GECISLER)) {
    throw new SiparisYonetimHatasi(GECERSIZ_DURUM);
  }

  /*
    Kargo bilgisi YALNIZCA `shipped` geçişinde anlamlıdır. Kısmen
    gönderilmişse (yalnızca firma veya yalnızca numara) reddedilir:
    eksik bilgi müşteriye yanıltıcı bir takip satırı gösterirdi.
  */
  let kargo: KargoBilgisi | null = null;

  const kargoGonderildi = kargoBilgisiVarMi({
    firmaKod: girdi.kargoFirmaKod,
    takipNo: girdi.kargoTakipNo,
  });

  if (hedef === "shipped" && kargoGonderildi) {
    try {
      kargo = kargoBilgisiDogrula({
        firmaKod: girdi.kargoFirmaKod,
        takipNo: girdi.kargoTakipNo,
      });
    } catch (hata) {
      throw new SiparisYonetimHatasi((hata as Error).message);
    }
  }

  const beklenenOncekiDurum = IZINLI_GECISLER[hedef];
  const simdi = new Date();

  const gecisSayisi = await prisma.$transaction(async (islem) => {
    // Koşullu güncelleme yarış durumunu veritabanı seviyesinde çözer.
    const guncelleme = await islem.order.updateMany({
      where: { id: orderId, status: beklenenOncekiDurum },
      data:
        hedef === "shipped"
          ? {
              status: hedef,
              shippedAt: simdi,
              // Kargo bilgisi yalnızca gönderildiyse yazılır; eski
              // değerler boşuna silinmez.
              ...(kargo
                ? {
                    kargoFirmasi: kargo.firmaKod,
                    kargoTakipNo: kargo.takipNo,
                    kargoTakipUrl: kargo.takipUrl,
                  }
                : {}),
            }
          : { status: hedef },
    });

    if (guncelleme.count !== 1) {
      return 0;
    }

    // Yalnızca gerçekten geçiş olduğunda tek olay yazılır.
    await islem.orderEvent.create({
      data: {
        orderId,
        type: hedef,
        actorAdminEmail: girdi.adminEmail,
      },
    });

    return guncelleme.count;
  });

  if (gecisSayisi !== 1) {
    throw new SiparisYonetimHatasi(GECIS_YAPILAMAZ);
  }

  return { orderId, durum: hedef, kargo };
}
