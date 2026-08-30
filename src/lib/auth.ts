import { SignJWT, jwtVerify } from "jose";

export const USER_SESSION_COOKIE = "arkvium_user_session";

/**
 * KALDIRILMIŞ ayrı yönetici çerezi.
 *
 * Yetkilendirmenin tek kaynağı artık kullanıcı hesabı ve `User.role`.
 * Bu ad yalnızca eski tarayıcılarda kalmış çerezi TEMİZLEMEK için duruyor;
 * hiçbir yerde doğrulanmaz ve hiçbir yetki vermez.
 */
export const ESKI_ADMIN_COOKIE = "arkvium_admin_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Oturum imzalama anahtarını okur.
 *
 * Sabit bir yedek değer bilerek kullanılmıyor: yedek değer kaynak kodda
 * göründüğü için üretimde herkesin geçerli oturum tokenı üretmesine izin verir.
 * Anahtar eksikse uygulama sessizce güvensiz çalışmak yerine hata vermelidir.
 */
function getSecret(name: "USER_SESSION_SECRET") {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} tanımlı değil veya 32 karakterden kısa. .env dosyasını kontrol edin.`
    );
  }

  return new TextEncoder().encode(value);
}

export type UserSessionPayload = {
  userId: string;
  email: string;
  /**
   * Token üretildiği andaki oturum sürümü.
   * Doğrulamada veritabanındaki güncel değerle tam eşitlik aranır.
   */
  sessionVersion: number;
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export async function createUserSessionToken(
  payload: UserSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload, type: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret("USER_SESSION_SECRET"));
}

export async function verifyUserSessionToken(
  token: string
): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecret("USER_SESSION_SECRET")
    );

    // sessionVersion zorunludur: bu alanı taşımayan eski tokenlar
    // (sürüm mekanizması eklenmeden önce üretilenler) kabul edilmez.
    if (
      payload.type !== "user" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.sessionVersion !== "number" ||
      !Number.isInteger(payload.sessionVersion)
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      sessionVersion: payload.sessionVersion,
    };
  } catch {
    return null;
  }
}
