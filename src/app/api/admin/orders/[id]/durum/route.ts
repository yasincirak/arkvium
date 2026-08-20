import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  siparisDurumunuGuncelle,
  SiparisYonetimHatasi,
} from "@/lib/siparis-yonetim";

/**
 * Sipariş hazırlık/kargo durumunu günceller (yönetici).
 *
 * Güvenlik kuralları:
 * - Sayfa katmanı `src/middleware.ts` ile korunsa da bu uç yetkisini KENDİ
 *   içinde `getAdminSession()` ile ayrıca doğrular; oturumsuz istek 401 alır
 *   ve hiçbir kayıt değişmez.
 * - Yalnızca `paid → preparing` ve `preparing → shipped` geçişleri kabul
 *   edilir; geçiş koşullu güncellemeyle yapılır.
 * - Ödeme kayıtları ve QR rezervasyonu bu uçtan değiştirilemez.
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { error: "Bu işlem için yönetici girişi gerekiyor." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const sonuc = await siparisDurumunuGuncelle({
      orderId: params.id,
      hedefDurum: String(body?.durum || ""),
      adminEmail: admin.email,
    });

    return NextResponse.json({ success: true, durum: sonuc.durum });
  } catch (hata) {
    if (hata instanceof SiparisYonetimHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Sipariş durumu güncelleme hatası:", (hata as Error)?.name);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
