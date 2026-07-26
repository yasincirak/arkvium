import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";
import { dogrulamaEpostasiGonder } from "@/lib/email-verification";

/** Doğrulama e-postasını yeniden gönderir. Giriş yapmış kullanıcı gerektirir. */
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
      kapsam: "dogrulama-tekrar-gonder",
      tanimlayici: session.userId,
      limit: 3,
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

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({
        success: true,
        message: "E-posta adresiniz zaten doğrulanmış.",
      });
    }

    const sonuc = await dogrulamaEpostasiGonder(user);

    if (!sonuc.gonderildi) {
      return NextResponse.json(
        {
          error:
            "Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Doğrulama e-postası gönderildi. Gelen kutunuzu kontrol edin.",
    });
  } catch (error) {
    console.error("Doğrulama e-postası gönderme hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
