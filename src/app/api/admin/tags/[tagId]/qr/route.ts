import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";
import { etiketAdresi, etiketKoduBicimle } from "@/lib/tags";
import { qrSvgUret } from "@/lib/qr-svg-sunucu";
import { qrDosyaAdi } from "@/lib/etiket-yonetim-kurallari";
import { etiketYazdirmaVarMi } from "@/lib/baski-yapilandirmasi";
import { URETIM_TABAN_ADRESI, svgOlcuUygula } from "@/lib/baskici-paketi";
import {
  SESSIZ_ALAN_MODUL,
  TOPLAM_MODUL,
  yerlesimAl,
} from "@/components/admin/EtiketBaskiOlculeri";

/**
 * TEK ETİKETİN QR DOSYASINI YENİDEN İNDİRME (YALNIZCA YÖNETİCİ).
 *
 * ─────────────────────────────────────────────────────────────
 * NE İÇERİR, NE İÇERMEZ
 *
 * İçerir : yalnızca etiketin HERKESE AÇIK hedefi — `/t/<publicToken>`.
 *          Bu adres QR okutulduğunda zaten açılan adrestir; gizli değildir
 *          ve veritabanındaki gerçek token'dan yeniden üretilir.
 *
 * İçermez: aktivasyon kodu, `activationCodeHash`, sahip bilgisi, sipariş
 *          bilgisi veya herhangi bir kişisel veri. SVG yalnızca QR
 *          modüllerinden oluşur.
 *
 * ÖLÇÜ
 * 30×30 mm etiket standardının QR kutusu kullanılır
 * (`EtiketBaskiOlculeri`). Ölçü burada UYDURULMAZ; toplu baskı akışıyla
 * aynı tek kaynaktan okunur, böylece tekil indirilen dosya ile sayfa
 * baskısı arasında ölçü farkı oluşamaz.
 *
 * KAPSAM
 * Yalnızca 30×30 mm yazdırma akışı tanımlı ürünlerde (bugün: 3'lü QR
 * Sticker Seti) çalışır. Diğer ürünlerin baskıcı ZIP paketi akışı bu
 * uçtan ETKİLENMEZ; o uç ayrıdır ve değiştirilmemiştir.
 * ─────────────────────────────────────────────────────────────
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hata(mesaj: string, durum: number) {
  return NextResponse.json({ error: mesaj }, { status: durum });
}

export async function GET(
  _request: Request,
  { params }: { params: { tagId: string } }
) {
  try {
    const admin = await yoneticiErisimi();

    if (!admin) {
      return hata("Bu işlem için yönetici girişi gerekiyor.", 401);
    }

    const tagId = String(params.tagId || "").trim();

    if (!tagId) {
      return hata("Etiket bulunamadı.", 404);
    }

    const etiket = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { code: true, publicToken: true, productKod: true, status: true },
    });

    if (!etiket) {
      return hata("Etiket bulunamadı.", 404);
    }

    if (!etiketYazdirmaVarMi(etiket.productKod)) {
      return hata(
        "Bu ürün için 30×30 mm QR dosyası tanımlı değil.",
        400
      );
    }

    /*
      İPTAL EDİLMİŞ ETİKETİN QR'I BASILMAZ.

      İptal edilen adres artık hiçbir sahibe açılmaz; dosyayı üretmek
      yalnızca çöp etiket basılmasına yol açardı.
    */
    if (etiket.status === "revoked") {
      return hata("İptal edilmiş etiketin QR dosyası üretilmez.", 409);
    }

    /*
      Adres istemciden ALINMAZ: veritabanındaki gerçek token ile ve
      üretimde kullanılan yardımcının aynısıyla kurulur.
    */
    const adres = etiketAdresi(etiket.publicToken, URETIM_TABAN_ADRESI);

    const yerlesim = yerlesimAl(true);
    const kenarMm = yerlesim.qrKutuMm;
    const enAzSessizAlanMm = (kenarMm / TOPLAM_MODUL) * SESSIZ_ALAN_MODUL;

    const svg = svgOlcuUygula(qrSvgUret(adres), kenarMm, enAzSessizAlanMm);

    const dosyaAdi = qrDosyaAdi(etiketKoduBicimle(etiket.code), kenarMm);

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
        // Yönetim çıktısı önbelleğe alınmaz.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "Tekil QR üretim hatası:",
      error instanceof Error ? error.name : "BilinmeyenHata"
    );

    return hata("QR dosyası üretilemedi.", 500);
  }
}
