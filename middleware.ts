import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const session = await verifyAdminSessionToken(token);

  if (!session) {
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url)
    );

    response.cookies.delete(ADMIN_SESSION_COOKIE);

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};