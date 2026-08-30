import { NextRequest, NextResponse } from "next/server";
import {
  ESKI_ADMIN_COOKIE,
  USER_SESSION_COOKIE,
  verifyUserSessionToken,
} from "@/lib/auth";
import { girisAdresi } from "@/lib/guvenli-yonlendirme";

/**
 * Bu dosya src/ altında olmak zorundadır.
 * Proje src/ dizini kullandığı için Next.js middleware'i yalnızca
 * src/middleware.ts yolunda arar; proje kökündeki middleware.ts
 * sessizce yok sayılır ve korumalı sayfalar herkese açık kalır.
 *
 * ────────────────────────────────────────────────────────────
 * TEK YETKİ KAYNAĞI
 *
 * Ayrı yönetici çerezi ve ayrı yönetici şifresi kaldırıldı. Hem /account
 * hem /admin aynı kullanıcı oturumunu kullanır.
 *
 * Middleware edge runtime'da çalışır ve VERİTABANINA ERİŞEMEZ. Bu yüzden
 * burada yalnızca "geçerli imzalı bir oturum var mı" sorusu yanıtlanır.
 * "Bu kullanıcı ADMIN mi" sorusunun cevabı her istekte veritabanına bakan
 * src/app/admin/layout.tsx ve admin API uçlarında verilir.
 * ────────────────────────────────────────────────────────────
 */

/** Eski yönetici çerezi artık yetki vermez; tarayıcıdan temizlenir. */
function eskiCereziTemizle(response: NextResponse): NextResponse {
  response.cookies.delete(ESKI_ADMIN_COOKIE);

  return response;
}

async function oturumGecerliMi(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;

  if (!token) {
    return false;
  }

  return Boolean(await verifyUserSessionToken(token));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const yonetimAlani = pathname.startsWith("/admin");
  const hesapAlani = pathname.startsWith("/account");

  if (!yonetimAlani && !hesapAlani) {
    return NextResponse.next();
  }

  const oturumVar = await oturumGecerliMi(request);

  if (oturumVar) {
    return eskiCereziTemizle(NextResponse.next());
  }

  /*
    Oturum yok. Kullanıcı girişten sonra istediği sayfaya dönebilsin diye
    yol `next` parametresine konur. Değer `girisAdresi` tarafından
    doğrulanır ve kodlanır; açık yönlendirme açığına kapalıdır.

    /admin/login artık bir giriş sayfası değil, yalnızca yönlendirme
    noktası. Oraya düşen ziyaretçi /admin'e dönmek ister.
  */
  const donusYolu =
    pathname === "/admin/login" ? "/admin" : `${pathname}${search}`;

  const hedef = hesapAlani ? "/login" : girisAdresi(donusYolu);

  const response = NextResponse.redirect(new URL(hedef, request.url));

  response.cookies.delete(USER_SESSION_COOKIE);

  return eskiCereziTemizle(response);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
