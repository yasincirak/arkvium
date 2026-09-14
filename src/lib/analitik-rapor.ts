import { prisma } from "./prisma";
import { SIPARIS_URUNLERI } from "./siparis";
import type { Aralik } from "./analitik-aralik";
import type { OrderStatus } from "@/generated/prisma/enums";
import { tekilKimlik } from "./analitik-dogrulama";

/**
 * Analitik rapor sorguları (yalnızca okur).
 *
 * İKİ AYRI KAYNAK, BİLEREK:
 *
 *  - Görüntüleme, sepet ve ödeme başlatma sayıları `AnalyticsEvent`
 *    tablosundan gelir.
 *  - SATIŞ ADEDİ VE GELİR `Order` / `OrderItem` tablosundan gelir. Para
 *    rakamının tek doğruluk kaynağı sipariş tablosudur; analitik olayı
 *    bir kopyadır ve mali rapor kopyadan üretilmez.
 *
 * Satışlar `paidAt` alanına göre tarihlenir: satışın gerçekleştiği an,
 * siparişin oluşturulduğu an değil ödemenin onaylandığı andır.
 */

/** Ödemesi gerçekten alınmış sipariş durumları. */
const SATIS_DURUMLARI: OrderStatus[] = ["paid", "preparing", "shipped"];

export type UrunSatiri = {
  kod: string;
  ad: string;
  goruntuleme: number;
  sepeteEkleme: number;
  sepettenCikarma: number;
  odemeBaslatma: number;
  satisAdedi: number;
  gelirKurus: number;
  /** Satış / görüntüleme oranı (yüzde, iki ondalık). */
  donusumYuzde: number | null;
  /** Görüntüleyenlerin yüzde kaçı sepete ekledi. */
  goruntulemedenSepeteYuzde: number | null;
  /** Sepete ekleyenlerin yüzde kaçı satın aldı. */
  sepettenSatisaYuzde: number | null;
};

/**
 * Huni adımları — TEKİL ZİYARETÇİ sayıları.
 *
 * MONOTONLUK GARANTİSİ: her adım "EN AZ bu aşamaya ulaşmış" ziyaretçileri
 * sayar, yalnızca o olayı yazanları değil. Sepete ekleyen bir ziyaretçi
 * tanım gereği ürünü görmüştür; bu yüzden `cart_add` olayı olan ziyaretçi
 * `goruntuleyen` sayısına da girer.
 *
 * Neden gerekli: "sepete ekleme" olayı ürün kartındaki tıklamada,
 * "ürün görüntüleme" olayı ise sipariş sayfası açılışında yazılıyor.
 * Yönlendirme yarıda kesilirse ziyaretçi sepete eklemiş ama görüntüleme
 * yazmamış olurdu ve huni ters dönüp %100'ü aşan oranlar üretirdi.
 */
export type Huni = {
  goruntuleyen: number;
  sepeteEkleyen: number;
  odemeBaslatan: number;
  /** Satın alan tekil ziyaretçi. Sipariş ADEDİ için `satisAdedi` alanı. */
  satinAlan: number;
};

export type AnalitikRaporu = {
  tekilZiyaretci: number;
  /** Toplam ziyaret (oturum). Aynı kişinin her gelişi ayrı sayılır. */
  toplamZiyaret: number;
  sayfaGoruntuleme: number;
  urunGoruntuleme: number;
  sepeteEkleme: number;
  sepettenCikarma: number;
  odemeBaslatma: number;
  basarisizOdeme: number;
  satisAdedi: number;
  gelirKurus: number;
  /** Sepete ekleyip aynı dönemde satın almamış tekil ziyaretçi sayısı. */
  sepetiBirakan: number;
  huni: Huni;
  urunler: UrunSatiri[];
};

function urunAdi(kod: string): string {
  return SIPARIS_URUNLERI.find((urun) => urun.kod === kod)?.ad ?? kod;
}

