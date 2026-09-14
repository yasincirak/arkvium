import { prisma } from "./prisma";
import {
  gerekceDogrula,
  talepAcilabilirMi,
  TALEP_ACILAMAZ,
  YONETICI_NOTU_EN_FAZLA,
  ZATEN_AKTIF_TALEP,
  type TalepTuru,
} from "./siparis-talebi-kurallari";

/*
  Karar tablosu ayrı dosyadadır; buradan yeniden dışa aktarılır.
*/
export {
  gerekceDogrula,
  talepAcilabilirMi,
  talepTuruMu,
  GEREKCE_EN_AZ,
  GEREKCE_EN_FAZLA,
  TALEP_ACILAMAZ,
  ZATEN_AKTIF_TALEP,
  type TalepTuru,
} from "./siparis-talebi-kurallari";

/**
 * Müşteri iptal/iade talepleri.
 *
 * ────────────────────────────────────────────────────────────
 * ERİŞİM: `publicToken`
 *
 * Müşteri siparişine, sipariş takip sayfasındaki gibi kriptografik
 * `publicToken` ile erişir. Bu kalıp sitede zaten kullanılıyor
 * (`/odeme/sonuc/<token>`): token tahmin edilemez, veritabanı kimliği
 * içermez ve MİSAFİR siparişte de çalışır. Sipariş kimliği (`id`)
 * istemciden ASLA kabul edilmez; aksi hâlde bir müşteri başka bir
 * siparişin kimliğini deneyerek talep açabilirdi.
 * ────────────────────────────────────────────────────────────
 *
 * ÇAKIŞAN TALEP ENGELİ: `OrderRequest.aktifAnahtar` benzersizdir ve
 * talep beklemedeyken sipariş kimliğini taşır. Aynı sipariş için ikinci
 * bir bekleyen talep VERİTABANI seviyesinde oluşamaz; iki eşzamanlı
 * istekten yalnızca biri geçer.
 */

export class SiparisTalebiHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "SiparisTalebiHatasi";
  }
}

export const SIPARIS_BULUNAMADI = "Sipariş bulunamadı.";

