import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "development-secret"
);

export type AdminSessionPayload = {
  email: string;
};

export async function createAdminSessionToken(
  payload: AdminSessionPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAdminSessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

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