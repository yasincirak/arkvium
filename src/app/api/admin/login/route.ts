import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import {
  hizSiniriKontrol,
  hizSiniriSifirla,
  istemciIpAdresi,
} from "@/lib/rate-limit";

/** Bkz. /api/login — yanıt süresinden bilgi sızmasını engeller. */
const ZAMAN_ESITLEME_HASHI =
  "$2b$12$1ipEdfIDZWdT1Fzchqv3SuXgZuYH/cssB0QqSrz2w.ihqJwBNcgnG";

// Yönetici girişi kullanıcı girişinden daha sıkı sınırlandırılır.
const IP_LIMIT = 5;
const PENCERE_SANIYE = 15 * 60;

export async function POST(request: Request) {
  try {
    const ip = istemciIpAdresi(request.headers);

    const ipSiniri = await hizSiniriKontrol({
      kapsam: "admin-giris-ip",
      tanimlayici: ip,
      limit: IP_LIMIT,
      pencereSaniye: PENCERE_SANIYE,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla giriş denemesi yapıldı. Lütfen ${Math.ceil(
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
    const password = String(body.password || "");

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      // Yapılandırma durumu istemciye sızdırılmaz, sunucu logunda görünür.
      console.error(
        "Yönetici girişi yapılandırılmamış: ADMIN_EMAIL veya ADMIN_PASSWORD_HASH tanımlı değil."
      );

      return NextResponse.json(
        { error: "Giriş sırasında bir hata oluştu." },
        { status: 500 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      email === adminEmail ? adminPasswordHash : ZAMAN_ESITLEME_HASHI
    );

    if (email !== adminEmail || !passwordMatches) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    await hizSiniriSifirla("admin-giris-ip", ip);

    const token = await createAdminSessionToken({
      email: adminEmail,
    });

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      token,
      sessionCookieOptions
    );

    return response;
  } catch (error) {
    console.error("Yönetici giriş hatası:", error);

    return NextResponse.json(
      { error: "Giriş sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
