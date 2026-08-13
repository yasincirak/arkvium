"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getUserSession } from "./session";
import { hizSiniriKontrol } from "./rate-limit";
import {
  devirDavetiOlustur,
  devirDavetiKabulEt,
  devirDavetiIptal,
} from "./ownership-transfer";
import { devirDavetiEpostasi, epostaGonder, uygulamaAdresi } from "./email";

/**
 * Sahiplik devri daveti — public Server Action.
 *
 * Server Action'lar sayfa korumasından bağımsız, herkese açık HTTP uçlarıdır;
 * oturum ve hız sınırlama kontrolü burada yapılır. Sahiplik kontrolü ve token
 * üretimi `devirDavetiOlustur` servisindedir.
 *
 * Düz token yalnızca bu fonksiyonun belleğinde kalır: e-posta bağlantısına
 * yazılır, dönüş değerine veya loga asla konmaz.
 */

type DevirDavetiYanit =
  | { basarili: true; mesaj: string }
  | { basarili: false; hata: string };

export async function devirDavetiGonder(
  itemRecordId: string,
  aliciEposta: string
): Promise<DevirDavetiYanit> {
  const session = await getUserSession();

  if (!session) {
    return { basarili: false, hata: "Bu işlem için giriş yapmanız gerekiyor." };
  }

  const siniri = await hizSiniriKontrol({
    kapsam: "sahiplik-devri",
    tanimlayici: session.userId,
    limit: 60,
    pencereSaniye: 60 * 60,
  });

  if (!siniri.izinli) {
    return {
      basarili: false,
      hata: `Çok fazla işlem yapıldı. Lütfen ${Math.ceil(
        siniri.bekleSaniye / 60
      )} dakika sonra tekrar deneyin.`,
    };
  }

  const tabanAdres = uygulamaAdresi();

  if (!tabanAdres) {
    return {
      basarili: false,
      hata: "Davet bağlantısı oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
    };
  }

  const kayitId = String(itemRecordId || "").trim();

  if (!kayitId) {
    return { basarili: false, hata: "Ürün bulunamadı." };
  }

  const sonuc = await devirDavetiOlustur(
    session.userId,
    kayitId,
    String(aliciEposta || "")
  );

  if (!sonuc.basarili) {
    return sonuc;
  }

  const bilgi = await prisma.itemRecord.findUnique({
    where: { id: kayitId },
    select: { assetName: true, user: { select: { fullName: true } } },
  });

  const baglanti = `${tabanAdres}/ownership-transfer/accept?token=${encodeURIComponent(
    sonuc.token
  )}`;

  const gecerlilikSaat = Math.max(
    1,
    Math.round((sonuc.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000))
  );

  const icerik = devirDavetiEpostasi(
    bilgi?.user?.fullName ?? null,
    bilgi?.assetName ?? "Ürün",
    baglanti,
    gecerlilikSaat
  );

  const gonderim = await epostaGonder({
    alici: sonuc.toEmail,
    konu: icerik.konu,
    metin: icerik.metin,
  });

  if (!gonderim.gonderildi) {
    // Davet ulaşmadıysa kayıt `pending` bırakılmaz; aksi hâlde ürün için
    // yeni davet oluşturulamaz hâle gelirdi. Mevcut TagEvent kaydı korunur.
    try {
      await prisma.ownershipTransfer.update({
        where: { id: sonuc.transferId },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    } catch (error) {
      console.error("Devir daveti iptal edilemedi:", error);
    }

    return {
      basarili: false,
      hata: "Davet e-postası gönderilemedi. Lütfen tekrar deneyin.",
    };
  }

  return {
    basarili: true,
    mesaj: "Devir daveti gönderildi. Ürün, karşı taraf onaylayana kadar sizde kalır.",
  };
}

/**
 * Davetin kabulü. Girdi olarak yalnızca düz token alınır; token dönüş
 * değerine, loga veya hata mesajına yazılmaz.
 */
export async function devirDavetiKabul(token: string): Promise<
  { basarili: true; mesaj: string } | { basarili: false; hata: string }
> {
  const session = await getUserSession();

  if (!session) {
    return { basarili: false, hata: "Bu işlem için giriş yapmanız gerekiyor." };
  }

  const sonuc = await devirDavetiKabulEt(session.userId, String(token || ""));

  if (!sonuc.basarili) {
    return { basarili: false, hata: sonuc.hata };
  }

  revalidatePath("/account");
  revalidatePath(`/item/${sonuc.itemRecordId}`);

  return {
    basarili: true,
    mesaj: "Devir tamamlandı. Ürün artık hesabınıza bağlı.",
  };
}

/** Bekleyen davetin, ürün sahibi tarafından iptali. */
export async function devirDavetiIptalEt(transferId: string): Promise<
  { basarili: true; mesaj: string } | { basarili: false; hata: string }
> {
  const session = await getUserSession();

  if (!session) {
    return { basarili: false, hata: "Bu işlem için giriş yapmanız gerekiyor." };
  }

  const sonuc = await devirDavetiIptal(session.userId, String(transferId || ""));

  if (!sonuc.basarili) {
    return { basarili: false, hata: sonuc.hata };
  }

  revalidatePath("/account");

  return { basarili: true, mesaj: "Devir daveti iptal edildi." };
}
