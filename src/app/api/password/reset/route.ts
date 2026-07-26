import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { USER_SESSION_COOKIE } from "@/lib/auth";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import { tokenDurumu, tokenOzetle } from "@/lib/tokens";

const MIN_SIFRE_UZUNLUGU = 8;
const BCRYPT_MALIYETI = 12;

export async function POST(request: Request) {
  try {
    const ipSiniri = await hizSiniriKontrol({
      kapsam: "sifre-belirleme-ip",
      tanimlayici: istemciIpAdresi(request.headers),
      limit: 10,
      pencereSaniye: 60 * 60,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla deneme yapıldı. Lütfen ${Math.ceil(
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
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json(
        { error: "Geçersiz sıfırlama bağlantısı." },
        { status: 400 }
      );
    }

    if (password.length < MIN_SIFRE_UZUNLUGU) {
      return NextResponse.json(
        { error: `Şifre en az ${MIN_SIFRE_UZUNLUGU} karakter olmalıdır.` },
        { status: 400 }
      );
    }

    const kayit = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: tokenOzetle(token) },
    });

    if (!kayit) {
      return NextResponse.json(
        { error: "Bağlantı geçersiz. Lütfen yeni bir sıfırlama talebi oluşturun." },
        { status: 400 }
      );
    }

    const durum = tokenDurumu(kayit);

    if (!durum.gecerli) {
      return NextResponse.json(
        {
          error:
            durum.sebep === "suresi-dolmus"
              ? "Bu bağlantının süresi dolmuş. Lütfen yeni bir sıfırlama talebi oluşturun."
              : "Bu bağlantı daha önce kullanılmış. Lütfen yeni bir sıfırlama talebi oluşturun.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_MALIYETI);
    const simdi = new Date();

    // Şifre değişimi, token kullanımı ve oturum iptali tek işlemde yapılır;
    // yarıda kalırsa hiçbiri uygulanmaz.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: kayit.userId },
        data: {
          passwordHash,
          // Sürüm artırılır; mevcut tüm oturum tokenları geçersiz olur.
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: kayit.id },
        data: { usedAt: simdi },
      }),
      // Aynı kullanıcının bekleyen diğer sıfırlama tokenları da kapatılır.
      prisma.passwordResetToken.updateMany({
        where: { userId: kayit.userId, usedAt: null },
        data: { usedAt: simdi },
      }),
    ]);

    const response = NextResponse.json({
      success: true,
      message: "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
    });

    // Bu tarayıcıdaki oturum da kapatılır.
    response.cookies.delete(USER_SESSION_COOKIE);

    return response;
  } catch (error) {
    console.error("Şifre belirleme hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
