import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { etiketKoduBicimle, etiketUret } from "@/lib/tags";

/**
 * Toplu etiket üretimi (yalnızca yönetici).
 *
 * Aktivasyon kodları veritabanına düz metin YAZILMAZ; yalnızca bu yanıtta
 * bir kez döner. Yanıt kaybedilirse kodlar geri getirilemez, etiketlerin
 * yeniden üretilmesi gerekir. Bu bilinçli bir tercihtir: veritabanı sızsa
 * bile kimse başkasının etiketini aktive edemez.
 */

const EN_FAZLA = 500;

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
    const adet = Number(body.adet);

    if (!Number.isInteger(adet) || adet < 1 || adet > EN_FAZLA) {
      return NextResponse.json(
        { error: `Adet 1 ile ${EN_FAZLA} arasında bir tam sayı olmalıdır.` },
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
      })),
    });

    return NextResponse.json({
      success: true,
      adet,
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
