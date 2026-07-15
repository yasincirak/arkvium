import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      return NextResponse.json(
        { error: "Admin giriş ayarları eksik." },
        { status: 500 }
      );
    }

    if (email !== adminEmail) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      adminPasswordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken({
      email,
    });

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set("arkvium_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Giriş sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}