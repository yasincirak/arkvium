import { prisma } from "./prisma";

/**
 * QR etiket rezervasyonu.
 *
 * REZERVASYON SAHİPLİK DEĞİLDİR. Bu dosya `Tag` kayıtlarının hiçbir alanını
 * değiştirmez ve `TagEvent` yazmaz: etiketler `status = "unused"`, `userId`
 * ve `itemRecordId` boş olarak kalır. Sahiplik yalnızca aktivasyonda,
 * aktivasyon kodu doğrulandıktan sonra kurulur.
 *
 * Aynı etiketin iki siparişe ayrılmasını engelleyen tek gerçek garanti
 * `OrderTag.tagId` üzerindeki unique kısıttır; uygulama mantığı bunun
 * yerine geçmez.
 *
 * Rezervasyon süresi bu dosyada SABİT DEĞİLDİR: son geçerlilik anı çağıran
 * taraftan parametre olarak gelir (süre değeri henüz doğrulanmadı).
 */

/** `prisma.$transaction` içindeki istemci; ayrı transaction açamaz. */
export type IslemIstemcisi = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Rezervasyon süresi (dakika).
 *
 * Ödeme oturumu bu süre içinde tamamlanmazsa etiketler stoğa döner.
 * Değer kullanıcı tarafından kararlaştırıldı; tek yerden yönetilir.
 */
export const REZERVASYON_SURESI_DAKIKA = 15;

/** Şimdiden itibaren rezervasyonun son geçerlilik anını üretir. */
export function rezervasyonSonGecerliligi(simdi: Date = new Date()): Date {
  return new Date(simdi.getTime() + REZERVASYON_SURESI_DAKIKA * 60 * 1000);
}

/** Rezervasyon çakışması ve stok yetersizliği için ortak hata sınıfı. */
export class StokHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "StokHatasi";
  }
}

export const STOK_YETERSIZ_MESAJI =
  "Şu anda yeterli QR etiketi bulunmuyor. Lütfen daha sonra tekrar deneyin.";

export const REZERVASYON_CAKISMASI_MESAJI =
  "Etiket stoğu şu anda güncelleniyor. Lütfen tekrar deneyin.";

/**
 * Süresi dolmuş rezervasyonları siler ve etiketleri stoğa döndürür.
 *
 * Yalnızca ödemesi tamamlanmamış (`pending`) siparişlerin rezervasyonları
 * temizlenir; ödenmiş bir siparişin etiketi süre dolsa bile serbest
 * bırakılmaz.
 *
 * Ayrı zamanlanmış görev gerekmez: her rezervasyonun ilk adımıdır.
 */
export async function suresiDolanRezervasyonlariTemizle(
  islem: IslemIstemcisi,
  simdi: Date = new Date()
): Promise<number> {
  const sonuc = await islem.orderTag.deleteMany({
    where: {
      reservationExpiresAt: { lt: simdi },
      order: { status: "pending" },
    },
  });

  return sonuc.count;
}

/**
 * Rezerve edilebilir (stoktaki) etiketleri seçen filtre.
 *
 * `productKod` verildiğinde YALNIZCA o ürüne basılmış etiketler sayılır.
 * Türü olmayan (null) eski etiketler hiçbir ürünün stoğuna sayılmaz:
 * hangi fiziksel ürüne basıldıkları bilinmediği için yanlış siparişe
 * ayrılmaları sessiz bir hata olurdu. Önce sınıflandırılmaları gerekir.
 */
function stokFiltresi(productKod?: string) {
  return {
    status: "unused",
    userId: null,
    itemRecordId: null,
    orderTag: { is: null },
    ...(productKod ? { productKod } : {}),
  } as const;
}

/** Rezerve edilebilir (stoktaki) etiket sayısı. */
export async function stoktakiEtiketSayisi(
  islem: IslemIstemcisi,
  productKod?: string
): Promise<number> {
  return islem.tag.count({ where: stokFiltresi(productKod) });
}

/**
 * Bir sipariş kalemi için istenen sayıda etiketi ayırır.
 *
 * Etiketler `Tag` tablosundan değil, yalnızca `OrderTag` satırı yazılarak
 * ayrılır. Yeterli etiket yoksa `StokHatasi` fırlatılır ve çağıran
 * transaction geri alınır.
 */
export async function kalemIcinEtiketAyir(
  islem: IslemIstemcisi,
  ayar: {
    orderId: string;
    orderItemId: string;
    /** Sipariş kaleminin ürün kodu. Yalnızca bu ürünün etiketleri ayrılır. */
    productKod: string;
    adet: number;
    sonGecerlilik: Date;
  }
): Promise<string[]> {
  if (ayar.adet < 1) {
    return [];
  }

  const etiketler = await islem.tag.findMany({
    where: stokFiltresi(ayar.productKod),
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: ayar.adet,
  });

  if (etiketler.length < ayar.adet) {
    throw new StokHatasi(STOK_YETERSIZ_MESAJI);
  }

  await islem.orderTag.createMany({
    data: etiketler.map((etiket) => ({
      orderId: ayar.orderId,
      orderItemId: ayar.orderItemId,
      tagId: etiket.id,
      reservationExpiresAt: ayar.sonGecerlilik,
    })),
  });

  return etiketler.map((etiket) => etiket.id);
}

/**
 * Bir siparişin tüm rezervasyonlarını serbest bırakır.
 *
 * Satırlar SİLİNİR (işaretlenmez); iz `OrderEvent(type: "tags_released")`
 * kaydında kalır. Ödeme başarısız olduğunda veya iptal edildiğinde çağrılır.
 */
export async function rezervasyonuSerbestBirak(
  orderId: string,
  not?: string
): Promise<number> {
  return prisma.$transaction(async (islem) => {
    const silinen = await islem.orderTag.deleteMany({ where: { orderId } });

    if (silinen.count > 0) {
      await islem.orderEvent.create({
        data: { orderId, type: "tags_released", note: not ?? null },
      });
    }

    return silinen.count;
  });
}
