import { SignJWT, jwtVerify } from "jose";

export const USER_SESSION_COOKIE = "arkvium_user_session";
export const ADMIN_SESSION_COOKIE = "arkvium_admin_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Oturum imzalama anahtarını okur.
 *
 * Sabit bir yedek değer bilerek kullanılmıyor: yedek değer kaynak kodda
 * göründüğü için üretimde herkesin geçerli oturum tokenı üretmesine izin verir.
 * Anahtar eksikse uygulama sessizce güvensiz çalışmak yerine hata vermelidir.
 */
function getSecret(name: "ADMIN_SESSION_SECRET" | "USER_SESSION_SECRET") {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} tanımlı değil veya 32 karakterden kısa. .env dosyasını kontrol edin.`
    );
  }

  return new TextEncoder().encode(value);
}

export type AdminSessionPayload = {
  email: string;
};

export type UserSessionPayload = {
  userId: string;
  email: string;
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

export async function createAdminSessionToken(
  payload: AdminSessionPayload
): Promise<string> {
  return new SignJWT({ ...payload, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret("ADMIN_SESSION_SECRET"));
}

export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      getSecret("ADMIN_SESSION_SECRET")
    );

    // type claim'i kullanıcı tokenının admin olarak kabul edilmesini engeller.
    if (payload.type !== "admin" || typeof payload.email !== "string") {
      return null;
    }

    return {
      email: payload.email,
    };
  } catch {
    return null;
  }
}

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

    if (
      payload.type !== "user" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
