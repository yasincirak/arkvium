import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import { GeriOdemeHatasi, manuelIadeyiKaydet } from "@/lib/geri-odeme";

/**
 * İyzico panelinden elle yapılan iadeyi kaydeder (yönetici).
 *
 * DIŞ ÇAĞRI YAPILMAZ: yalnızca yöneticinin girdiği işlem kimliği
 * saklanır ve iade kaydı kapatılır. Otomatik iade kapalıyken izlenen
 * yol budur.
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

    const kayit = await manuelIadeyiKaydet({
      refundId: params.id,
      islemKimligi: body?.islemKimligi,
      adminEmail: admin.email,
    });

    return NextResponse.json({ success: true, iade: kayit });
  } catch (hata) {
    if (hata instanceof GeriOdemeHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Manuel iade ucu hatası:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
