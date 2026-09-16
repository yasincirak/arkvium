import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import { etiketKoduBicimle, TAG_DURUM_ETIKETLERI, type TagDurumu } from "@/lib/tags";
import {
  aramaTerimiCoz,
  EN_AZ_ARAMA_UZUNLUGU,
  EN_FAZLA_ARAMA_SONUCU,
  rezervasyonGecerliMi,
} from "@/lib/etiket-yonetim-kurallari";

/**
 * Etiket koduyla arama (YALNIZCA YÖNETİCİ).
 *
 * ─────────────────────────────────────────────────────────────
 * YANITTA GİZLİ DEĞER YOKTUR
 *
 * `select` listesi bilinçli olarak dardır: `publicToken` ve
 * `activationCodeHash` HİÇ OKUNMAZ. Böylece bu uç sızsa bile ne QR
 * adresi ne de aktivasyon kodu özeti dışarı çıkar. Aktivasyon kodunun
 * düz metni zaten veritabanında yoktur.
 *
 * Tam ve kısmi arama aynı normalleştirmeden geçer (`aramaTerimiCoz`):
 * büyük/küçük harf, tire ve boşluk farkı sonucu değiştirmez.
 * ─────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";

function hata(mesaj: string, durum: number) {
  return NextResponse.json({ error: mesaj }, { status: durum });
}

export async function GET(request: Request) {
  try {
    const admin = await yoneticiErisimi();

    if (!admin) {
      return hata("Bu işlem için yönetici girişi gerekiyor.", 401);
    }

    // Arama ucu ucuz ama sınırsız değil: yönetici başına saatlik sınır.
    const siniri = await hizSiniriKontrol({
      kapsam: "admin-etiket-arama",
      tanimlayici: admin.userId,
      limit: 300,
      pencereSaniye: 60 * 60,
    });

    if (!siniri.izinli) {
      return NextResponse.json(
        { error: "Çok fazla arama yapıldı. Lütfen biraz sonra tekrar deneyin." },
        {
          status: 429,
          headers: { "Retry-After": String(siniri.bekleSaniye) },
        }
      );
    }

    const adres = new URL(request.url);
    const terim = aramaTerimiCoz(adres.searchParams.get("kod"));

    if (!terim) {
      return hata(
        `Arama için en az ${EN_AZ_ARAMA_UZUNLUGU} karakter yazın.`,
        400
      );
    }

    const kayitlar = await prisma.tag.findMany({
      where: { code: { contains: terim.parca, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: EN_FAZLA_ARAMA_SONUCU,
      select: {
        id: true,
        code: true,
        status: true,
        productKod: true,
        createdAt: true,
        activatedAt: true,
        itemRecord: { select: { assetName: true } },
        orderTag: {
          select: {
            reservationExpiresAt: true,
            order: { select: { orderNumber: true } },
          },
        },
      },
    });

    const urunAdi = (kod: string | null) =>
      kod ? SIPARIS_URUNLERI.find((u) => u.kod === kod)?.ad ?? kod : null;

    return NextResponse.json({
      sonuclar: kayitlar.map((etiket) => ({
        id: etiket.id,
        kod: etiketKoduBicimle(etiket.code),
        urunKod: etiket.productKod,
        urunAdi: urunAdi(etiket.productKod),
        durum: etiket.status,
        durumAdi:
          TAG_DURUM_ETIKETLERI[etiket.status as TagDurumu] ?? etiket.status,
        uretim: etiket.createdAt.toISOString(),
        aktivasyon: etiket.activatedAt ? etiket.activatedAt.toISOString() : null,
        kayitAdi: etiket.itemRecord?.assetName ?? null,
        siparisNo: etiket.orderTag?.order.orderNumber ?? null,
        rezerveMi: rezervasyonGecerliMi(
          etiket.orderTag?.reservationExpiresAt ?? null
        ),
      })),
      tamKodAramasi: terim.tamKod !== null,
      sinir: EN_FAZLA_ARAMA_SONUCU,
    });
  } catch (error) {
    // Ayrıntı loglanmaz: sorgu etiket kodu taşır, gereksiz iz bırakılmaz.
    console.error(
      "Etiket arama hatası:",
      error instanceof Error ? error.name : "BilinmeyenHata"
    );

    return hata("Arama yapılamadı.", 500);
  }
}
