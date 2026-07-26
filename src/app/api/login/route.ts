import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  USER_SESSION_COOKIE,
  createUserSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre zorunludur." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

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