/** Ürün kodu yalnızca katalogdan doğrulanır; bilinmeyen kod yok sayılır. */
export function urunFiltresiCoz(deger: unknown): string | null {
  if (typeof deger !== "string") {
    return null;
  }

  const kod = deger.trim();

  return SIPARIS_URUNLERI.some((urun) => urun.kod === kod) ? kod : null;
}

/**
 * Tekil KİŞİ sayısı.
 *
 * Kimlik `userId` VEYA `visitorId` olabilir: giriş yapmış kullanıcıda
 * olay yalnızca hesapla ilişkilendirilir (bkz. olayKimligiCoz). İkisi
 * `tekilKimlik` ile tek havuzda, çakışmadan sayılır.
 */
async function tekilZiyaretciSayisi(
  aralik: Aralik,
  turler: Array<
    "page_view" | "product_view" | "cart_add" | "checkout_started" | "purchase"
  >,
  urunKodu: string | null
): Promise<number> {
  const gruplar = await prisma.analyticsEvent.groupBy({
    by: ["visitorId", "userId"],
    where: {
      type: { in: turler },
      createdAt: { gte: aralik.baslangic, lt: aralik.bitis },
      OR: [{ visitorId: { not: null } }, { userId: { not: null } }],
      ...(urunKodu ? { productKod: urunKodu } : {}),
    },
  });

  const kimlikler = new Set(
    gruplar
      .map((grup) => tekilKimlik(grup))
      .filter((kimlik): kimlik is string => kimlik !== null)
  );

  return kimlikler.size;
}

/**
 * Toplam ZİYARET sayısı.
 *
 * Tekil ziyaretçiden farkı: aynı kişi farklı zamanlarda geldiğinde her
 * geliş ayrı sayılır (bkz. ZIYARET_COOKIE — kayan 30 dakikalık pencere).
 */
async function toplamZiyaretSayisi(
  aralik: Aralik,
  urunKodu: string | null
): Promise<number> {
  const gruplar = await prisma.analyticsEvent.groupBy({
    by: ["sessionId"],
    where: {
      createdAt: { gte: aralik.baslangic, lt: aralik.bitis },
      sessionId: { not: null },
      ...(urunKodu ? { productKod: urunKodu } : {}),
    },
  });

  return gruplar.length;
}

/** Belirli türdeki olay sayısı. */
async function olaySayisi(
  aralik: Aralik,
  tur:
    | "page_view"
    | "product_view"
    | "cart_add"
    | "cart_remove"
    | "checkout_started"
    | "payment_failed"
    | "purchase",
  urunKodu: string | null
): Promise<number> {
  return prisma.analyticsEvent.count({
    where: {
      type: tur,
      createdAt: { gte: aralik.baslangic, lt: aralik.bitis },
      ...(urunKodu ? { productKod: urunKodu } : {}),
    },
  });
}

/** Ürün kodu bazında olay sayıları. */
async function urunBazliOlay(
  aralik: Aralik,
  tur: "product_view" | "cart_add" | "cart_remove" | "checkout_started",
  urunKodu: string | null
): Promise<Record<string, number>> {
  const gruplar = await prisma.analyticsEvent.groupBy({
    by: ["productKod"],
    where: {
      type: tur,
      createdAt: { gte: aralik.baslangic, lt: aralik.bitis },
      productKod: urunKodu ? urunKodu : { not: null },
    },
    _count: { _all: true },
  });

  const sonuc: Record<string, number> = {};

  for (const grup of gruplar) {
    if (grup.productKod) {
      sonuc[grup.productKod] = grup._count._all;
    }
  }

  return sonuc;
}

/**
 * Sepete ekleyip SATIN ALMAYAN tekil ziyaretçi sayısı.
 *
 * Satış olayının ziyaretçi kimliği, aynı siparişin `checkout_started`
 * olayından kopyalanır (bkz. src/lib/analitik.ts). Bu yüzden burada
 * ziyaretçi eşleştirmesi doğru çalışır.
 */
