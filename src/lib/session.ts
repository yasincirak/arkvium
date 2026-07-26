import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  ADMIN_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  verifyAdminSessionToken,
  verifyUserSessionToken,
  type AdminSessionPayload,
  type UserSessionPayload,
} from "./auth";

/**
 * Bu dosya yalnızca sunucu tarafında (Server Component, Route Handler,
 * Server Action) kullanılır. middleware.ts edge runtime'da çalıştığı ve
 * next/headers kullanamadığı için oturum okuma yardımcıları auth.ts'ten
 * ayrı tutuluyor.
 */

export async function getUserSession(): Promise<UserSessionPayload | null> {
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
      select: { sessionVersion: true },
    });

    if (!user) {
      return null;
    }

    if (user.sessionVersion !== session.sessionVersion) {
      return null;
    }
  } catch (error) {
    console.error("Oturum geçerlilik kontrolü yapılamadı:", error);

    return null;
  }

  return session;
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token);
}

/**
 * Oturum zorunlu olan yerlerde kullanılır. Oturum yoksa işlemi durdurur.
 * Hata mesajı kasıtlı olarak sistem detayı içermez.
 */
export async function requireUserSession(): Promise<UserSessionPayload> {
  const session = await getUserSession();

  if (!session) {
    throw new Error("Bu işlem için giriş yapmanız gerekiyor.");
  }

  return session;
}

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Bu işlem için yönetici girişi gerekiyor.");
  }

  return session;
}
