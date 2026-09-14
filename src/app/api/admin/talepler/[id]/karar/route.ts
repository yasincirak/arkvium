import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import { SiparisTalebiHatasi, talebiSonuclandir } from "@/lib/siparis-talebi";

/**
 * Talebi onaylar veya reddeder (yönetici).
 *
 * KARAR SİPARİŞİ DEĞİŞTİRMEZ: onaylamak siparişi kendiliğinden iptal
 * etmez ve para iadesi yapmaz. Yönetici, onaydan sonra iptal ve geri
 * ödeme işlemlerini ayrı uçlardan yürütür. Böylece "onaylandı" ile
 * "tamamlandı" birbirine karışmaz.
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
    const karar = body?.karar;

    if (karar !== "approved" && karar !== "rejected") {
      return NextResponse.json({ error: "Geçersiz karar." }, { status: 400 });
    }

    const sonuc = await talebiSonuclandir({
      talepId: params.id,
      karar,
      yoneticiNotu: body?.yoneticiNotu,
      adminEmail: admin.email,
    });

    return NextResponse.json({ success: true, ...sonuc });
  } catch (hata) {
    if (hata instanceof SiparisTalebiHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Talep kararı ucu hatası:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
