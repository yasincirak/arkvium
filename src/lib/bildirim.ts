import { prisma } from "./prisma";
import { fiyatBicimle } from "./siparis";
import { pushGonderiminiBaslat } from "./web-push-gonderim";

/**
 * Yönetici bildirimleri.
 *
 * ────────────────────────────────────────────────────────────
 * TEK BİLDİRİM GARANTİSİ
 *
 * "Aynı sipariş için yalnızca bir bildirim" kuralını uygulama mantığı
 * değil VERİTABANI sağlar: `AdminNotification` üzerindeki
 * `@@unique([type, orderId])` kısıtı. Ödeme dönüşü tekrar gelse, iki
 * sunucu örneği aynı anda işlese veya yönetici sayfayı yenilese bile
 * ikinci satır oluşamaz.
 *
 * Bildirim yalnızca ödeme GERÇEKTEN başarılı olduğunda, sağlayıcı
 * doğrulamasından sonra ve siparişin ilk `paid` geçişinde üretilir
 * (bkz. src/lib/odeme-servisi.ts).
 * ────────────────────────────────────────────────────────────
 *
 * KİŞİSEL VERİ KOPYALANMAZ: bildirim satırında yalnızca sipariş numarası
 * ve tutar durur. Yöneticinin siparişi karşılamak için ihtiyaç duyduğu
 * müşteri bilgileri (ad-soyad, e-posta, telefon, kalemler) bildirime
 * YAZILMAZ; liste okunurken `Order` tablosundan CANLI okunur.
 *
 * Neden böyle: veri tek yerde kalır (sipariş güncellenirse bildirim de
 * güncel görünür) ve kişisel veri ikinci bir tabloya çoğaltılmaz.
 *
 * WEB PUSH GÖVDESİ AYRIDIR: push üçüncü taraf bir servis üzerinden
 * geçtiği için yalnızca sipariş numarası ve tutar taşır; müşteri
 * bilgisi push gövdesine KONMAZ.
 */

export const YENI_SIPARIS = "yeni_siparis";

/**
 * Yeni sipariş bildirimini oluşturur ve web push gönderir.
 *
 * HATA FIRLATMAZ: bildirim üretimi ödeme sonucunu hiçbir koşulda
 * değiştirmemelidir.
 *
 * Dönüş: bildirim bu çağrıda gerçekten oluşturulduysa true. Tekrar
 * çağrılırsa (aynı sipariş) false döner ve push GÖNDERİLMEZ.
 */
export async function yeniSiparisBildirimiOlustur(siparis: {
  orderId: string;
  orderNumber: string;
  totalKurus: number;
}): Promise<boolean> {
  const baslik = "Yeni sipariş";
  const metin = `${siparis.orderNumber} · ${fiyatBicimle(siparis.totalKurus)}`;

  try {
    await prisma.adminNotification.create({
      data: {
        type: YENI_SIPARIS,
        orderId: siparis.orderId,
        baslik,
        metin,
      },
      select: { id: true },
    });
  } catch (hata) {
    // P2002 = aynı sipariş için bildirim zaten var. Beklenen durumdur.
    if ((hata as { code?: string })?.code !== "P2002") {
      console.error("Sipariş bildirimi oluşturulamadı:", (hata as Error)?.name);
    }

    return false;
  }

  /*
    Push YALNIZCA bildirimin ilk kez oluştuğu çağrıda gönderilir; böylece
    telefona da tek bildirim düşer.

    `pushGonderiminiBaslat` ÇAĞIRANI BEKLETMEZ: en fazla kısa bir süre
    beklenir, gönderim uzarsa arka planda sürer. Panel bildirimi zaten
    yukarıda yazıldığı için push gecikse veya hiç gitmese bile yönetici
    siparişi panelde görür.
  */
  try {
    await pushGonderiminiBaslat({
      baslik,
      metin,
      yol: `/admin/orders/${siparis.orderId}`,
      etiket: `siparis-${siparis.orderId}`,
    });
  } catch (hata) {
    console.error("Sipariş push bildirimi gönderilemedi:", (hata as Error)?.name);
  }

  return true;
}

/** Bildirimde gösterilen sipariş kalemi. */
export type BildirimKalemi = {
  ad: string;
  adet: number;
};

