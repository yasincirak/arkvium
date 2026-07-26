import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Tek kullanımlık, süreli token üretimi ve doğrulaması.
 *
 * Token düz metin olarak veritabanına YAZILMAZ. Yalnızca SHA-256 özeti
 * saklanır; token'ın kendisi sadece kullanıcıya gönderilen bağlantıda bulunur.
 * Böylece veritabanı sızsa bile geçerli bir sıfırlama bağlantısı üretilemez.
 */

/** 32 bayt = 256 bit entropi. Tahmin edilmesi pratikte imkânsızdır. */
const TOKEN_BAYT = 32;

export type UretilenToken = {
  /** Kullanıcıya gönderilen değer. Veritabanına yazılmaz. */
  token: string;
  /** Veritabanına yazılan değer. */
  tokenHash: string;
};

export function tokenUret(): UretilenToken {
  const token = randomBytes(TOKEN_BAYT).toString("base64url");

  return { token, tokenHash: tokenOzetle(token) };
}

export function tokenOzetle(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * İki özeti sabit sürede karşılaştırır.
 * Veritabanı sorgusu için özet doğrudan kullanılır; bu yardımcı, özetlerin
 * kod içinde karşılaştırıldığı yerler için vardır.
 */
export function ozetlerEsit(a: string, b: string): boolean {
  const tamponA = Buffer.from(a, "utf8");
  const tamponB = Buffer.from(b, "utf8");

  if (tamponA.length !== tamponB.length) {
    return false;
  }

  return timingSafeEqual(tamponA, tamponB);
}

export function sonKullanmaTarihi(dakika: number): Date {
  return new Date(Date.now() + dakika * 60 * 1000);
}

export type TokenDurumu =
  | { gecerli: true }
  | { gecerli: false; sebep: "kullanilmis" | "suresi-dolmus" };

export function tokenDurumu(kayit: {
  usedAt: Date | null;
  expiresAt: Date;
}): TokenDurumu {
  if (kayit.usedAt) {
    return { gecerli: false, sebep: "kullanilmis" };
  }

  if (kayit.expiresAt.getTime() <= Date.now()) {
    return { gecerli: false, sebep: "suresi-dolmus" };
  }

  return { gecerli: true };
}

/** Token süreleri (dakika). */
export const TOKEN_SURESI = {
  sifreSifirlama: 60,
  epostaDogrulama: 60 * 24,
} as const;
