import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";

// Aynı IP'den toplu sahte hesap açılmasını sınırlar.
const IP_LIMIT = 5;
const PENCERE_SANIYE = 60 * 60;

export async function POST(request: Request) {
  try {
    const ipSiniri = await hizSiniriKontrol({
      kapsam: "kayit-ip",
      tanimlayici: istemciIpAdresi(request.headers),
      limit: IP_LIMIT,
      pencereSaniye: PENCERE_SANIYE,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla kayıt denemesi yapıldı. Lütfen ${Math.ceil(
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

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Ad soyad, e-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Şifre en az 8 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kayıtlı." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        fullName,
        email,
        phone: phone || null,
        passwordHash,
      },
    });

    return NextResponse.json(
      { success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Kullanıcı kayıt hatası:", error);

    return NextResponse.json(
      { error: "Kayıt oluşturulamadı." },
      { status: 500 }
    );
  }
}