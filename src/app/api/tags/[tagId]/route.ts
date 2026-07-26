import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";

/**
 * Etiket yönetimi: pasife alma, yeniden etkinleştirme, iptal ve taşıma.
 *
 * Yetkilendirme tek noktada yapılır: işlem yapan kullanıcı etiketin sahibi
 * olmak zorundadır. Sahiplik kontrolü sunucu tarafındadır; istemciden gelen
 * hiçbir bilgiye güvenilmez.
 *
 * Her durum değişikliği ve taşıma TagEvent tablosuna kaydedilir.
 */

type Islem = "pasiflestir" | "etkinlestir" | "iptal" | "tasi";

const GECERLI_ISLEMLER: readonly Islem[] = [
  "pasiflestir",
  "etkinlestir",
  "iptal",
  "tasi",
];

export async function POST(
  request: Request,
  { params }: { params: { tagId: string } }
) {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json(
        { error: "Bu işlem için giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    const siniri = await hizSiniriKontrol({
      kapsam: "etiket-yonetimi",
      tanimlayici: session.userId,
      limit: 60,
      pencereSaniye: 60 * 60,
    });

    if (!siniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla işlem yapıldı. Lütfen ${Math.ceil(
            siniri.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(siniri.bekleSaniye) },
        }
      );
    }

    const body = await request.json();
    const islem = String(body.islem || "") as Islem;

    if (!GECERLI_ISLEMLER.includes(islem)) {
      return NextResponse.json(
        { error: "Geçersiz işlem." },
        { status: 400 }
      );
    }

    // Sahiplik kontrolü: etiket hem var olmalı hem de bu kullanıcıya ait olmalı.
    const tag = await prisma.tag.findFirst({
      where: { id: params.tagId, userId: session.userId },
      select: { id: true, status: true, itemRecordId: true },
    });

    if (!tag) {
      // Var olmayan etiket ile başkasına ait etiket aynı yanıtı verir.
      return NextResponse.json(
        { error: "Etiket bulunamadı." },
        { status: 404 }
      );
    }

    if (tag.status === "revoked") {
      return NextResponse.json(
        { error: "İptal edilmiş etiket üzerinde işlem yapılamaz." },
        { status: 409 }
      );
    }

    if (tag.status === "unused") {
      return NextResponse.json(
        { error: "Etkinleştirilmemiş etiket üzerinde işlem yapılamaz." },
        { status: 409 }
      );
    }

    const simdi = new Date();

    if (islem === "pasiflestir") {
      if (tag.status === "inactive") {
        return NextResponse.json(
          { error: "Etiket zaten pasif durumda." },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.tag.update({
          where: { id: tag.id },
          data: { status: "inactive" },
        }),
        prisma.tagEvent.create({
          data: {
            tagId: tag.id,
            type: "deactivated",
            actorUserId: session.userId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: "inactive",
        message:
          "Etiket pasife alındı. QR kodu okutulduğunda bildirim gönderilemez.",
      });
    }

    if (islem === "etkinlestir") {
      if (tag.status === "active") {
        return NextResponse.json(
          { error: "Etiket zaten aktif." },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.tag.update({
          where: { id: tag.id },
          data: { status: "active" },
        }),
        prisma.tagEvent.create({
          data: {
            tagId: tag.id,
            type: "reactivated",
            actorUserId: session.userId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: "active",
        message: "Etiket yeniden etkinleştirildi.",
      });
    }

    if (islem === "iptal") {
      // İptal geri alınamaz; etiket bir daha kullanılamaz.
      await prisma.$transaction([
        prisma.tag.update({
          where: { id: tag.id },
          data: { status: "revoked", revokedAt: simdi },
        }),
        prisma.tagEvent.create({
          data: {
            tagId: tag.id,
            type: "revoked",
            actorUserId: session.userId,
            fromItemRecordId: tag.itemRecordId,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        status: "revoked",
        message: "Etiket kalıcı olarak iptal edildi.",
      });
    }

    // islem === "tasi"
    const hedefKayitId = String(body.itemRecordId || "").trim();

    if (!hedefKayitId) {
      return NextResponse.json(
        { error: "Etiketin taşınacağı ürünü seçin." },
        { status: 400 }
      );
    }

    if (hedefKayitId === tag.itemRecordId) {
      return NextResponse.json(
        { error: "Etiket zaten bu ürüne bağlı." },
        { status: 409 }
      );
    }

    // Hedef ürün de bu kullanıcıya ait olmalı.
    const hedef = await prisma.itemRecord.findFirst({
      where: { id: hedefKayitId, userId: session.userId },
      select: { id: true, tag: { select: { id: true } } },
    });

    if (!hedef) {
      return NextResponse.json(
        { error: "Seçilen ürün bulunamadı." },
        { status: 404 }
      );
    }

    if (hedef.tag) {
      return NextResponse.json(
        { error: "Bu ürüne zaten başka bir etiket bağlı." },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.tag.update({
        where: { id: tag.id },
        data: { itemRecordId: hedefKayitId },
      }),
      prisma.tagEvent.create({
        data: {
          tagId: tag.id,
          type: "moved",
          actorUserId: session.userId,
          fromItemRecordId: tag.itemRecordId,
          toItemRecordId: hedefKayitId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Etiket yeni ürüne taşındı.",
      itemRecordId: hedefKayitId,
    });
  } catch (error) {
    console.error("Etiket yönetimi hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
