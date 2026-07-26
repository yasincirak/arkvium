import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import { tokenDurumu, tokenOzetle } from "@/lib/tokens";

export async function POST(request: Request) {
  try {
    const ipSiniri = await hizSiniriKontrol({
      kapsam: "eposta-dogrulama-ip",
      tanimlayici: istemciIpAdresi(request.headers),
      limit: 20,
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

    if (!token) {
      return NextResponse.json(
        { error: "Geçersiz doğrulama bağlantısı." },
        { status: 400 }
      );
    }

    const kayit = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: tokenOzetle(token) },
    });

    if (!kayit) {
      return NextResponse.json(
        { error: "Bağlantı geçersiz. Hesabınızdan yeni bir doğrulama e-postası isteyebilirsiniz." },
        { status: 400 }
      );
    }

    const durum = tokenDurumu(kayit);

    if (!durum.gecerli) {
      return NextResponse.json(
        {
          error:
            durum.sebep === "suresi-dolmus"
              ? "Bu bağlantının süresi dolmuş. Hesabınızdan yeni bir doğrulama e-postası isteyebilirsiniz."
              : "Bu bağlantı daha önce kullanılmış. E-posta adresiniz zaten doğrulanmış olabilir.",
        },
        { status: 400 }
      );
    }

    const simdi = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: kayit.userId },
        data: { emailVerifiedAt: simdi },
      }),
      prisma.emailVerificationToken.update({
        where: { id: kayit.id },
        data: { usedAt: simdi },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "E-posta adresiniz doğrulandı.",
    });
  } catch (error) {
    console.error("E-posta doğrulama hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
