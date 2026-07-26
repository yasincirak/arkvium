import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  USER_SESSION_COOKIE,
  createUserSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import {
  hizSiniriKontrol,
  hizSiniriSifirla,
  istemciIpAdresi,
} from "@/lib/rate-limit";

/**
 * Kullanıcı bulunamadığında da bcrypt karşılaştırması yapılır.
 * Aksi hâlde "kullanıcı yok" yanıtı belirgin biçimde daha hızlı döner ve
 * saldırgan hangi e-postaların kayıtlı olduğunu süreden anlayabilir.
 * Bu sabit gizli bir değer değildir.
 */
const ZAMAN_ESITLEME_HASHI =
  "$2b$12$1ipEdfIDZWdT1Fzchqv3SuXgZuYH/cssB0QqSrz2w.ihqJwBNcgnG";

const IP_LIMIT = 10;
const EPOSTA_LIMIT = 5;
const PENCERE_SANIYE = 15 * 60;

function cokFazlaDeneme(bekleSaniye: number) {
  return NextResponse.json(
    {
      error: `Çok fazla giriş denemesi yapıldı. Lütfen ${Math.ceil(
        bekleSaniye / 60
      )} dakika sonra tekrar deneyin.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(bekleSaniye) },
    }
  );
}

export async function POST(request: Request) {
  try {
    const ip = istemciIpAdresi(request.headers);

    const ipSiniri = await hizSiniriKontrol({
      kapsam: "giris-ip",
      tanimlayici: ip,
      limit: IP_LIMIT,
      pencereSaniye: PENCERE_SANIYE,
    });

    if (!ipSiniri.izinli) {
      return cokFazlaDeneme(ipSiniri.bekleSaniye);
    }

    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    const epostaSiniri = await hizSiniriKontrol({
      kapsam: "giris-eposta",
      tanimlayici: email,
      limit: EPOSTA_LIMIT,
      pencereSaniye: PENCERE_SANIYE,
    });

    if (!epostaSiniri.izinli) {
      return cokFazlaDeneme(epostaSiniri.bekleSaniye);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const passwordIsValid = await bcrypt.compare(
      password,
      user?.passwordHash ?? ZAMAN_ESITLEME_HASHI
    );

    // Kullanıcı yok ve şifre yanlış durumları aynı yanıtı döner;
    // hangi e-postaların kayıtlı olduğu sızdırılmaz.
    if (!user || !passwordIsValid) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    // Başarılı girişten sonra hatalı deneme sayaçları temizlenir.
    await hizSiniriSifirla("giris-eposta", email);
    await hizSiniriSifirla("giris-ip", ip);

    const sessionToken = await createUserSessionToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    });

    response.cookies.set(
      USER_SESSION_COOKIE,
      sessionToken,
      sessionCookieOptions
    );

    return response;
  } catch (error) {
    console.error("Kullanıcı giriş hatası:", error);

    return NextResponse.json(
      { error: "Giriş yapılamadı." },
      { status: 500 }
    );
  }
}
