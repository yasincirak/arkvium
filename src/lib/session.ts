import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole } from "@/generated/prisma/enums";
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
export async function requireUserSession(): Promise<AktifOturum> {
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

/**
 * Yönetici erişimi.
 *
 * İKİ KAYNAK kabul edilir:
 *  - "rol": müşteri oturumuyla giriş yapmış ve VERİTABANINDAKİ rolü ADMIN
 *    olan kullanıcı. Rol her istekte yeniden okunur.
 *  - "eski-admin-cerezi": ayrı /admin/login akışıyla alınan yönetici çerezi.
 *    Geçiş dönemi için yedek yöntem olarak korunuyor.
 *
 * E-posta adresi karşılaştırarak yetki VERİLMEZ; rol kaynağında karar
 * tamamen User.role alanına aittir.
 */
export type YoneticiErisimi = {
  kaynak: "rol" | "eski-admin-cerezi";
  email: string;
  /** Rol tabanlı erişimde kullanıcı kimliği; eski çerezde null. */
  userId: string | null;
};

export async function yoneticiErisimi(): Promise<YoneticiErisimi | null> {
  const oturum = await getUserSession();

  if (oturum && oturum.role === "ADMIN") {
    return { kaynak: "rol", email: oturum.email, userId: oturum.userId };
  }

  const eski = await getAdminSession();

  if (eski) {
    return { kaynak: "eski-admin-cerezi", email: eski.email, userId: null };
  }

  return null;
}

export async function requireYoneticiErisimi(): Promise<YoneticiErisimi> {
  const erisim = await yoneticiErisimi();

  if (!erisim) {
    throw new Error("Bu işlem için yönetici girişi gerekiyor.");
  }

  return erisim;
}