async function sepetiBirakanSayisi(
  aralik: Aralik,
  urunKodu: string | null
): Promise<number> {
  const kimlikKumesi = async (
    tur: "cart_add" | "purchase"
  ): Promise<Set<string>> => {
    const gruplar = await prisma.analyticsEvent.groupBy({
      by: ["visitorId", "userId"],
      where: {
        type: tur,
        createdAt: { gte: aralik.baslangic, lt: aralik.bitis },
        OR: [{ visitorId: { not: null } }, { userId: { not: null } }],
        ...(urunKodu ? { productKod: urunKodu } : {}),
      },
    });

    return new Set(
      gruplar
        .map((grup) => tekilKimlik(grup))
        .filter((kimlik): kimlik is string => kimlik !== null)
    );
  };

  const sepeteEkleyenler = await kimlikKumesi("cart_add");

  if (sepeteEkleyenler.size === 0) {
    return 0;
  }

  const satinAlanlar = await kimlikKumesi("purchase");

  /*
    `Array.from` kullanılıyor: tsconfig hedefi Set üzerinde doğrudan
    `for...of` yinelemesine izin vermiyor (downlevelIteration kapalı).
  */
  return Array.from(sepeteEkleyenler).filter(
    (kimlik) => !satinAlanlar.has(kimlik)
  ).length;
}

/** Satış adedi ve gelir — sipariş tablosundan (mali gerçek kaynak). */
async function satisOzeti(
  aralik: Aralik,
  urunKodu: string | null
): Promise<{ adet: number; gelirKurus: number }> {
  const siparisKosulu = {
    status: { in: SATIS_DURUMLARI },
    paidAt: { gte: aralik.baslangic, lt: aralik.bitis },
    ...(urunKodu ? { items: { some: { productKod: urunKodu } } } : {}),
  };

  const adet = await prisma.order.count({ where: siparisKosulu });

  if (!urunKodu) {
    const toplam = await prisma.order.aggregate({
      where: siparisKosulu,
      _sum: { totalKurus: true },
    });

    return { adet, gelirKurus: toplam._sum?.totalKurus ?? 0 };
  }

  /*
    Ürün filtresi varken gelir, siparişin TOPLAMI değil o ürünün satır
    toplamıdır. Aksi hâlde kargo ve diğer kalemler tek ürüne yazılırdı.
  */
  const satirlar = await prisma.orderItem.aggregate({
    where: { productKod: urunKodu, order: siparisKosulu },
    _sum: { lineTotalKurus: true },
  });

  return { adet, gelirKurus: satirlar._sum?.lineTotalKurus ?? 0 };
}

/** Ürün bazında satış adedi ve gelir. */
async function urunBazliSatis(
  aralik: Aralik,
  urunKodu: string | null
): Promise<Record<string, { adet: number; gelirKurus: number }>> {
  const gruplar = await prisma.orderItem.groupBy({
    by: ["productKod"],
    where: {
      ...(urunKodu ? { productKod: urunKodu } : {}),
      order: {
        status: { in: SATIS_DURUMLARI },
        paidAt: { gte: aralik.baslangic, lt: aralik.bitis },
      },
    },
    _sum: { quantity: true, lineTotalKurus: true },
  });

  const sonuc: Record<string, { adet: number; gelirKurus: number }> = {};

  for (const grup of gruplar) {
    sonuc[grup.productKod] = {
      adet: grup._sum?.quantity ?? 0,
      gelirKurus: grup._sum?.lineTotalKurus ?? 0,
    };
  }

  return sonuc;
}

function yuzde(pay: number, payda: number): number | null {
  if (payda <= 0) {
    return null;
  }

  return Math.round((pay / payda) * 10000) / 100;
}

/**
 * Panelin tamamı için tek rapor üretir.
 *
 * Sorgular paralel çalıştırılır; hepsi salt okumadır ve hiçbir kaydı
 * değiştirmez.
 */
