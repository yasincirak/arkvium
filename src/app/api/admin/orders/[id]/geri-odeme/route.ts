import { NextResponse } from "next/server";
import { yoneticiErisimi } from "@/lib/session";
import {
  GeriOdemeHatasi,
  iadeKaydiOlustur,
  iadeyiSaglayiciyaGonder,
  otomatikIadeAcikMi,
  siparisIadeleri,
} from "@/lib/geri-odeme";

/**
 * Siparişe iade kaydı açar; özellik bayrağı açıksa sağlayıcıya gönderir.
 *
 * Güvenlik kuralları:
 * - Uç kendi yetkisini `yoneticiErisimi()` ile doğrular.
 * - TUTAR İSTEMCİDEN GÜVENİLİR KABUL EDİLMEZ: istenen tutar yalnızca
 *   bir ÜST SINIR önerisi olarak geçirilir; gerçek tutar sunucuda
 *   ödeme kaydından hesaplanır ve tahsil edileni aşamaz.
 * - OTOMATİK İADE VARSAYILAN KAPALI: bayrak açık değilse sağlayıcıya
 *   HİÇ istek gitmez. Kayıt `requested` kalır ve yanıt, yöneticiye
 *   iyzico panelinden elle işlem yapması gerektiğini bildirir.
 * - Sipariş durumu ve QR stoğu bu uçtan DEĞİŞMEZ.
 */

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await yoneticiErisimi();

  if (!admin) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici girişi gerekiyor." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    iadeler: await siparisIadeleri(params.id),
    otomatikAcik: otomatikIadeAcikMi(),
  });
}

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

    const kayit = await iadeKaydiOlustur({
      orderId: params.id,
      istenenKurus: body?.istenenKurus,
      adminEmail: admin.email,
    });

    /*
      Bayrak kapalıysa sağlayıcıya çıkılmaz; kayıt açık kalır ve
      yöneticiye elle işlem gerektiği bildirilir. Bu, isteğin
      başarısız olduğu anlamına GELMEZ.
    */
    if (!otomatikIadeAcikMi()) {
      return NextResponse.json({
        success: true,
        iade: kayit,
        manuelIslemGerekli: true,
        bilgi:
          "İade kaydı açıldı. Otomatik iade kapalı olduğu için işlemi iyzico panelinden elle yapıp işlem kimliğini kaydedin.",
      });
    }

    const sonuc = await iadeyiSaglayiciyaGonder({
      refundId: kayit.id,
      adminEmail: admin.email,
    });

    return NextResponse.json({
      success: true,
      iade: sonuc,
      manuelIslemGerekli: false,
    });
  } catch (hata) {
    if (hata instanceof GeriOdemeHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Geri ödeme ucu hatası:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
