import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import { pushGenelAnahtari } from "@/lib/web-push-gonderim";

/**
 * VAPID GENEL anahtarını verir.
 *
 * GİZLİ ANAHTAR BU UÇTAN (VE HİÇBİR UÇTAN) DÖNMEZ. Genel anahtar
 * `NEXT_PUBLIC_` öneki ile yayınlanmaz; yalnızca yönetici oturumu olan
 * istemciye verilir ve istemci derlemesine gömülmez.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await yoneticiErisimi();

  if (!admin) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici girişi gerekiyor." },
      { status: 401 }
    );
  }

  const anahtar = pushGenelAnahtari();

  if (!anahtar) {
    return NextResponse.json(
      { error: "Web push sunucuda yapılandırılmamış." },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey: anahtar });
}
