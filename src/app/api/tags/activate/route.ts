import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { hizSiniriKontrol, istemciIpAdresi } from "@/lib/rate-limit";
import {
  aktivasyonKoduOzetle,
  etiketKoduNormalize,
  TAG_DURUM_ETIKETLERI,
  type TagDurumu,
} from "@/lib/tags";

/**
 * Etiket aktivasyonu.
 *
 * Güvenlik kuralları:
 * - Yalnızca giriş yapmış kullanıcı aktive edebilir.
 * - Aktivasyon kodu (fiziksel etikete sahip olmanın kanıtı) doğrulanır.
 * - Yalnızca `unused` durumundaki etiketler aktive edilebilir.
 * - Durum geçişi koşullu güncelleme ile yapılır; iki eşzamanlı istek
 *   aynı etiketi aktive edemez.
 * - Var olan bir ürüne bağlanacaksa ürünün kullanıcıya ait olduğu doğrulanır.
 *
 * Tüm kontroller sunucu tarafındadır; istemciden gelen hiçbir yetki
 * bilgisine güvenilmez.
 */

const ORTAK_HATA =
  "Etiket kodu veya aktivasyon kodu hatalı. Lütfen etiketin üzerindeki bilgileri kontrol edin.";

export async function POST(request: Request) {
  try {
    const session = await getUserSession();

    if (!session) {
      return NextResponse.json(
        { error: "Etiket etkinleştirmek için giriş yapmanız gerekiyor." },
        { status: 401 }
      );
    }

    // Deneme yanılma ile aktivasyon kodu bulunmasını engeller.
    const ipSiniri = await hizSiniriKontrol({
      kapsam: "etiket-aktivasyon-ip",
      tanimlayici: istemciIpAdresi(request.headers),
      limit: 10,
      pencereSaniye: 60 * 60,
    });

    if (!ipSiniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla deneme yapıldı. Lütfen ${Math.ceil(
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

    const tagCode = String(body.tagCode || "").trim();
    const activationCode = String(body.activationCode || "").trim();
    const itemRecordId = String(body.itemRecordId || "").trim();
    const assetName = String(body.assetName || "").trim();

    if (!tagCode || !activationCode) {
      return NextResponse.json(
        { error: "Etiket kodu ve aktivasyon kodu zorunludur." },
        { status: 400 }
      );
    }

    if (!itemRecordId && !assetName) {
      return NextResponse.json(
        { error: "Etiketi bağlayacağınız ürünü seçin veya yeni ürün adı girin." },
        { status: 400 }
      );
    }

    if (assetName.length > 100) {
      return NextResponse.json(
        { error: "Ürün adı 100 karakterden uzun olamaz." },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.findUnique({
      where: { code: etiketKoduNormalize(tagCode) },
    });

    // Etiket yok ve aktivasyon kodu hatalı durumları aynı yanıtı döner;
    // hangi etiket kodlarının var olduğu sızdırılmaz.
    if (!tag || tag.activationCodeHash !== aktivasyonKoduOzetle(activationCode)) {
      return NextResponse.json({ error: ORTAK_HATA }, { status: 400 });
    }

    if (tag.status !== "unused") {
      const durum = tag.status as TagDurumu;

      const mesaj =
        durum === "active"
          ? "Bu etiket zaten etkinleştirilmiş."
          : durum === "revoked"
            ? "Bu etiket iptal edilmiş ve kullanılamaz."
            : durum === "inactive"
              ? "Bu etiket pasif durumda. Hesabınızdan yeniden etkinleştirebilirsiniz."
              : `Bu etiket etkinleştirilemez (durum: ${
                  TAG_DURUM_ETIKETLERI[durum] ?? tag.status
                }).`;

      return NextResponse.json({ error: mesaj }, { status: 409 });
    }

    // Var olan ürüne bağlanacaksa sahiplik doğrulanır.
    let hedefKayitId = itemRecordId;

    if (hedefKayitId) {
      const kayit = await prisma.itemRecord.findFirst({
        where: { id: hedefKayitId, userId: session.userId },
        select: { id: true, tag: { select: { id: true } } },
      });

      if (!kayit) {
        return NextResponse.json(
          { error: "Seçilen ürün bulunamadı." },
          { status: 404 }
        );
      }

      if (kayit.tag) {
        return NextResponse.json(
          { error: "Bu ürüne zaten bir etiket bağlı." },
          { status: 409 }
        );
      }
    }

    const kullanici = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { fullName: true, email: true, phone: true },
    });

    if (!kullanici) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    const simdi = new Date();

    const sonuc = await prisma.$transaction(async (islem) => {
      // Yeni ürün oluşturulacaksa burada oluşturulur.
      if (!hedefKayitId) {
        const yeniKayit = await islem.itemRecord.create({
          data: {
            id: randomUUID(),
            assetName,
            ownerName: kullanici.fullName ?? "",
            phone: kullanici.phone ?? "",
            email: kullanici.email,
            description: "",
            category: "",
            status: "active",
            createdAt: simdi,
            userId: session.userId,
          },
          select: { id: true },
        });

        hedefKayitId = yeniKayit.id;
      }

      // Koşullu güncelleme: durum hâlâ "unused" ise günceller.
      // İki eşzamanlı istekten yalnızca biri 1 satır günceller.
      const guncelleme = await islem.tag.updateMany({
        where: { id: tag.id, status: "unused" },
        data: {
          status: "active",
          userId: session.userId,
          itemRecordId: hedefKayitId,
          activatedAt: simdi,
        },
      });

      if (guncelleme.count !== 1) {
        // Yarışı kaybeden istek işlemi geri alır.
        throw new Error("ETIKET_ZATEN_AKTIF");
      }

      await islem.tagEvent.create({
        data: {
          tagId: tag.id,
          type: "activated",
          actorUserId: session.userId,
          toItemRecordId: hedefKayitId,
          toUserId: session.userId,
        },
      });

      return { itemRecordId: hedefKayitId };
    });

    return NextResponse.json({
      success: true,
      message: "Etiket etkinleştirildi.",
      tag: { code: tag.code, publicToken: tag.publicToken },
      itemRecordId: sonuc.itemRecordId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ETIKET_ZATEN_AKTIF") {
      return NextResponse.json(
        { error: "Bu etiket zaten etkinleştirilmiş." },
        { status: 409 }
      );
    }

    console.error("Etiket aktivasyon hatası:", error);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
