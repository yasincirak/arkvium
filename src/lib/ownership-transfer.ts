import { prisma } from "./prisma";
import { tokenUret, tokenOzetle, sonKullanmaTarihi } from "./tokens";

/**
 * Sahiplik devri — davet oluşturma servisi.
 *
 * Bu dosya bir Server Action DEĞİLDİR; herkese açık bir uç değildir.
 * Kullanıcı kimliği parametre olarak alınır, oturum ve hız sınırlama
 * kontrolü çağıran katmanın (Server Action) sorumluluğundadır.
 *
 * Token düz metin olarak veritabanına yazılmaz ve loglanmaz; yalnızca
 * SHA-256 özeti saklanır. Düz token sadece dönüş değerinde, yalnızca
 * bellekte çağıran koda verilir (davet e-postasında kullanılmak üzere).
 */

/** Davet süresi: 24 saat. */
const DAVET_SURESI_DAKIKA = 60 * 24;

/** Aşırı uzun e-posta girdisinin veritabanına yazılmasını engeller. */
const EPOSTA_UZUNLUK_SINIRI = 254;

const EPOSTA_DESENI = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DevirDavetiSonucu =
  | {
      basarili: true;
      transferId: string;
      /** Yalnızca bellekte döner; saklanmaz, loglanmaz. */
      token: string;
      /** Normalleştirilmiş alıcı adresi; davet e-postası buraya gider. */
      toEmail: string;
      expiresAt: Date;
    }
  | { basarili: false; hata: string };

/**
 * Bir ürün için sahiplik devri daveti oluşturur.
 *
 * Ürün bu kullanıcıya ait değilse veya hiç yoksa aynı yanıt döner;
 * böylece başkasının kayıt kimliği denenerek varlığı öğrenilemez.
 */
