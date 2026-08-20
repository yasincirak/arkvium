import { NextResponse } from "next/server";
import { odemeSonucunuIsle } from "@/lib/odeme-servisi";
import { OdemeHatasi } from "@/lib/odeme-saglayici";

/**
 * iyzico Checkout Form dönüşü.
 *
 * Güvenlik kuralları:
 * - Token YALNIZCA POST gövdesinden okunur; adres (query) parametresi kabul
 *   edilmez ve GET desteklenmez. Tutar, durum veya sipariş kimliği gibi
 *   istemci tarafından taşınan hiçbir alana güvenilmez; ödemenin gerçek
 *   sonucu bu token ile sağlayıcıdan sorulur.
 * - Token değeri hiçbir log kaydına yazılmaz.
 * - Tekrarlanan çağrılar idempotenttir (`PaymentEvent.eventKey` unique).
 * - Sağlayıcı anahtarları ve ham yanıt hiçbir zaman yanıta yazılmaz.
 * - İşleme bittikten SONRA kullanıcı sonuç sayfasına yönlendirilir; sayfa
 *   yalnızca okur, hiçbir durumu değiştirmez.
 *
 * Hız sınırı uygulanmaz: bu uç sağlayıcı tarafından çağrılır ve meşru
 * bildirimlerin düşmemesi gerekir. Geçersiz token zaten doğrulamada elenir.
 */

export const dynamic = "force-dynamic";

/**
 * Token'ı yalnızca POST gövdesinden okur.
 *
 * iyzico Checkout Form dönüşünde token POST edilir; adres satırındaki bir
 * değer kabul edilmez (tarayıcı geçmişi, sunucu logu ve yönlendirici
 * başlıklarında sızma riski taşır).
 */
async function tokenOku(request: Request): Promise<string> {
  const icerikTuru = request.headers.get("content-type") ?? "";

  try {
    if (icerikTuru.includes("application/json")) {
      const govde = await request.json();

      return String(govde?.token ?? "").trim();
    }

    const form = await request.formData();

    return String(form.get("token") ?? "").trim();
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const token = await tokenOku(request);

    if (!token) {
      return NextResponse.json(
        { error: "Ödeme doğrulanamadı." },
        { status: 400 }
      );
    }

    const sonuc = await odemeSonucunuIsle({ token });

    if (sonuc.publicToken) {
      // 303: tarayıcı POST'tan sonra sayfayı GET ile açar.
      // Adres yalnızca siparişin kendi public token'ını taşır; ödeme
      // sağlayıcısının token'ı adrese YAZILMAZ.
      return NextResponse.redirect(
        new URL(`/odeme/sonuc/${sonuc.publicToken}`, request.url),
        { status: 303 }
      );
    }

    return NextResponse.json({
      success: true,
      durum: sonuc.durum,
      zatenIslenmis: sonuc.zatenIslenmis,
    });
  } catch (hata) {
    if (hata instanceof OdemeHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Ödeme dönüş ucu hatası:", (hata as Error)?.name);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
