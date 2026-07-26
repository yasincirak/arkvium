import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_SESSION_COOKIE } from "@/lib/auth";
import { getUserSession } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";

/**
 * Kullanıcının tüm cihazlardaki oturumlarını kapatır.
 *
 * Oturum sürümü artırılır; mevcut tüm tokenlar imzaları geçerli olsa bile
 * reddedilir. Bu cihazdaki çerez de silinir, kullanıcı yeniden giriş yapar.
 */
export async function POST() {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const siniri = await hizSiniriKontrol({
      kapsam: "tum-oturumlari-kapat",
      tanimlayici: session.userId,
      limit: 10,
      pencereSaniye: 60 * 60,
    });

    if (!siniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla istek gönderildi. Lütfen ${Math.ceil(
            siniri.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(siniri.bekleSaniye) },
        }
      );
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { sessionVersion: { increment: 1 } },
    });

    const response = NextResponse.json({
      success: true,
      message:
        "Tüm cihazlardaki oturumlar kapatıldı. Lütfen tekrar giriş yapın.",
    });

    response.cookies.delete(USER_SESSION_COOKIE);

    return response;
  } catch (error) {
    console.error("Oturum kapatma hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
