import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import {
  epostaGonder,
  sifreSifirlamaEpostasi,
  uygulamaAdresi,
} from "@/lib/email";
import { TOKEN_SURESI, sonKullanmaTarihi, tokenUret } from "@/lib/tokens";

/**
 * Şifre sıfırlama talebi.
 *
 * Yanıt, e-posta kayıtlı olsa da olmasa da AYNIDIR. Aksi hâlde bu uç,
 * hangi e-postaların sisteme kayıtlı olduğunu öğrenmek için kullanılabilirdi.
 */

const ORTAK_YANIT = {
  success: true,
  message:
    "Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.",
};

export async function POST(request: Request) {
  try {
    const ip = istemciIpAdresi(request.headers);

    const ipSiniri = await hizSiniriKontrol({
      kapsam: "sifre-sifirlama-ip",
      tanimlayici: ip,
      limit: 5,
      pencereSaniye: 60 * 60,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla talep gönderildi. Lütfen ${Math.ceil(
            ipSiniri.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipSiniri.bekleSaniye) },
        }
      );
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "E-posta adresi zorunludur." },
        { status: 400 }
      );
    }

    const epostaSiniri = await hizSiniriKontrol({
      kapsam: "sifre-sifirlama-eposta",
      tanimlayici: email,
      limit: 3,
      pencereSaniye: 60 * 60,
    });

    if (!epostaSiniri.izinli) {
      // Sınır aşıldığında da ortak yanıt döner; numaralandırma engellenir.
      return NextResponse.json(ORTAK_YANIT);
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(ORTAK_YANIT);
    }

    const adres = uygulamaAdresi();

    if (!adres) {
      return NextResponse.json(
        { error: "Şifre sıfırlama şu anda kullanılamıyor." },
        { status: 500 }
      );
    }

    // Aynı kullanıcı için önceki kullanılmamış tokenlar geçersiz kılınır.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { token, tokenHash } = tokenUret();

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: sonKullanmaTarihi(TOKEN_SURESI.sifreSifirlama),
      },
    });

    const baglanti = `${adres}/reset-password?token=${token}`;

    const sonuc = await epostaGonder({
      alici: user.email,
      ...sifreSifirlamaEpostasi(
        user.fullName,
        baglanti,
        TOKEN_SURESI.sifreSifirlama
      ),
    });

    if (!sonuc.gonderildi) {
      // Gönderilemeyen bağlantı kullanılamaz; token hemen geçersiz kılınır.
      await prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      });

      return NextResponse.json(
        {
          error:
            "Şifre sıfırlama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(ORTAK_YANIT);
  } catch (error) {
    console.error("Şifre sıfırlama talebi hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
