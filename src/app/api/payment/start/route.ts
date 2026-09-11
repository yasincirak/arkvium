import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import { odemeBaslat } from "@/lib/odeme-servisi";
import { OdemeHatasi } from "@/lib/odeme-saglayici";
import { prisma } from "@/lib/prisma";
import { odemeBaslatmaOlayi } from "@/lib/analitik";
import {
  ZIYARETCI_COOKIE,
  ziyaretciKimligiGecerliMi,
} from "@/lib/analitik-ziyaretci";

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
 * - ANALİTİK: ödeme oturumu sağlayıcıda gerçekten açıldıktan SONRA
 *   "ödemeye başlandı" olayı yazılır. Olay kaydı yalnızca sipariş
 *   kimliği, ürün kodu, tutar ve anonim ziyaretçi kimliği içerir;
 *   IP, kimlik numarası ve teslimat bilgisi analitiğe GİRMEZ.
 */

/**
 * "Ödemeye başlandı" analitik olayını yazar.
 *
 * HATA FIRLATMAZ: analitik yazımı ödeme akışını hiçbir koşulda bozmaz.
 * Ziyaretçi çerezi yoksa olay ziyaretçisiz kaydedilir.
 */
async function odemeBaslatmaOlayiniYaz(orderId: string): Promise<void> {
  try {
    const cerez = cookies().get(ZIYARETCI_COOKIE)?.value;

    const visitorId = ziyaretciKimligiGecerliMi(cerez) ? cerez : null;

    const siparis = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        totalKurus: true,
        items: { select: { productKod: true }, take: 2 },
      },
    });

    if (!siparis) {
      return;
    }

    await odemeBaslatmaOlayi({
      visitorId,
      orderId,
      // Birden çok farklı ürün varsa tek bir ürüne yazılmaz.
      productKod:
        siparis.items.length === 1 ? siparis.items[0].productKod : null,
      valueKurus: siparis.totalKurus,
    });
  } catch (hata) {
    console.error("Ödeme başlatma olayı yazılamadı:", (hata as Error)?.name);
  }
}

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

    await odemeBaslatmaOlayiniYaz(orderId);

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
