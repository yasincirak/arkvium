import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import { siparisiIptalEt, SiparisIptalHatasi } from "@/lib/siparis-iptal";

/**
 * Siparişi iptal eder (yönetici).
 *
 * Güvenlik kuralları:
 * - Uç kendi yetkisini `yoneticiErisimi()` ile doğrular; sayfa
 *   katmanındaki korumaya güvenilmez. Oturumsuz veya CUSTOMER rolündeki
 *   istek 401 alır ve hiçbir kayıt değişmez.
 * - İptal edilebilirlik kararı sunucuda verilir (bkz.
 *   siparis-iptal-kurallari.ts); istemciden gelen durum bilgisi
 *   kullanılmaz.
 * - PARA İADESİ YAPILMAZ. İptal yalnızca siparişi `cancelled` yapar ve
 *   gerekiyorsa QR stoğunu döndürür; ödenmiş siparişte para iadesi ayrı
 *   ve denetlenebilir bir süreçtir. Yanıt, iade gerekip gerekmediğini
 *   bildirir.
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await yoneticiErisimi();

  if (!admin) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici girişi gerekiyor." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    // Not yalnızca denetim izine yazılır; kişisel veri beklenmez.
    const not = String(body?.not || "").trim().slice(0, 200);

    const sonuc = await siparisiIptalEt({
      orderId: params.id,
      adminEmail: admin.email,
      not: not || null,
    });

    return NextResponse.json({
      success: true,
      serbestBirakilanEtiket: sonuc.serbestBirakilanEtiket,
      paraIadesiGerekir: sonuc.paraIadesiGerekir,
    });
  } catch (hata) {
    if (hata instanceof SiparisIptalHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Sipariş iptal ucu hatası:", (hata as Error)?.name);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
