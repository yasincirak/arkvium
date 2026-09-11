import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import { satisBildirimiAcikMi, satisBildirimiAyarla } from "@/lib/bildirim";
import { pushEtkinMi } from "@/lib/web-push-gonderim";

/**
 * "Satış bildirimlerini aç/kapat" ayarı.
 *
 * Ayar YÖNETİCİ BAŞINADIR: bir yöneticinin kapatması diğerlerini
 * etkilemez. Kapatıldığında o yöneticinin cihazlarına web push
 * gönderilmez (bkz. web-push-gonderim.ts sorgusu).
 *
 * Uç kendi yetkisini doğrular; sayfa korumasına güvenilmez.
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

  try {
    return NextResponse.json({
      acik: await satisBildirimiAcikMi(admin.userId),
      pushYapilandirildi: pushEtkinMi(),
    });
  } catch (hata) {
    console.error("Bildirim ayarı okunamadı:", (hata as Error)?.name);

    return NextResponse.json({ error: "Ayar getirilemedi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await yoneticiErisimi();

  if (!admin) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici girişi gerekiyor." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    if (typeof body?.acik !== "boolean") {
      return NextResponse.json(
        { error: "Geçersiz ayar değeri." },
        { status: 400 }
      );
    }

    await satisBildirimiAyarla(admin.userId, body.acik);

    return NextResponse.json({ success: true, acik: body.acik });
  } catch (hata) {
    console.error("Bildirim ayarı yazılamadı:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
