import { prisma } from "./prisma";
import {
  iadeAnahtari,
  iadeTutariniBelirle,
  iadeUygunMu,
  otomatikIadeAcikMi,
  OTOMATIK_IADE_KAPALI,
  ZATEN_ACIK_IADE,
} from "./geri-odeme-kurallari";
import { odemeyiIptalEt, type IptalSonucu } from "./odeme-saglayici";
import { iadeBildirimiGonder } from "./siparis-bildirim";
import type { EpostaIcerigi, EpostaSonucu } from "./email";

/*
  Karar tablosu ve tutar hesabı ayrı dosyadadır; buradan yeniden dışa
  aktarılır.
*/
export {
  iadeAnahtari,
  iadeTutariniBelirle,
  iadeUygunMu,
  otomatikIadeAcikMi,
  OTOMATIK_IADE_ANAHTARI,
  OTOMATIK_IADE_KAPALI,
  TUTAR_ASIYOR,
  TUTAR_GECERSIZ,
  ZATEN_ACIK_IADE,
} from "./geri-odeme-kurallari";

/**
 * Geri ödeme (iade) süreci.
 *
 * ────────────────────────────────────────────────────────────
 * İKİ AŞAMA, BİLEREK AYRI
 *
 * 1. `iadeKaydiOlustur` — denetlenebilir bir `Refund` satırı açar.
 *    DIŞ ÇAĞRI YAPMAZ. Tutarı sunucuda hesaplar.
 * 2. `iadeyiSaglayiciyaGonder` — yalnızca özellik bayrağı AÇIKSA ve
 *    yönetici başlattığında sağlayıcıya istek atar.
 *
 * Bayrak kapalıyken kayıt `requested` durumunda kalır; yönetici iyzico
 * panelinden elle işlem yapıp kimliğini `manuelIadeyiKaydet` ile
 * girer. Böylece otomatik para hareketi varsayılan olarak KAPALIDIR.
 * ────────────────────────────────────────────────────────────
 *
 * SİPARİŞ VE STOK BU KATMANDA DEĞİŞMEZ. Başarısız bir sağlayıcı yanıtı
 * siparişin durumunu veya QR rezervasyonunu yanlışlıkla değiştiremez;
 * bu katman yalnızca `Refund` satırına dokunur.
 */

export class GeriOdemeHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "GeriOdemeHatasi";
  }
}

export const ODEME_BULUNAMADI = "İade edilecek ödeme bulunamadı.";

export const IADE_BULUNAMADI = "İade kaydı bulunamadı.";

export const IADE_SONUCLANMIS = "Bu iade kaydı zaten sonuçlanmış.";

export const SAGLAYICI_REFERANSI_YOK =
  "Ödemenin sağlayıcı referansı yok; otomatik iade yapılamaz. İyzico panelinden elle işlem yapın.";

export type IadeKaydi = {
  id: string;
  orderId: string;
  paymentId: string;
  amountKurus: number;
  currency: string;
  status: "requested" | "processing" | "succeeded" | "failed";
  providerRefundId: string | null;
  errorCode: string | null;
  manuelIslemKimligi: string | null;
  createdAt: string;
  completedAt: string | null;
  /** Otomatik iade kapalıysa yöneticiye gösterilecek uyarı. */
  manuelIslemGerekli: boolean;
};

