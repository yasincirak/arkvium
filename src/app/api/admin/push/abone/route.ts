import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";

/**
 * Yönetici cihazının web push aboneliği.
 *
 * Güvenlik:
 * - Uç kendi yetkisini `yoneticiErisimi()` ile doğrular.
 * - Abonelik HER ZAMAN oturumdaki yöneticiye bağlanır; gövdeden gelen bir
 *   kullanıcı kimliği KABUL EDİLMEZ.
 * - `endpoint` tekildir: aynı cihaz iki kez abone olursa kayıt güncellenir,
 *   yeni satır açılmaz.
 * - Kaydedilen değerler yöneticinin kendi cihazına aittir; müşteri verisi
 *   içermez.
 */

export const dynamic = "force-dynamic";

/** Push servisi adreslerinin uzunluk sınırı (kötüye kullanım koruması). */
const EN_FAZLA_UZUNLUK = 1000;

function metniDogrula(deger: unknown, enFazla = EN_FAZLA_UZUNLUK): string {
  const metin = typeof deger === "string" ? deger.trim() : "";

  return metin.length > 0 && metin.length <= enFazla ? metin : "";
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

    const endpoint = metniDogrula(body?.endpoint);
    const p256dh = metniDogrula(body?.keys?.p256dh, 200);
    const auth = metniDogrula(body?.keys?.auth, 200);

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Abonelik bilgisi eksik." },
        { status: 400 }
      );
    }

    // Yalnızca gerçek push servisi adresleri kabul edilir.
    if (!endpoint.startsWith("https://")) {
      return NextResponse.json(
        { error: "Abonelik adresi geçersiz." },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: admin.userId,
        p256dh,
        auth,
        failureCount: 0,
      },
      create: {
        userId: admin.userId,
        endpoint,
        p256dh,
        auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (hata) {
    console.error("Push aboneliği kaydedilemedi:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}

/** Cihaz aboneliğini siler (bildirimleri o cihazda durdurur). */
export async function DELETE(request: Request) {
  const admin = await yoneticiErisimi();

  if (!admin) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici girişi gerekiyor." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const endpoint = metniDogrula(body?.endpoint);

    if (!endpoint) {
      return NextResponse.json(
        { error: "Abonelik bilgisi eksik." },
        { status: 400 }
      );
    }

    // Yalnızca KENDİ aboneliğini silebilir: `userId` koşulu olmadan bir
    // yönetici başka bir yöneticinin cihazını kapatabilirdi.
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: admin.userId },
    });

    return NextResponse.json({ success: true });
  } catch (hata) {
    console.error("Push aboneliği silinemedi:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
