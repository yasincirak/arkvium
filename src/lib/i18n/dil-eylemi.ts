"use server";

import { cookies } from "next/headers";
import { DIL_COOKIE, DIL_COOKIE_OMRU, dilMi } from "./diller";

/**
 * Dil tercihini çerezde saklar.
 *
 * GÜVENLİK: Bu çerez yalnızca görüntüleme dilini taşır; yetki veya kimlik
 * bilgisi İÇERMEZ. Oturum çerezlerinin ayarlarına DOKUNULMAZ.
 *
 * `httpOnly` bilinçli olarak KAPALIDIR: dil seçicinin istemci tarafında da
 * geçerli değeri okuyabilmesi gerekir ve saklanan değer gizli değildir.
 * Değer yine de doğrulanır — yalnızca desteklenen diller yazılır.
 */
export async function dilSec(deger: string): Promise<void> {
  if (!dilMi(deger)) {
    return;
  }

  cookies().set(DIL_COOKIE, deger, {
    path: "/",
    maxAge: DIL_COOKIE_OMRU,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}
