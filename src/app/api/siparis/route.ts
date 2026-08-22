import { NextResponse } from "next/server";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import { rezervasyonSonGecerliligi, StokHatasi } from "@/lib/qr-rezervasyon";
import { siparisOlustur } from "@/lib/siparis-servisi";

/**
 * Müşteri sipariş oluşturma (herkese açık).
 *
 * Tek ürün, adet 1. Sepet, çoklu ürün ve kupon bu akışın kapsamında değildir.
 *
 * Güvenlik kuralları:
 * - İstemciden YALNIZCA ürün kodu ve teslimat bilgisi alınır. Fiyat, ara
 *   toplam, kargo ve toplam KABUL EDİLMEZ; hepsi `siparisOlustur` içinde
 *   sunucudaki ürün kataloğundan hesaplanır.
 * - MİSAFİR sipariş: oturum zorunlu değildir, `userId` boş kalır.
 * - Her sipariş QR etiketlerini 15 dakikalığına REZERVE ettiği için uç
 *   IP başına sınırlanır: sınır olmadan tek bir istemci tüm stoğu
 *   kilitleyebilirdi.
 * - `OrderConsent` YAZILMAZ: hukuki metinler ve sürümleri henüz mevcut
 *   olmadığı için sahte onay kaydı üretilmez.
 */

export async function POST(request: Request) {
  try {
    const ip = istemciIpAdresi(request.headers);

    const ipSiniri = await hizSiniriKontrol({
      kapsam: "siparis-olusturma-ip",
      tanimlayici: ip,
      limit: 10,
      pencereSaniye: 60 * 60,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla sipariş denemesi yapıldı. Lütfen ${Math.ceil(
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
    const urunKodu = String(body?.urunKodu || "").trim();

    if (!urunKodu) {
      return NextResponse.json({ error: "Ürün seçilmedi." }, { status: 400 });
    }

    const siparis = await siparisOlustur({
      sepet: [{ kod: urunKodu, adet: 1 }],
      teslimat: {
        fullName: String(body?.fullName || ""),
        email: String(body?.email || ""),
        phone: String(body?.phone || ""),
        addressLine: String(body?.addressLine || ""),
        district: String(body?.district || ""),
        city: String(body?.city || ""),
        postalCode: String(body?.postalCode || ""),
      },
      userId: null,
      rezervasyonSonGecerlilik: rezervasyonSonGecerliligi(),
    });

    return NextResponse.json({
      success: true,
      orderId: siparis.id,
      orderNumber: siparis.orderNumber,
      totalKurus: siparis.totalKurus,
    });
  } catch (hata) {
    // Stok ve alan doğrulama hataları kullanıcıya gösterilebilir.
    if (hata instanceof StokHatasi || hata instanceof Error) {
      return NextResponse.json(
        { error: hata.message || "Sipariş oluşturulamadı." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Sipariş oluşturulamadı." },
      { status: 500 }
    );
  }
}
