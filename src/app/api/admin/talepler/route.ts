import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import { yoneticiTalepleri } from "@/lib/siparis-talebi";

/**
 * İptal/iade taleplerini listeler (yönetici).
 *
 * Uç kendi yetkisini doğrular; sayfa korumasına güvenilmez.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await yoneticiErisimi();

  if (!admin) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici girişi gerekiyor." },
      { status: 401 }
    );
  }

  try {
    const yalnizcaBekleyen =
      new URL(request.url).searchParams.get("bekleyen") === "1";

    return NextResponse.json({
      talepler: await yoneticiTalepleri(yalnizcaBekleyen),
    });
  } catch (hata) {
    console.error("Talepler okunamadı:", (hata as Error)?.name);

    return NextResponse.json({ error: "Talepler getirilemedi." }, { status: 500 });
  }
}