export async function devirDavetiOlustur(
  kullaniciId: string,
  itemRecordId: string,
  aliciEpostaGirdi: string
): Promise<DevirDavetiSonucu> {
  const toEmail = aliciEpostaGirdi.trim().toLowerCase();

  if (!toEmail || toEmail.length > EPOSTA_UZUNLUK_SINIRI) {
    return { basarili: false, hata: "Geçerli bir e-posta adresi giriniz." };
  }

  if (!EPOSTA_DESENI.test(toEmail)) {
    return { basarili: false, hata: "Geçerli bir e-posta adresi giriniz." };
  }

  const kullanici = await prisma.user.findUnique({
    where: { id: kullaniciId },
    select: { email: true },
  });

  if (!kullanici) {
    return { basarili: false, hata: "Bu işlem için giriş yapmanız gerekiyor." };
  }

  if (kullanici.email.trim().toLowerCase() === toEmail) {
    return {
      basarili: false,
      hata: "Ürünü kendi hesabınıza devredemezsiniz.",
    };
  }

  // Sahiplik kontrolü: kayıt hem var olmalı hem de bu kullanıcıya ait olmalı.
  const record = await prisma.itemRecord.findFirst({
    where: { id: itemRecordId, userId: kullaniciId },
    select: { id: true, tag: { select: { id: true } } },
  });

  if (!record) {
    return { basarili: false, hata: "Ürün bulunamadı." };
  }

  // Alıcının hesabı varsa şimdiden bağlanır; yoksa kabul sırasında doldurulur.
  const aliciKullanici = await prisma.user.findUnique({
    where: { email: toEmail },
    select: { id: true },
  });

  if (aliciKullanici?.id === kullaniciId) {
    return {
      basarili: false,
      hata: "Ürünü kendi hesabınıza devredemezsiniz.",
    };
  }

  const { token, tokenHash } = tokenUret();
  const expiresAt = sonKullanmaTarihi(DAVET_SURESI_DAKIKA);

  try {
    const transfer = await prisma.$transaction(
      async (islem) => {
        // Aktif davet kontrolü ile kayıt oluşturma aynı transaction içinde
        // yapılır; Serializable seviyesi, iki isteğin aynı anda kontrolü
        // geçip iki davet oluşturmasını engeller.
        const aktifDavet = await islem.ownershipTransfer.findFirst({
          where: {
            itemRecordId: record.id,
            status: "pending",
            // Süresi geçmiş pending kayıtlar yeni daveti engellemez.
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });

        if (aktifDavet) {
          throw new AktifDavetVar();
        }

        const olusan = await islem.ownershipTransfer.create({
          data: {
            itemRecordId: record.id,
            fromUserId: kullaniciId,
            toUserId: aliciKullanici?.id ?? null,
            toEmail,
            tokenHash,
            status: "pending",
            expiresAt,
          },
          select: { id: true },
        });

        // Audit kaydı etikete bağlıdır. Etiketi olmayan eski (legacy)
        // ürünlerde TagEvent yazılmaz; uydurma tagId üretilmez.
        if (record.tag) {
          await islem.tagEvent.create({
            data: {
              tagId: record.tag.id,
              type: "transfer_requested",
              actorUserId: kullaniciId,
              fromUserId: kullaniciId,
              toUserId: aliciKullanici?.id ?? null,
            },
          });
        }

        return olusan;
      },
      { isolationLevel: "Serializable" }
    );

    return { basarili: true, transferId: transfer.id, token, toEmail, expiresAt };
  } catch (error) {
    if (error instanceof AktifDavetVar) {
      return {
        basarili: false,
        hata: "Bu ürün için bekleyen bir devir daveti zaten var.",
      };
    }

    // Hata metni token içermez.
    console.error("Sahiplik devri daveti oluşturulamadı:", error);

    return {
      basarili: false,
      hata: "Devir daveti oluşturulamadı. Lütfen tekrar deneyin.",
    };
  }
}

/** Transaction'ı geri almak için kullanılan iç sinyal. */
class AktifDavetVar extends Error {}

/** Kabul sırasında transaction'ı geri almak için kullanılan iç sinyal. */
class KabulEdilemedi extends Error {}

/** İptal sırasında transaction'ı geri almak için kullanılan iç sinyal. */
class IptalEdilemedi extends Error {}

const IPTAL_HATASI = "Davet iptal edilemedi. Sayfayı yenileyip tekrar deneyin.";

/**
 * Bekleyen daveti iptal eder.
 *
 * Yalnızca ürünün güncel sahibi iptal edebilir. Durum değişikliği koşullu
 * yapılır: kabul ile iptal aynı anda çalışırsa yalnızca biri 1 satır günceller,
 * diğeri geri alınır.
 */
export async function devirDavetiIptal(
  kullaniciId: string,
  transferId: string
): Promise<{ basarili: true } | { basarili: false; hata: string }> {
  const id = transferId.trim();

  if (!id) {
    return { basarili: false, hata: IPTAL_HATASI };
  }

  try {
    await prisma.$transaction(
      async (islem) => {
        const transfer = await islem.ownershipTransfer.findUnique({
          where: { id },
          select: { id: true, itemRecordId: true, fromUserId: true, status: true },
        });

        if (!transfer || transfer.status !== "pending") {
          throw new IptalEdilemedi();
        }

        // İptali yalnızca daveti gönderen ve ürüne hâlâ sahip olan kullanıcı
        // yapabilir. Ürün bu arada devrolmuşsa iptal edilmez.
        if (transfer.fromUserId !== kullaniciId) {
          throw new IptalEdilemedi();
        }

        const record = await islem.itemRecord.findFirst({
          where: { id: transfer.itemRecordId, userId: transfer.fromUserId },
          select: { id: true },
        });

        if (!record) {
          throw new IptalEdilemedi();
        }

        const iptal = await islem.ownershipTransfer.updateMany({
          where: { id: transfer.id, status: "pending" },
          data: { status: "cancelled", cancelledAt: new Date() },
        });

        if (iptal.count !== 1) {
          throw new IptalEdilemedi();
        }
      },
      { isolationLevel: "Serializable" }
    );

    return { basarili: true };
  } catch (error) {
    if (error instanceof IptalEdilemedi) {
      return { basarili: false, hata: IPTAL_HATASI };
    }

    console.error("Devir daveti iptal edilemedi:", error);

    return { basarili: false, hata: IPTAL_HATASI };
  }
}

/**
 * Geçersiz, süresi dolmuş, kullanılmış ve başkasına ait davetler için tek ve
 * aynı mesaj kullanılır; hangi koşulun tutmadığı dışarıya sızdırılmaz.
 */
const KABUL_HATASI = "Davet geçersiz veya süresi dolmuş.";

export type DevirKabulSonucu =
  | { basarili: true; itemRecordId: string }
  | { basarili: false; hata: string };

/**
 * Sahiplik devri davetini kabul eder.
 *
 * Düz token yalnızca özet almak için kullanılır; veritabanına, loga veya
 * hata mesajına yazılmaz. Kabul tek `Serializable` transaction içinde yapılır:
 * transfer önce koşullu olarak sahiplenilir, ardından ürün ve etiket
 * sahipliği taşınır. Herhangi bir adım tutmazsa hiçbir değişiklik kalmaz.
 */
export async function devirDavetiKabulEt(
  kullaniciId: string,
  tokenGirdi: string
): Promise<DevirKabulSonucu> {
  const token = tokenGirdi.trim();

  if (!token) {
    return { basarili: false, hata: KABUL_HATASI };
  }

  const kullanici = await prisma.user.findUnique({
    where: { id: kullaniciId },
    select: { email: true },
  });

  if (!kullanici) {
    return { basarili: false, hata: "Bu işlem için giriş yapmanız gerekiyor." };
  }

  // Oturum tokenındaki e-posta bayat olabilir; güncel adres veritabanından okunur.
  const guncelEposta = kullanici.email.trim().toLowerCase();

  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { tokenHash: tokenOzetle(token) },
    select: {
      id: true,
      itemRecordId: true,
      fromUserId: true,
      toEmail: true,
      status: true,
      expiresAt: true,
    },
  });

  if (
    !transfer ||
    transfer.status !== "pending" ||
    transfer.expiresAt.getTime() <= Date.now() ||
    transfer.toEmail.trim().toLowerCase() !== guncelEposta ||
    transfer.fromUserId === kullaniciId
  ) {
    return { basarili: false, hata: KABUL_HATASI };
  }

  try {
    await prisma.$transaction(
      async (islem) => {
        // 1) Transferi koşullu sahiplen. Eşzamanlı ikinci kabul burada
        //    0 satır günceller ve işlem geri alınır.
        const sahiplenme = await islem.ownershipTransfer.updateMany({
          where: {
            id: transfer.id,
            status: "pending",
            expiresAt: { gt: new Date() },
          },
          data: {
            status: "accepted",
            acceptedAt: new Date(),
            toUserId: kullaniciId,
          },
        });

        if (sahiplenme.count !== 1) {
          throw new KabulEdilemedi();
        }

        // 2) Ürün hâlâ daveti gönderen kullanıcıya ait olmalı.
        const record = await islem.itemRecord.findFirst({
          where: { id: transfer.itemRecordId, userId: transfer.fromUserId },
          select: { id: true, tag: { select: { id: true, userId: true } } },
        });

        if (!record) {
          throw new KabulEdilemedi();
        }

        await islem.itemRecord.update({
          where: { id: record.id },
          data: { userId: kullaniciId },
        });

        // 2b) Acil durum profili ASLA yeni sahibe devrolmaz.
        //
        //     Sağlık verisi eski sahibe aittir ve açık rızası yalnızca kendi
        //     paylaşımı için geçerlidir. Profil kapatılır, rıza geri çekilmiş
        //     sayılır ve şifreli sağlık/iletişim alanları temizlenir; yakınlar
        //     silinir. Yeni sahip isterse kendi profilini sıfırdan oluşturur.
        const profil = await islem.emergencyProfile.findUnique({
          where: { itemRecordId: record.id },
          select: { id: true },
        });

        if (profil) {
          await islem.emergencyContact.deleteMany({
            where: { emergencyProfileId: profil.id },
          });

          await islem.emergencyProfile.update({
            where: { id: profil.id },
            data: {
              enabled: false,
              disabledAt: new Date(),
              consentWithdrawnAt: new Date(),
              explicitConsentAt: null,
              explicitConsentVersion: null,
              disclaimerAcceptedAt: null,
              emergencyContactDeclarationAcceptedAt: null,
              displayName: null,
              bloodType: null,
              allergies: null,
              medications: null,
              medicalConditions: null,
              emergencyNote: null,
              displayNameGorunur: false,
              bloodTypeGorunur: false,
              allergiesGorunur: false,
              medicationsGorunur: false,
              medicalConditionsGorunur: false,
              emergencyNoteGorunur: false,
              contactsGorunur: false,
              // Sahiplik yeni kullanıcıya geçtiği için profil kabuğu da onun
              // adına kalır; içeriği boştur.
              userId: kullaniciId,
            },
          });
        }

        // 3) Etiketi olmayan eski (legacy) üründe devir yine tamamlanır;
        //    sahte Tag veya TagEvent üretilmez.
        if (record.tag) {
          if (record.tag.userId !== transfer.fromUserId) {
            throw new KabulEdilemedi();
          }

          await islem.tag.update({
            where: { id: record.tag.id },
            data: { userId: kullaniciId },
          });

          await islem.tagEvent.create({
            data: {
              tagId: record.tag.id,
              type: "transferred",
              actorUserId: kullaniciId,
              fromItemRecordId: record.id,
              fromUserId: transfer.fromUserId,
              toUserId: kullaniciId,
            },
          });
        }
      },
      { isolationLevel: "Serializable" }
    );

    return { basarili: true, itemRecordId: transfer.itemRecordId };
  } catch (error) {
    if (error instanceof KabulEdilemedi) {
      return { basarili: false, hata: KABUL_HATASI };
    }

    // Hata metni token içermez.
    console.error("Sahiplik devri kabul edilemedi:", error);

    return {
      basarili: false,
      hata: "Devir tamamlanamadı. Lütfen tekrar deneyin.",
    };
  }
}
