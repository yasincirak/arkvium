import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole } from "@/generated/prisma/enums";
import {
  USER_SESSION_COOKIE,
  verifyUserSessionToken,
  type UserSessionPayload,
} from "./auth";

/**
 * Bu dosya yalnızca sunucu tarafında (Server Component, Route Handler,
 * Server Action) kullanılır. middleware.ts edge runtime'da çalıştığı ve
 * next/headers kullanamadığı için oturum okuma yardımcıları auth.ts'ten
 * ayrı tutuluyor.
 */

/**
 * Oturum + rol. Rol HER İSTEKTE veritabanından okunur, oturum tokenından
 * değil. Böylece bir kullanıcının rolü değiştirildiğinde eski token
 * yüzünden yetki gecikmesi oluşmaz ve tarayıcıdan rol taklit edilemez.
 */
export type AktifOturum = UserSessionPayload & {
  role: UserRole;
};

export async function getUserSession(): Promise<AktifOturum | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await verifyUserSessionToken(token);

  if (!session) {
    return null;
  }

  // Şifre değiştiğinde User.sessionVersion artırılır; tokendaki sürüm
  // veritabanındaki güncel sürümle birebir eşleşmiyorsa oturum reddedilir.
  // İmza kontrolü middleware'de (edge) yapılır; bu ek kontrol veritabanına
  // erişebilen sunucu tarafında yapılır.
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionVersion: true, role: true },
    });

    if (!user) {
      return null;
    }

    if (user.sessionVersion !== session.sessionVersion) {
      return null;
    }

    return { ...session, role: user.role };
  } catch (error) {
    console.error("Oturum geçerlilik kontrolü yapılamadı:", error);

    return null;
  }
}

/**
 * Oturum zorunlu olan yerlerde kullanılır. Oturum yoksa işlemi durdurur.
 * Hata mesajı kasıtlı olarak sistem detayı içermez.
 */
export async function requireUserSession(): Promise<AktifOturum> {
  const session = await getUserSession();

  if (!session) {
    throw new Error("Bu işlem için giriş yapmanız gerekiyor.");
  }

  return session;
}


/**
 * Yönetici erişimi — TEK KAYNAK.
 *
 * Yetki yalnızca kullanıcı oturumundan ve VERİTABANINDAKİ `User.role`
 * alanından gelir. Ayrı yönetici çerezi, ayrı yönetici şifresi ve
 * e-posta karşılaştırması YOKTUR.
 *
 * Rol her çağrıda veritabanından okunur (bkz. getUserSession): oturum
 * tokenına yazılsaydı, yetki geri alındığında token süresi dolana kadar
 * eski yetki sürerdi.
 */
export type YoneticiErisimi = {
  userId: string;
  email: string;
};

export async function yoneticiErisimi(): Promise<YoneticiErisimi | null> {
  const oturum = await getUserSession();

  if (!oturum || oturum.role !== "ADMIN") {
    return null;
  }

  return { userId: oturum.userId, email: oturum.email };
}

export async function requireYoneticiErisimi(): Promise<YoneticiErisimi> {
  const erisim = await yoneticiErisimi();

  if (!erisim) {
    throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  }

  return erisim;
}