export type BildirimSatiri = {
  id: string;
  orderId: string;
  baslik: string;
  metin: string;
  okundu: boolean;
  createdAt: string;

  /*
    Aşağıdaki alanlar `Order` tablosundan CANLI okunur; bildirim satırına
    kopyalanmaz. Sipariş bulunamazsa (teorik olarak silinmiş) null kalır.
  */
  orderNumber: string | null;
  /** Sipariş anında verilen ad-soyad. */
  musteriAdi: string | null;
  eposta: string | null;
  telefon: string | null;
  totalKurus: number | null;
  /** Siparişin verildiği an (ödemenin onaylandığı an değil). */
  siparisTarihi: string | null;
  /** Ödemenin onaylandığı an. */
  odemeTarihi: string | null;
  kalemler: BildirimKalemi[];
};

export type BildirimListesi = {
  okunmamis: number;
  bildirimler: BildirimSatiri[];
};

/** Panelde gösterilecek son bildirimler ve okunmamış sayacı. */
export async function bildirimleriGetir(
  enFazla = 20
): Promise<BildirimListesi> {
  const [okunmamis, satirlar] = await Promise.all([
    prisma.adminNotification.count({ where: { readAt: null } }),
    prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: enFazla,
      select: {
        id: true,
        orderId: true,
        baslik: true,
        metin: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  /*
    Sipariş ayrıntıları TEK sorguda okunur; bildirim başına ayrı sorgu
    atılmaz (liste her 20 saniyede bir tazeleniyor).
  */
  const siparisler = await prisma.order.findMany({
    where: { id: { in: satirlar.map((satir) => satir.orderId) } },
    select: {
      id: true,
      orderNumber: true,
      fullName: true,
      email: true,
      phone: true,
      totalKurus: true,
      createdAt: true,
      paidAt: true,
      items: { select: { productAdi: true, quantity: true } },
    },
  });

  const siparisHaritasi = new Map(siparisler.map((s) => [s.id, s]));

  return {
    okunmamis,
    bildirimler: satirlar.map((satir) => {
      const siparis = siparisHaritasi.get(satir.orderId);

      return {
        id: satir.id,
        orderId: satir.orderId,
        baslik: satir.baslik,
        metin: satir.metin,
        okundu: satir.readAt !== null,
        createdAt: satir.createdAt.toISOString(),

        orderNumber: siparis?.orderNumber ?? null,
        musteriAdi: siparis?.fullName ?? null,
        eposta: siparis?.email ?? null,
        telefon: siparis?.phone ?? null,
        totalKurus: siparis?.totalKurus ?? null,
        siparisTarihi: siparis?.createdAt.toISOString() ?? null,
        odemeTarihi: siparis?.paidAt?.toISOString() ?? null,
        kalemler: (siparis?.items ?? []).map((kalem) => ({
          ad: kalem.productAdi,
          adet: kalem.quantity,
        })),
      };
    }),
  };
}

/**
 * Bildirimi okundu işaretler.
 *
 * Koşullu güncelleme: zaten okunmuş bildirimin zamanı DEĞİŞMEZ.
 */
export async function bildirimiOkunduIsaretle(id: string): Promise<void> {
  await prisma.adminNotification.updateMany({
    where: { id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function tumBildirimleriOkunduIsaretle(): Promise<number> {
  const sonuc = await prisma.adminNotification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });

  return sonuc.count;
}

/**
 * Yöneticinin satış bildirimi tercihi.
 *
 * Ayar satırı yoksa AÇIK kabul edilir; mevcut yöneticiler için veri
 * taşıma gerekmez.
 */
export async function satisBildirimiAcikMi(userId: string): Promise<boolean> {
  const ayar = await prisma.adminNotificationSetting.findUnique({
    where: { userId },
    select: { satisBildirimleriAcik: true },
  });

  return ayar?.satisBildirimleriAcik ?? true;
}

export async function satisBildirimiAyarla(
  userId: string,
  acik: boolean
): Promise<void> {
  await prisma.adminNotificationSetting.upsert({
    where: { userId },
    update: { satisBildirimleriAcik: acik },
    create: { userId, satisBildirimleriAcik: acik },
  });
}
