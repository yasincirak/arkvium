import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  verifyAdminSessionToken,
  verifyUserSessionToken,
} from "@/lib/auth";

/**
 * Bu dosya src/ altında olmak zorundadır.
 * Proje src/ dizini kullandığı için Next.js middleware'i yalnızca
 * src/middleware.ts yolunda arar; proje kökündeki middleware.ts
 * sessizce yok sayılır ve korumalı sayfalar herkese açık kalır.
 */

function girisSayfasinaYonlendir(
  request: NextRequest,
  girisYolu: string,
  silinecekCerez: string
) {
  const url = new URL(girisYolu, request.url);
  const response = NextResponse.redirect(url);

  response.cookies.delete(silinecekCerez);

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (!token || !(await verifyAdminSessionToken(token))) {
      return girisSayfasinaYonlendir(
        request,
        "/admin/login",
        ADMIN_SESSION_COOKIE
      );
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    const token = request.cookies.get(USER_SESSION_COOKIE)?.value;

    if (!token || !(await verifyUserSessionToken(token))) {
      return girisSayfasinaYonlendir(request, "/login", USER_SESSION_COOKIE);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
