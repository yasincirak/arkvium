import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  USER_SESSION_COOKIE,
  createUserSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { getUserSession } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";

const MIN_SIFRE_UZUNLUGU = 8;
const BCRYPT_MALIYETI = 12;

/** Giriş yapmış kullanıcının mevcut şifresiyle yeni şifre belirlemesi. */
export async function POST(request: Request) {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const siniri = await hizSiniriKontrol({
      kapsam: "sifre-degistirme",
      tanimlayici: session.userId,
      limit: 5,
      pencereSaniye: 15 * 60,
    });

    if (!siniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla deneme yapıldı. Lütfen ${Math.ceil(
            siniri.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(siniri.bekleSaniye) },
        }
      );
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mevcut şifre ve yeni şifre zorunludur." },
        { status: 400 }
      );
    }

    if (newPassword.length < MIN_SIFRE_UZUNLUGU) {
      return NextResponse.json(
        { error: `Yeni şifre en az ${MIN_SIFRE_UZUNLUGU} karakter olmalıdır.` },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "Yeni şifre mevcut şifrenizden farklı olmalıdır." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    const mevcutDogru = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!mevcutDogru) {
      return NextResponse.json(
        { error: "Mevcut şifreniz hatalı." },
        { status: 401 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_MALIYETI);
    const simdi = new Date();

    const [guncelKullanici] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        // Sürüm artırılır; diğer cihazlardaki açık oturumlar kapanır.
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
        select: { sessionVersion: true },
      }),
      // Bekleyen şifre sıfırlama bağlantıları da geçersiz kılınır.
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: simdi },
      }),
    ]);

    const response = NextResponse.json({
      success: true,
      message: "Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.",
    });

    // Bu cihazdaki oturum, GÜNCEL sürümü taşıyan yeni bir tokenla tazelenir;
    // kullanıcı kendi işlemi yüzünden dışarı atılmaz.
    const yeniToken = await createUserSessionToken({
      userId: user.id,
      email: user.email,
      sessionVersion: guncelKullanici.sessionVersion,
    });

    response.cookies.set(
      USER_SESSION_COOKIE,
      yeniToken,
      sessionCookieOptions
    );

    return response;
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
