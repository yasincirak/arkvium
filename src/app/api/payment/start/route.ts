import { NextResponse } from "next/server";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import { odemeBaslat } from "@/lib/odeme-servisi";
import { OdemeHatasi } from "@/lib/odeme-saglayici";

/**
 * Ödeme başlatma.
 *
 * Güvenlik kuralları:
 * - İstemciden yalnızca sipariş kimliği ve sağlayıcının zorunlu tuttuğu
 *   kimlik numarası alınır. Tutar, sepet ve fiyat bilgisi kabul EDİLMEZ;
 *   ödenecek tutar veritabanındaki siparişten okunur.
 * - Kimlik numarası SAKLANMAZ: doğrudan sağlayıcıya geçirilir, hiçbir
 *   tabloya yazılmaz ve loglanmaz.
 * - Kart bilgisi bu uca hiç gelmez (Checkout Form iyzico tarafında toplar).
 * - Sağlayıcı anahtarları ve callback adresi yanıtta yer almaz.
 * - Herkese açık olduğu için IP başına sınırlanır.
 */

export async function POST(request: Request) {
  try {
    const ip = istemciIpAdresi(request.headers);

    const ipSiniri = await hizSiniriKontrol({
      kapsam: "odeme-baslatma-ip",
      tanimlayici: ip,
      limit: 20,
      pencereSaniye: 60 * 60,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla deneme yapıldı. Lütfen ${Math.ceil(
            ipSiniri.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipSiniri.bekleSaniye) },
        }
      );
    }

    const body = await request.json();
    const orderId = String(body?.orderId || "").trim();

    // Kimlik numarası sağlayıcının ZORUNLU tuttuğu alandır (buyer.identityNumber).
    // Yalnızca iyzico'ya iletilir; veritabanına YAZILMAZ ve loglanmaz.
    const kimlikNo = String(body?.kimlikNo || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş bilgisi eksik." },
        { status: 400 }
      );
    }

    const sonuc = await odemeBaslat({
      orderId,
      istemciIp: ip,
      kimlikNo: kimlikNo || undefined,
    });

    return NextResponse.json({
      success: true,
      checkoutFormContent: sonuc.checkoutFormContent,
      paymentPageUrl: sonuc.paymentPageUrl,
    });
  } catch (hata) {
    if (hata instanceof OdemeHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Ödeme başlatma ucu hatası:", (hata as Error)?.name);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
