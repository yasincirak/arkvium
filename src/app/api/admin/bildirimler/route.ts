import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import {
  bildirimiOkunduIsaretle,
  bildirimleriGetir,
  tumBildirimleriOkunduIsaretle,
} from "@/lib/bildirim";

/**
 * Yönetici bildirimleri (liste ve okundu işaretleme).
 *
 * Güvenlik: uç kendi yetkisini `yoneticiErisimi()` ile doğrular; sayfa
 * katmanındaki korumaya güvenilmez. Oturumsuz veya CUSTOMER rolündeki
 * istek 401 alır ve hiçbir veri dönmez.
 *
 * Yanıtta KİŞİSEL VERİ YOKTUR: yalnızca sipariş numarası, tutar ve
 * sipariş kimliği taşınır.
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
    const liste = await bildirimleriGetir();

    return NextResponse.json(liste);
  } catch (hata) {
    console.error("Bildirimler okunamadı:", (hata as Error)?.name);

    return NextResponse.json(
      { error: "Bildirimler getirilemedi." },
      { status: 500 }
    );
  }
}

/** Tek bildirimi veya tümünü okundu işaretler. */
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

    if (body?.hepsi === true) {
      const sayi = await tumBildirimleriOkunduIsaretle();

      return NextResponse.json({ success: true, isaretlenen: sayi });
    }

    const id = String(body?.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "Bildirim seçilmedi." }, { status: 400 });
    }

    await bildirimiOkunduIsaretle(id);

    return NextResponse.json({ success: true });
  } catch (hata) {
    console.error("Bildirim güncellenemedi:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
