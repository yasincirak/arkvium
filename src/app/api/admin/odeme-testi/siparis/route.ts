import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { rezervasyonSonGecerliligi, StokHatasi } from "@/lib/qr-rezervasyon";
import { siparisOlustur } from "@/lib/siparis-servisi";

/**
 * Sandbox ödeme testi için sipariş oluşturur (YALNIZCA YÖNETİCİ).
 *
 * Bu uç, herkese açık satış akışının parçası DEĞİLDİR: `/admin/odeme-testi`
 * sayfasının teknik doğrulama adımıdır. Herkese açık ürün bölümü ve WhatsApp
 * akışı bundan etkilenmez.
 *
 * Güvenlik kuralları:
 * - `src/middleware.ts` yalnızca `/admin/*` SAYFALARINI korur; `/api/admin/*`
 *   kapsam dışıdır. Bu yüzden yetki burada `getAdminSession()` ile AYRICA
 *   doğrulanır; oturumsuz istek 401 alır ve hiçbir kayıt oluşmaz.
 * - İstemciden yalnızca ürün KODU ve teslimat bilgisi alınır. Fiyat, ara
 *   toplam, kargo ve toplam istemciden KABUL EDİLMEZ; hepsi `siparisOlustur`
 *   içinde sunucudaki ürün kataloğundan hesaplanır.
 * - Adet her zaman 1'dir; sepet ve çoklu ürün bu akışın kapsamında değildir.
 * - `OrderConsent` YAZILMAZ: hukuki metinler ve sürümleri henüz mevcut
 *   olmadığı için sahte onay kaydı üretilmez (bkz. Aşama 11 beklemede).
 */

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { error: "Bu işlem için yönetici girişi gerekiyor." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const urunKodu = String(body?.urunKodu || "").trim();

    if (!urunKodu) {
      return NextResponse.json({ error: "Ürün seçilmedi." }, { status: 400 });
    }

    const siparis = await siparisOlustur({
      // Adet sabit 1; istemciden adet alınmaz.
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
      // Misafir sipariş: yönetici oturumu siparişe BAĞLANMAZ.
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
    // Stok ve doğrulama hataları kullanıcıya gösterilebilir.
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
