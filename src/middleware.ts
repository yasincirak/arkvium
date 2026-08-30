import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  verifyAdminSessionToken,
  verifyUserSessionToken,
} from "@/lib/auth";
import { YOL_BASLIGI } from "@/lib/yol-basligi";

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
    /*
      Edge runtime veritabanına erişemez, bu yüzden burada YALNIZCA "geçerli
      imzalı bir oturum var mı" sorusu yanıtlanır. Asıl yetki kararı —
      kullanıcının rolünün gerçekten ADMIN olup olduğu — her istekte
      veritabanına bakan src/app/admin/layout.tsx içinde verilir.

      Yol bilgisi isteğe başlık olarak eklenir; layout, giriş sayfasında
      kendi kendine yönlendirme döngüsü kurmamak için bunu okur. Başlık her
      istekte burada yeniden yazıldığı için istemci taklit edemez.
    */
    const istekBasliklari = new Headers(request.headers);
    istekBasliklari.set(YOL_BASLIGI, pathname);

    const devam = () =>
      NextResponse.next({ request: { headers: istekBasliklari } });

    if (pathname === "/admin/login") {
      return devam();
    }

    const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (adminToken && (await verifyAdminSessionToken(adminToken))) {
      return devam();
    }

    // Rol tabanlı erişim: müşteri oturumu geçerliyse layout'a bırakılır.
    // Rolü ADMIN değilse layout güvenli biçimde /account'a yönlendirir.
    const userToken = request.cookies.get(USER_SESSION_COOKIE)?.value;

    if (userToken && (await verifyUserSessionToken(userToken))) {
      return devam();
    }

    return girisSayfasinaYonlendir(
      request,
      "/admin/login",
      ADMIN_SESSION_COOKIE
    );
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
