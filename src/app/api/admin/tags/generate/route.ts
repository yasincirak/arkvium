import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";
import { etiketKoduBicimle, etiketUret } from "@/lib/tags";
import { SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Toplu etiket üretimi (yalnızca yönetici).
 *
 * Aktivasyon kodları veritabanına düz metin YAZILMAZ; yalnızca bu yanıtta
 * bir kez döner. Yanıt kaybedilirse kodlar geri getirilemez, etiketlerin
 * yeniden üretilmesi gerekir. Bu bilinçli bir tercihtir: veritabanı sızsa
 * bile kimse başkasının etiketini aktive edemez.
 *
 * ÜRÜN TÜRÜ ZORUNLUDUR. Etiketler fiziksel olarak farklı ürünlere basılır
 * (sticker, metal anahtarlık, künye...). Tür yazılmazsa sipariş karşılamada
 * yanlış ürünün etiketi ayrılır ve bu hata sessizce geçer.
 */

const EN_FAZLA = 500;

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
    const adet = Number(body.adet);

    if (!Number.isInteger(adet) || adet < 1 || adet > EN_FAZLA) {
      return NextResponse.json(
        { error: `Adet 1 ile ${EN_FAZLA} arasında bir tam sayı olmalıdır.` },
        { status: 400 }
      );
    }

    const productKod = String(body.productKod || "").trim();
    const urun = SIPARIS_URUNLERI.find((u) => u.kod === productKod);

    if (!urun) {
      return NextResponse.json(
        { error: "Geçerli bir ürün türü seçin." },
        { status: 400 }
      );
    }

    const uretilenler = Array.from({ length: adet }, () => etiketUret());

    await prisma.tag.createMany({
      data: uretilenler.map((etiket) => ({
        code: etiket.code,
        publicToken: etiket.publicToken,
        activationCodeHash: etiket.activationCodeHash,
        status: "unused",
        productKod: urun.kod,
      })),
    });

    return NextResponse.json({
      success: true,
      adet,
      urun: { kod: urun.kod, ad: urun.ad },
      uyari:
        "Aktivasyon kodları yalnızca bir kez gösterilir. Bu listeyi kaydetmeden sayfadan ayrılmayın.",
      etiketler: uretilenler.map((etiket) => ({
        // Baskı için okunabilir biçim; veritabanında normalleştirilmiş hâli durur.
        code: etiketKoduBicimle(etiket.code),
        activationCode: etiket.activationCode,
        publicToken: etiket.publicToken,
      })),
    });
  } catch (error) {
    console.error("Etiket üretim hatası:", error);

    return NextResponse.json(
      { error: "Etiketler üretilemedi." },
      { status: 500 }
    );
  }
}
