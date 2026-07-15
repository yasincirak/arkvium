import { SignJWT, jwtVerify } from "jose";

const adminSecret = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "development-admin-secret"
);

const userSecret = new TextEncoder().encode(
  process.env.USER_SESSION_SECRET || "development-user-secret"
);

export type AdminSessionPayload = {
  email: string;
};

export type UserSessionPayload = {
  userId: string;
  email: string;
};

export async function createAdminSessionToken(
  payload: AdminSessionPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(adminSecret);
}

export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, adminSecret);

    if (typeof payload.email !== "string") {
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
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(userSecret);
}

export async function verifyUserSessionToken(
  token: string
): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, userSecret);

    if (
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