export async function analitikRaporu(
  aralik: Aralik,
  urunKodu: string | null = null
): Promise<AnalitikRaporu> {
  const [
    tekilZiyaretci,
    toplamZiyaret,
    sayfaGoruntuleme,
    urunGoruntuleme,
    sepeteEkleme,
    sepettenCikarma,
    odemeBaslatma,
    basarisizOdeme,
    satis,
    goruntulemeler,
    sepetEklemeleri,
    sepetCikarmalari,
    odemeBaslatmalari,
    satislar,
    sepetiBirakan,
    huniGoruntuleyen,
    huniSepet,
    huniOdeme,
    huniSatinAlan,
  ] = await Promise.all([
    tekilZiyaretciSayisi(
      aralik,
      ["page_view", "product_view", "cart_add", "checkout_started", "purchase"],
      urunKodu
    ),
    toplamZiyaretSayisi(aralik, urunKodu),
    olaySayisi(aralik, "page_view", urunKodu),
    olaySayisi(aralik, "product_view", urunKodu),
    olaySayisi(aralik, "cart_add", urunKodu),
    olaySayisi(aralik, "cart_remove", urunKodu),
    olaySayisi(aralik, "checkout_started", urunKodu),
    olaySayisi(aralik, "payment_failed", urunKodu),
    satisOzeti(aralik, urunKodu),
    urunBazliOlay(aralik, "product_view", urunKodu),
    urunBazliOlay(aralik, "cart_add", urunKodu),
    urunBazliOlay(aralik, "cart_remove", urunKodu),
    urunBazliOlay(aralik, "checkout_started", urunKodu),
    urunBazliSatis(aralik, urunKodu),
    sepetiBirakanSayisi(aralik, urunKodu),
    /*
      Huni adımları KÜMELENEREK sayılır: sonraki aşamanın olayını yazan
      ziyaretçi önceki aşamalara da dâhildir. Böylece adımlar hiçbir
      koşulda artan sırada olamaz ve oran %100'ü aşamaz.
    */
    tekilZiyaretciSayisi(
      aralik,
      ["product_view", "cart_add", "checkout_started", "purchase"],
      urunKodu
    ),
    tekilZiyaretciSayisi(
      aralik,
      ["cart_add", "checkout_started", "purchase"],
      urunKodu
    ),
    tekilZiyaretciSayisi(aralik, ["checkout_started", "purchase"], urunKodu),
    tekilZiyaretciSayisi(aralik, ["purchase"], urunKodu),
  ]);

  const urunler: UrunSatiri[] = SIPARIS_URUNLERI.filter(
    (urun) => !urunKodu || urun.kod === urunKodu
  ).map((urun) => {
    const goruntuleme = goruntulemeler[urun.kod] ?? 0;
    const sepeteEklemeSayisi = sepetEklemeleri[urun.kod] ?? 0;
    const satisSatiri = satislar[urun.kod] ?? { adet: 0, gelirKurus: 0 };

    return {
      kod: urun.kod,
      ad: urunAdi(urun.kod),
      goruntuleme,
      sepeteEkleme: sepeteEklemeSayisi,
      sepettenCikarma: sepetCikarmalari[urun.kod] ?? 0,
      odemeBaslatma: odemeBaslatmalari[urun.kod] ?? 0,
      satisAdedi: satisSatiri.adet,
      gelirKurus: satisSatiri.gelirKurus,
      donusumYuzde: yuzde(satisSatiri.adet, goruntuleme),
      goruntulemedenSepeteYuzde: yuzde(sepeteEklemeSayisi, goruntuleme),
      sepettenSatisaYuzde: yuzde(satisSatiri.adet, sepeteEklemeSayisi),
    };
  });

  return {
    tekilZiyaretci,
    toplamZiyaret,
    sayfaGoruntuleme,
    urunGoruntuleme,
    sepeteEkleme,
    sepettenCikarma,
    odemeBaslatma,
    basarisizOdeme,
    satisAdedi: satis.adet,
    gelirKurus: satis.gelirKurus,
    sepetiBirakan,
    huni: {
      goruntuleyen: huniGoruntuleyen,
      sepeteEkleyen: huniSepet,
      odemeBaslatan: huniOdeme,
      // Sipariş adedi DEĞİL, satın alan tekil ziyaretçi sayısı: huninin
      // tüm adımları aynı birimde olmalıdır.
      satinAlan: huniSatinAlan,
    },
    urunler,
  };
}