export type TalepOzeti = {
  id: string;
  orderId: string;
  orderNumber: string;
  type: TalepTuru;
  status: "pending" | "approved" | "rejected";
  gerekce: string;
  yoneticiNotu: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

/**
 * Müşteri talebi oluşturur.
 *
 * Sipariş `publicToken` ile bulunur; sipariş kimliği istemciden
 * alınmaz. Talep türünün o sipariş durumunda açılabilir olup olmadığı
 * sunucuda karara bağlanır.
 */
export async function talepOlustur(girdi: {
  publicToken: string;
  tur: TalepTuru;
  gerekce: unknown;
}): Promise<TalepOzeti> {
  const token = String(girdi?.publicToken ?? "").trim();

  if (!token) {
    throw new SiparisTalebiHatasi(SIPARIS_BULUNAMADI);
  }

  const siparis = await prisma.order.findUnique({
    where: { publicToken: token },
    select: { id: true, orderNumber: true, status: true },
  });

  if (!siparis) {
    throw new SiparisTalebiHatasi(SIPARIS_BULUNAMADI);
  }

  const karar = talepAcilabilirMi(siparis.status, girdi.tur);

  if (!karar.izinli) {
    throw new SiparisTalebiHatasi(karar.gerekce ?? TALEP_ACILAMAZ);
  }

  // Gerekçe doğrulaması hata mesajını kendisi üretir.
  let gerekce: string;

  try {
    gerekce = gerekceDogrula(girdi.gerekce);
  } catch (hata) {
    throw new SiparisTalebiHatasi((hata as Error).message);
  }

  try {
    const talep = await prisma.orderRequest.create({
      data: {
        orderId: siparis.id,
        type: girdi.tur,
        gerekce,
        // Bekleyen talep sipariş kimliğini taşır: ikinci aktif talep
        // unique kısıt yüzünden oluşamaz.
        aktifAnahtar: siparis.id,
      },
      select: {
        id: true,
        type: true,
        status: true,
        gerekce: true,
        yoneticiNotu: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return {
      id: talep.id,
      orderId: siparis.id,
      orderNumber: siparis.orderNumber,
      type: talep.type,
      status: talep.status,
      gerekce: talep.gerekce,
      yoneticiNotu: talep.yoneticiNotu,
      createdAt: talep.createdAt.toISOString(),
      resolvedAt: talep.resolvedAt?.toISOString() ?? null,
    };
  } catch (hata) {
    // P2002 = aynı sipariş için zaten bekleyen bir talep var.
    if ((hata as { code?: string })?.code === "P2002") {
      throw new SiparisTalebiHatasi(ZATEN_AKTIF_TALEP);
    }

    throw hata;
  }
}

/**
 * Siparişin taleplerini `publicToken` ile listeler (müşteri görünümü).
 *
 * Yalnızca o siparişin talepleri döner; başka siparişin verisi
 * sızdırılmaz.
 */
export async function siparisTalepleri(
  publicToken: string
): Promise<TalepOzeti[]> {
  const token = String(publicToken ?? "").trim();

  if (!token) {
    return [];
  }

  const siparis = await prisma.order.findUnique({
    where: { publicToken: token },
    select: { id: true, orderNumber: true },
  });

  if (!siparis) {
    return [];
  }

  const talepler = await prisma.orderRequest.findMany({
    where: { orderId: siparis.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      gerekce: true,
      yoneticiNotu: true,
      createdAt: true,
      resolvedAt: true,
    },
  });

  return talepler.map((talep) => ({
    id: talep.id,
    orderId: siparis.id,
    orderNumber: siparis.orderNumber,
    type: talep.type,
    status: talep.status,
    gerekce: talep.gerekce,
    yoneticiNotu: talep.yoneticiNotu,
    createdAt: talep.createdAt.toISOString(),
    resolvedAt: talep.resolvedAt?.toISOString() ?? null,
  }));
}

export type YoneticiTalepSatiri = TalepOzeti & {
  /** Yöneticinin kararı verebilmesi için sipariş durumu. */
  siparisDurumu: string;
  musteriAdi: string;
  eposta: string;
  telefon: string;
  totalKurus: number;
};

/** Yönetim panelinde talepleri listeler. */
export async function yoneticiTalepleri(
  yalnizcaBekleyen = false,
  enFazla = 100
): Promise<YoneticiTalepSatiri[]> {
  const talepler = await prisma.orderRequest.findMany({
    where: yalnizcaBekleyen ? { status: "pending" } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: enFazla,
    select: {
      id: true,
      orderId: true,
      type: true,
      status: true,
      gerekce: true,
      yoneticiNotu: true,
      createdAt: true,
      resolvedAt: true,
      order: {
        select: {
          orderNumber: true,
          status: true,
          fullName: true,
          email: true,
          phone: true,
          totalKurus: true,
        },
      },
    },
  });

  return talepler.map((talep) => ({
    id: talep.id,
    orderId: talep.orderId,
    orderNumber: talep.order.orderNumber,
    type: talep.type,
    status: talep.status,
    gerekce: talep.gerekce,
    yoneticiNotu: talep.yoneticiNotu,
    createdAt: talep.createdAt.toISOString(),
    resolvedAt: talep.resolvedAt?.toISOString() ?? null,
    siparisDurumu: talep.order.status,
    musteriAdi: talep.order.fullName,
    eposta: talep.order.email,
    telefon: talep.order.phone,
    totalKurus: talep.order.totalKurus,
  }));
}

export const TALEP_BULUNAMADI = "Talep bulunamadı.";

export const TALEP_ZATEN_SONUCLANDI =
  "Bu talep zaten sonuçlandırılmış. Sayfayı yenileyin.";

/**
 * Talebi onaylar veya reddeder (yönetici).
 *
 * KARAR SİPARİŞİ DEĞİŞTİRMEZ: onaylamak siparişi kendiliğinden iptal
 * etmez ve para iadesi yapmaz. Yönetici, onaydan sonra iptal ve geri
 * ödeme işlemlerini ayrıca yürütür. Böylece "onaylandı" ile
 * "tamamlandı" birbirine karışmaz.
 *
 * Koşullu güncelleme: yalnızca HÂLÂ bekleyen talep sonuçlandırılır;
 * aynı anda gelen iki karardan yalnızca biri geçer.
 */
export async function talebiSonuclandir(girdi: {
  talepId: string;
  karar: "approved" | "rejected";
  yoneticiNotu?: unknown;
  adminEmail: string;
}): Promise<{ talepId: string; karar: "approved" | "rejected" }> {
  const talepId = String(girdi?.talepId ?? "").trim();

  if (!talepId) {
    throw new SiparisTalebiHatasi(TALEP_BULUNAMADI);
  }

  const not =
    typeof girdi.yoneticiNotu === "string"
      ? girdi.yoneticiNotu.trim().slice(0, YONETICI_NOTU_EN_FAZLA)
      : "";

  /*
    Reddetmek GEREKÇE İSTER: müşteri neden reddedildiğini görebilmeli.
    Onaylamada not isteğe bağlıdır.
  */
  if (girdi.karar === "rejected" && not.length === 0) {
    throw new SiparisTalebiHatasi(
      "Reddetme gerekçesi yazmalısınız; müşteriye bu not gösterilir."
    );
  }

  const guncelleme = await prisma.orderRequest.updateMany({
    where: { id: talepId, status: "pending" },
    data: {
      status: girdi.karar,
      yoneticiNotu: not || null,
      actorAdminEmail: girdi.adminEmail,
      resolvedAt: new Date(),
      // Talep sonuçlandı: aktif anahtar boşaltılır ki müşteri
      // gerekirse yeni bir talep açabilsin.
      aktifAnahtar: null,
    },
  });

  if (guncelleme.count !== 1) {
    throw new SiparisTalebiHatasi(TALEP_ZATEN_SONUCLANDI);
  }

  return { talepId, karar: girdi.karar };
}
