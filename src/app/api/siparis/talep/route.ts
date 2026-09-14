import { NextResponse } from "next/server";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import {
  SiparisTalebiHatasi,
  talepOlustur,
  talepTuruMu,
} from "@/lib/siparis-talebi";

/**
 * Müşteri iptal/iade talebi oluşturma (herkese açık).
 *
 * Güvenlik kuralları:
 * - Sipariş YALNIZCA kriptografik `publicToken` ile bulunur. Sipariş
 *   kimliği (`id`) istemciden KABUL EDİLMEZ; aksi hâlde bir müşteri
 *   başka bir siparişin kimliğini deneyerek talep açabilirdi. Bu, site
 *   genelinde kullanılan sipariş takip kalıbının aynısıdır ve MİSAFİR
 *   siparişte de çalışır.
 * - Talebin o sipariş durumunda açılabilir olup olmadığına sunucu karar
 *   verir; istemciden gelen durum bilgisi kullanılmaz.
 * - Aynı sipariş için ikinci bekleyen talep veritabanı kısıtıyla
 *   engellenir.
 * - Herkese açık olduğu için IP başına sınırlanır: sınır olmadan tek bir
 *   istemci talep tablosunu şişirebilirdi.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = istemciIpAdresi(request.headers);

    const sinir = await hizSiniriKontrol({
      kapsam: "siparis-talebi-ip",
      tanimlayici: ip,
      limit: 20,
      pencereSaniye: 60 * 60,
    });

    if (!sinir.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla talep gönderildi. Lütfen ${Math.ceil(
            sinir.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        { status: 429, headers: { "Retry-After": String(sinir.bekleSaniye) } }
      );
    }

    const body = await request.json().catch(() => null);
    const tur = body?.tur;

    if (!talepTuruMu(tur)) {
      return NextResponse.json({ error: "Geçersiz talep türü." }, { status: 400 });
    }

    const talep = await talepOlustur({
      publicToken: String(body?.publicToken || ""),
      tur,
      gerekce: body?.gerekce,
    });

    return NextResponse.json({ success: true, talep });
  } catch (hata) {
    if (hata instanceof SiparisTalebiHatasi) {
      return NextResponse.json({ error: hata.message }, { status: 400 });
    }

    console.error("Sipariş talebi ucu hatası:", (hata as Error)?.name);

    return NextResponse.json({ error: "İşlem tamamlanamadı." }, { status: 500 });
  }
}
