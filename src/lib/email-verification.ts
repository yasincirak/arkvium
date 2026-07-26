import { prisma } from "./prisma";
import {
  epostaDogrulamaEpostasi,
  epostaGonder,
  uygulamaAdresi,
} from "./email";
import { TOKEN_SURESI, sonKullanmaTarihi, tokenUret } from "./tokens";

/**
 * Doğrulama tokenı üretir, kaydeder ve e-postayı gönderir.
 * Kayıt ve "tekrar gönder" akışlarının ortak adımıdır.
 */
export async function dogrulamaEpostasiGonder(kullanici: {
  id: string;
  email: string;
  fullName: string | null;
}): Promise<{ gonderildi: boolean; hataSebebi?: string }> {
  const adres = uygulamaAdresi();

  if (!adres) {
    return {
      gonderildi: false,
      hataSebebi: "Uygulama adresi yapılandırılmamış.",
    };
  }

  // Önceki kullanılmamış tokenlar geçersiz kılınır; aynı anda yalnızca bir
  // geçerli doğrulama bağlantısı bulunur.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: kullanici.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const { token, tokenHash } = tokenUret();

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash,
      userId: kullanici.id,
      email: kullanici.email,
      expiresAt: sonKullanmaTarihi(TOKEN_SURESI.epostaDogrulama),
    },
  });

  const baglanti = `${adres}/verify-email?token=${token}`;

  const sonuc = await epostaGonder({
    alici: kullanici.email,
    ...epostaDogrulamaEpostasi(
      kullanici.fullName,
      baglanti,
      TOKEN_SURESI.epostaDogrulama / 60
    ),
  });

  if (!sonuc.gonderildi) {
    // Ulaşmayan bağlantı kullanılamaz hâle getirilir.
    await prisma.emailVerificationToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }

  return sonuc;
}
