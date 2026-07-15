import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("arkvium_admin_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const session = await verifyAdminSessionToken(token);

  if (!session) {
    const response = NextResponse.redirect(
      new URL("/admin/login", request.url)
    );

    response.cookies.delete("arkvium_admin_session");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};