function kaydiDisaAktar(satir: {
  id: string;
  orderId: string;
  paymentId: string;
  amountKurus: number;
  currency: string;
  status: IadeKaydi["status"];
  providerRefundId: string | null;
  errorCode: string | null;
  manuelIslemKimligi: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): IadeKaydi {
  return {
    id: satir.id,
    orderId: satir.orderId,
    paymentId: satir.paymentId,
    amountKurus: satir.amountKurus,
    currency: satir.currency,
    status: satir.status,
    providerRefundId: satir.providerRefundId,
    errorCode: satir.errorCode,
    manuelIslemKimligi: satir.manuelIslemKimligi,
    createdAt: satir.createdAt.toISOString(),
    completedAt: satir.completedAt?.toISOString() ?? null,
    manuelIslemGerekli: !otomatikIadeAcikMi(),
  };
}

/**
 * İade kaydı açar. DIŞ ÇAĞRI YAPMAZ.
 *
 * Tutar istemciden güvenilir kabul edilmez: ödemenin tahsil edilen
 * tutarından ve daha önce başarıyla iade edilmiş toplamdan hesaplanır.
 *
 * IDEMPOTENCY: `Refund.aktifAnahtar` benzersizdir ve açık kayıtta
 * `iade:<paymentId>` değerini taşır. Aynı ödeme için ikinci bir açık
 * iade kaydı VERİTABANI seviyesinde oluşamaz.
 */
export async function iadeKaydiOlustur(girdi: {
  orderId: string;
  /** Yöneticinin istediği tutar; verilmezse kalanın tamamı. */
  istenenKurus?: unknown;
  adminEmail: string;
}): Promise<IadeKaydi> {
  const orderId = String(girdi?.orderId ?? "").trim();

  if (!orderId) {
    throw new GeriOdemeHatasi(ODEME_BULUNAMADI);
  }

  const siparis = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      currency: true,
      payments: {
        where: { status: "succeeded" },
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: { id: true, status: true, amountKurus: true, currency: true },
      },
    },
  });

  if (!siparis || siparis.payments.length === 0) {
    throw new GeriOdemeHatasi(ODEME_BULUNAMADI);
  }

  const odeme = siparis.payments[0];

  const uygunluk = iadeUygunMu(siparis.status, odeme.status);

  if (!uygunluk.uygun) {
    throw new GeriOdemeHatasi(uygunluk.gerekce ?? ODEME_BULUNAMADI);
  }

  // Daha önce BAŞARIYLA iade edilmiş toplam düşülür.
  const oncekiler = await prisma.refund.aggregate({
    where: { paymentId: odeme.id, status: "succeeded" },
    _sum: { amountKurus: true },
  });

  let tutar: number;

  try {
    tutar = iadeTutariniBelirle({
      odenenKurus: odeme.amountKurus,
      oncekiIadeKurus: oncekiler._sum?.amountKurus ?? 0,
      istenenKurus: girdi.istenenKurus,
    });
  } catch (hata) {
    throw new GeriOdemeHatasi((hata as Error).message);
  }

  try {
    const kayit = await prisma.refund.create({
      data: {
        orderId: siparis.id,
        paymentId: odeme.id,
        amountKurus: tutar,
        currency: odeme.currency,
        status: "requested",
        actorAdminEmail: girdi.adminEmail,
        aktifAnahtar: iadeAnahtari(odeme.id),
      },
      select: {
        id: true,
        orderId: true,
        paymentId: true,
        amountKurus: true,
        currency: true,
        status: true,
        providerRefundId: true,
        errorCode: true,
        manuelIslemKimligi: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return kaydiDisaAktar(kayit);
  } catch (hata) {
    if ((hata as { code?: string })?.code === "P2002") {
      throw new GeriOdemeHatasi(ZATEN_ACIK_IADE);
    }

    throw hata;
  }
}

/**
 * İade kaydını sağlayıcıya gönderir.
 *
 * ÖZELLİK BAYRAĞI KAPALIYSA HİÇ ÇAĞRI YAPILMAZ ve kayıt olduğu gibi
 * kalır; yöneticiye elle işlem yapması gerektiği bildirilir.
 *
 * Durum akışı: requested → processing → (succeeded | failed).
 * `processing`e geçiş koşullu güncellemeyle yapılır: aynı anda gelen
 * iki istekten yalnızca biri sağlayıcıya çıkar, ikincisi hata alır.
 * ÇİFT İADE böylece hem uygulama hem veritabanı seviyesinde engellenir.
 *
 * `saglayici` parametresi testler için değiştirilebilir; testlerde
 * gerçek ağ çağrısı YAPILMAZ.
 */
export async function iadeyiSaglayiciyaGonder(girdi: {
  refundId: string;
  adminEmail: string;
  saglayici?: (istek: {
    saglayiciOdemeKimligi: string;
    conversationId: string;
    aciklama?: string;
  }) => Promise<IptalSonucu>;
  /** Testler için bayrak durumu; verilmezse ortamdan okunur. */
  otomatikAcik?: boolean;
  /** Testler için e-posta gönderici; verilmezse gerçek katman kullanılır. */
  epostaGonderici?: (icerik: EpostaIcerigi) => Promise<EpostaSonucu>;
}): Promise<IadeKaydi> {
  const refundId = String(girdi?.refundId ?? "").trim();

  const kayit = await prisma.refund.findUnique({
    where: { id: refundId },
    select: {
      id: true,
      status: true,
      paymentId: true,
      payment: {
        select: { providerRef: true, providerConversationId: true },
      },
    },
  });

  if (!kayit) {
    throw new GeriOdemeHatasi(IADE_BULUNAMADI);
  }

  if (kayit.status !== "requested") {
    throw new GeriOdemeHatasi(IADE_SONUCLANMIS);
  }

  const acik = girdi.otomatikAcik ?? otomatikIadeAcikMi();

  if (!acik) {
    // Bayrak kapalı: DIŞ ÇAĞRI YOK, kayıt olduğu gibi kalır.
    throw new GeriOdemeHatasi(OTOMATIK_IADE_KAPALI);
  }

  if (!kayit.payment.providerRef) {
    throw new GeriOdemeHatasi(SAGLAYICI_REFERANSI_YOK);
  }

  /*
    Koşullu geçiş: yalnızca HÂLÂ `requested` olan kayıt işleme alınır.
    İkinci eşzamanlı istek 0 satır günceller ve sağlayıcıya çıkmaz.
  */
  const kilit = await prisma.refund.updateMany({
    where: { id: refundId, status: "requested" },
    data: { status: "processing" },
  });

  if (kilit.count !== 1) {
    throw new GeriOdemeHatasi(IADE_SONUCLANMIS);
  }

  const gonder = girdi.saglayici ?? odemeyiIptalEt;

  let sonuc: IptalSonucu;

  try {
    sonuc = await gonder({
      saglayiciOdemeKimligi: kayit.payment.providerRef,
      conversationId: `iade-${kayit.id}`,
      aciklama: "musteri iadesi",
    });
  } catch (hata) {
    // Beklenmeyen hata da başarısızlık sayılır; kayıt açıkta kalmaz.
    console.error("İade sağlayıcı çağrısı hatası:", (hata as Error)?.name);

    sonuc = { basarili: false, hataKodu: "istisna" };
  }

  const simdi = new Date();

  const guncel = await prisma.refund.update({
    where: { id: refundId },
    data: sonuc.basarili
      ? {
          status: "succeeded",
          providerRefundId: sonuc.saglayiciIslemKimligi ?? null,
          errorCode: null,
          completedAt: simdi,
          actorAdminEmail: girdi.adminEmail,
          // Başarılı iade kapanır; anahtar boşalır ki gerekirse kalan
          // tutar için yeni bir kayıt açılabilsin.
          aktifAnahtar: null,
        }
      : {
          status: "failed",
          errorCode: sonuc.hataKodu ?? "bilinmeyen",
          completedAt: simdi,
          actorAdminEmail: girdi.adminEmail,
          // Başarısız iade kapanır; yönetici yeniden deneyebilsin.
          aktifAnahtar: null,
        },
    select: {
      id: true,
      orderId: true,
      paymentId: true,
      amountKurus: true,
      currency: true,
      status: true,
      providerRefundId: true,
      errorCode: true,
      manuelIslemKimligi: true,
      createdAt: true,
      completedAt: true,
    },
  });

  /*
    Bildirim YALNIZCA iade gerçekten tamamlandığında gider. Başarısız
    yanıtta müşteriye "paranız iade edildi" denmez.

    Gönderim kaydın güncellenmesinden SONRA yapılır ve hata fırlatmaz:
    e-posta gitmese bile iade kaydı `succeeded` kalır. `processing`
    kilidi sayesinde tek kayıt tek kez sonuçlanır; çift bildirim olmaz.
  */
  if (guncel.status === "succeeded") {
    await iadeBildirimiGonder({
      refundId: guncel.id,
      gonderici: girdi.epostaGonderici,
    });
  }

  return kaydiDisaAktar(guncel);
}

/**
 * Yöneticinin iyzico panelinden elle yaptığı iadeyi kaydeder.
 *
 * Otomatik iade kapalıyken izlenen yol budur. DIŞ ÇAĞRI YAPILMAZ;
 * yalnızca işlem kimliği kaydedilir ve iade başarılı olarak kapatılır.
 */
export async function manuelIadeyiKaydet(girdi: {
  refundId: string;
  islemKimligi: unknown;
  adminEmail: string;
  /** Testler için e-posta gönderici; verilmezse gerçek katman kullanılır. */
  epostaGonderici?: (icerik: EpostaIcerigi) => Promise<EpostaSonucu>;
}): Promise<IadeKaydi> {
  const refundId = String(girdi?.refundId ?? "").trim();

  const islemKimligi =
    typeof girdi.islemKimligi === "string"
      ? girdi.islemKimligi.trim().slice(0, 200)
      : "";

  if (!islemKimligi) {
    throw new GeriOdemeHatasi(
      "İyzico panelindeki işlem kimliğini girmelisiniz."
    );
  }

  const simdi = new Date();

  /*
    Koşullu güncelleme: yalnızca henüz sonuçlanmamış kayıt kapatılır.
    Zaten başarılı bir iade ikinci kez kapatılamaz.
  */
  const guncelleme = await prisma.refund.updateMany({
    where: { id: refundId, status: { in: ["requested", "failed"] } },
    data: {
      status: "succeeded",
      manuelIslemKimligi: islemKimligi,
      completedAt: simdi,
      actorAdminEmail: girdi.adminEmail,
      errorCode: null,
      aktifAnahtar: null,
    },
  });

  if (guncelleme.count !== 1) {
    throw new GeriOdemeHatasi(IADE_SONUCLANMIS);
  }

  const kayit = await prisma.refund.findUniqueOrThrow({
    where: { id: refundId },
    select: {
      id: true,
      orderId: true,
      paymentId: true,
      amountKurus: true,
      currency: true,
      status: true,
      providerRefundId: true,
      errorCode: true,
      manuelIslemKimligi: true,
      createdAt: true,
      completedAt: true,
    },
  });

  /*
    Elle yapılan iade de müşteriye bildirilir. Koşullu güncelleme
    sayesinde yalnızca gerçekten kapatan istek buraya ulaşır; zaten
    kapanmış bir kayıt için ikinci bildirim gönderilmez.
  */
  await iadeBildirimiGonder({
    refundId: kayit.id,
    gonderici: girdi.epostaGonderici,
  });

  return kaydiDisaAktar(kayit);
}

/** Siparişin iade kayıtlarını listeler (yönetici görünümü). */
export async function siparisIadeleri(orderId: string): Promise<IadeKaydi[]> {
  const kayitlar = await prisma.refund.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderId: true,
      paymentId: true,
      amountKurus: true,
      currency: true,
      status: true,
      providerRefundId: true,
      errorCode: true,
      manuelIslemKimligi: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return kayitlar.map(kaydiDisaAktar);
}
