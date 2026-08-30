import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";
import { SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Ürün türü olmayan etiketleri sınıflandırır (yalnızca yönetici).
 *
 * GÜVENLİK KURALLARI — hepsi sunucu tarafında zorlanır:
 *
 * 1. HİÇBİR ETİKET SİLİNMEZ, İPTAL EDİLMEZ. Yalnızca `productKod` alanı
 *    yazılır; `status`, `userId`, `itemRecordId`, `activationCodeHash` ve
 *    `publicToken` alanlarına dokunulmaz. Aktif etiketler çalışmaya devam eder.
 *
 * 2. OTOMATİK ATAMA YOKTUR. Yönetici her etiketi tek tek seçer; istekte
 *    gelen kimlikler dışında hiçbir satır değişmez.
 *
 * 3. MEVCUT TÜR EZİLMEZ. Güncelleme koşulu `productKod: null` içerir.
 *    Zaten türü olan bir etiket sessizce başka bir ürüne geçirilemez —
 *    iki eşzamanlı istek de aynı etiketi iki farklı ürüne atayamaz.
 *
 * 4. HER DEĞİŞİKLİK KAYIT ALTINA ALINIR. `TagEvent` tablosuna "classified"
 *    olayı yazılır: kim, ne zaman, hangi türe.
 *
 * Sınıflandırma ile olay yazımı tek transaction içindedir; biri başarısız
 * olursa diğeri de geri alınır.
 */

/** Tek istekte işlenebilecek en fazla etiket. */
const EN_FAZLA = 200;

export async function POST(request: Request) {
  try {
    const admin = await yoneticiErisimi();

    if (!admin) {
      return NextResponse.json(
        { error: "Bu işlem için yönetici girişi gerekiyor." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productKod = String(body.productKod || "").trim();
    const urun = SIPARIS_URUNLERI.find((u) => u.kod === productKod);

    if (!urun) {
      return NextResponse.json(
        { error: "Geçerli bir ürün türü seçin." },
        { status: 400 }
      );
    }

    const gelenler: unknown = body.tagIds;

    if (!Array.isArray(gelenler) || gelenler.length === 0) {
      return NextResponse.json(
        { error: "En az bir etiket seçin." },
        { status: 400 }
      );
    }

    if (gelenler.length > EN_FAZLA) {
      return NextResponse.json(
        { error: `Tek seferde en fazla ${EN_FAZLA} etiket seçilebilir.` },
        { status: 400 }
      );
    }

    // Tekrar eden kimlikler ayıklanır; aynı etiket iki kez sayılmasın.
    const tagIds = Array.from(
      new Set(
        gelenler
          .map((deger) => String(deger || "").trim())
          .filter((deger) => deger.length > 0)
      )
    );

    if (tagIds.length === 0) {
      return NextResponse.json(
        { error: "En az bir etiket seçin." },
        { status: 400 }
      );
    }

    const sonuc = await prisma.$transaction(async (islem) => {
      /*
        Yalnızca TÜRÜ OLMAYAN ve istekte açıkça seçilmiş etiketler.
        Türü olan bir etiket seçilse bile bu filtre onu dışarıda bırakır.
      */
      const uygunlar = await islem.tag.findMany({
        where: { id: { in: tagIds }, productKod: null },
        select: { id: true },
      });

      if (uygunlar.length === 0) {
        return { guncellenen: 0, atlanan: tagIds.length };
      }

      const uygunIdler = uygunlar.map((etiket) => etiket.id);

      const guncelleme = await islem.tag.updateMany({
        // Koşul burada da tekrarlanır: iki eşzamanlı istekten yalnızca biri yazar.
        where: { id: { in: uygunIdler }, productKod: null },
        data: { productKod: urun.kod },
      });

      await islem.tagEvent.createMany({
        data: uygunIdler.map((tagId) => ({
          tagId,
          type: "classified",
          actorUserId: admin.userId,
          fromProductKod: null,
          toProductKod: urun.kod,
        })),
      });

      return {
        guncellenen: guncelleme.count,
        atlanan: tagIds.length - guncelleme.count,
      };
    });

    return NextResponse.json({
      success: true,
      urun: { kod: urun.kod, ad: urun.ad },
      guncellenen: sonuc.guncellenen,
      atlanan: sonuc.atlanan,
    });
  } catch (error) {
    console.error("Etiket sınıflandırma hatası:", error);

    return NextResponse.json(
      { error: "Etiketler sınıflandırılamadı." },
      { status: 500 }
    );
  }
}
