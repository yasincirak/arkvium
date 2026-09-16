import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { yoneticiErisimi } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";
import { etiketKoduBicimle, etiketUret } from "@/lib/tags";
import {
  islemUygunlugu,
  onayKoduDogru,
  rezervasyonGecerliMi,
} from "@/lib/etiket-yonetim-kurallari";

/**
 * Etiket İPTAL ve YENİLEME (YALNIZCA YÖNETİCİ).
 *
 * ─────────────────────────────────────────────────────────────
 * GÜVENLİK SÖZLEŞMESİ
 *
 * 1. TEK ETİKET. Uç yalnızca adresteki `tagId` üzerinde çalışır; toplu
 *    işlem YOKTUR. Yanlışlıkla bütün stoğu etkileyecek bir çağrı kurulamaz.
 *
 * 2. YAZILI ONAY. İstek gövdesinde etiket kodunun yeniden yazılması
 *    zorunludur (`onayKodu`). İstemcideki onay ekranı atlansa bile yanlış
 *    etiket üzerinde işlem yapılamaz. Kod gizli değildir; amacı sır
 *    saklamak değil, YANLIŞ SATIRI seçmeyi engellemektir.
 *
 * 3. AKTİVASYON KODU GERİ GETİRİLMEZ. Veritabanında yalnızca SHA-256
 *    özeti vardır. Yenilemede YENİ bir kod üretilir ve yanıtta BİR KEZ
 *    döner; veritabanına yine yalnızca özeti yazılır.
 *
 * 4. TRANSACTION. Eski etiketin iptali ile yeni etiketin oluşturulması
 *    tek transaction içindedir. Yarıda kalırsa ikisi de geri alınır;
 *    "eski iptal ama yeni yok" durumu oluşmaz.
 *
 * 5. IDEMPOTENCY. İptal, `status`'ü koşullu güncelleyerek yapılır
 *    (`where: { id, status: { not: "revoked" } }`). Aynı istek ikinci kez
 *    gelirse güncelleme 0 satır etkiler, transaction hiçbir şey yazmadan
 *    biter ve YENİ ETİKET ÜRETİLMEZ. Yanıt `tekrarEdildi: true` döner.
 *    Ek bir kolon veya migration GEREKMEZ; koruma veritabanı durumunun
 *    kendisinden gelir.
 *
 * 6. GERİ DÖNÜŞSÜZ VERİ SİLME YOKTUR. Etiket satırı silinmez; yalnızca
 *    durumu değişir ve sahiplik bağları koparılır. Koparılan bağlar
 *    `TagEvent` içine (fromUserId / fromItemRecordId) yazılarak denetim
 *    izi korunur.
 * ─────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";

type Islem = "iptal" | "yenile";

const GECERLI_ISLEMLER: Islem[] = ["iptal", "yenile"];

function hata(mesaj: string, durum: number) {
  return NextResponse.json({ error: mesaj }, { status: durum });
}

export async function POST(
  request: Request,
  { params }: { params: { tagId: string } }
) {
  try {
    const admin = await yoneticiErisimi();

    if (!admin) {
      return hata("Bu işlem için yönetici girişi gerekiyor.", 401);
    }

    /*
      İptal/yenileme geri alınamaz bir yönetim işlemidir; hız sınırı
      arama ucundan çok daha dardır.
    */
    const siniri = await hizSiniriKontrol({
      kapsam: "admin-etiket-islem",
      tanimlayici: admin.userId,
      limit: 30,
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

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return hata("Geçersiz istek.", 400);
    }

    const islem = String((body as { islem?: unknown }).islem || "") as Islem;

    if (!GECERLI_ISLEMLER.includes(islem)) {
      return hata("Geçersiz işlem.", 400);
    }

    const tagId = String(params.tagId || "").trim();

    if (!tagId) {
      return hata("Etiket bulunamadı.", 404);
    }

    const etiket = await prisma.tag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        code: true,
        status: true,
        productKod: true,
        userId: true,
        itemRecordId: true,
        orderTag: { select: { reservationExpiresAt: true } },
      },
    });

    if (!etiket) {
      return hata("Etiket bulunamadı.", 404);
    }

    // Yazılı onay: yanlış etikette işlem yapılmasını engelleyen son kapı.
    if (!onayKoduDogru((body as { onayKodu?: unknown }).onayKodu, etiket.code)) {
      return hata(
        "Onay için etiket kodunu birebir yazmanız gerekiyor.",
        400
      );
    }

    const uygunluk = islemUygunlugu({
      durum: etiket.status,
      rezerveMi: rezervasyonGecerliMi(
        etiket.orderTag?.reservationExpiresAt ?? null
      ),
      productKod: etiket.productKod,
    });

    const izin = islem === "iptal" ? uygunluk.iptalEdilebilir : uygunluk.yenilenebilir;

    if (!izin) {
      return hata(uygunluk.sebep ?? "Bu etikette işlem yapılamaz.", 409);
    }

    const sonuc = await prisma.$transaction(async (islemci) => {
      /*
        KOŞULLU İPTAL — idempotency'nin tek gerçek garantisi.

        Koşul `status: { not: "revoked" }` içerir. İki eşzamanlı (veya
        tekrarlanan) istekten YALNIZCA BİRİ 1 satır günceller; ikincisi
        0 satır görür ve aşağıda erkenden çıkar. Böylece aynı etiket için
        ikinci bir yedek etiket üretilmesi imkânsızdır.
      */
      const iptal = await islemci.tag.updateMany({
        where: { id: etiket.id, status: { not: "revoked" } },
        data: {
          status: "revoked",
          revokedAt: new Date(),
          /*
            Sahiplik bağları koparılır: iptal edilen etiket artık bir
            kullanıcıya ve bir ürün kaydına ait değildir. Böylece kayıt
            yeni bir etiketle eşleştirilebilir (Tag.itemRecordId tekildir)
            ve eski QR sahibin verisine hiçbir yoldan bağlanamaz.
            Koparılan bağlar aşağıda TagEvent'e yazılır.
          */
          userId: null,
          itemRecordId: null,
        },
      });

      if (iptal.count !== 1) {
        return { tekrarEdildi: true as const };
      }

      await islemci.tagEvent.create({
        data: {
          tagId: etiket.id,
          type: "revoked",
          actorUserId: admin.userId,
          fromUserId: etiket.userId,
          fromItemRecordId: etiket.itemRecordId,
          fromProductKod: etiket.productKod,
          toProductKod: etiket.productKod,
        },
      });

      if (islem === "iptal") {
        return { tekrarEdildi: false as const, yeni: null };
      }

      /*
        YENİLEME — yeni kod, yeni QR hedefi, yeni aktivasyon kodu.

        `etiketUret()` üçünü birlikte üretir; veritabanına yalnızca
        `activationCodeHash` yazılır. Düz metin kod bu isteğin yanıtında
        BİR KEZ döner ve hiçbir yerde saklanmaz.
      */
      const uretilen = etiketUret();

      const yeniEtiket = await islemci.tag.create({
        data: {
          code: uretilen.code,
          publicToken: uretilen.publicToken,
          activationCodeHash: uretilen.activationCodeHash,
          status: "unused",
          // Ürün türü korunur: yedek etiket aynı fiziksel ürüne basılır.
          productKod: etiket.productKod,
        },
        select: { id: true, code: true },
      });

      await islemci.tagEvent.create({
        data: {
          tagId: yeniEtiket.id,
          type: "renewed",
          actorUserId: admin.userId,
          fromProductKod: etiket.productKod,
          toProductKod: etiket.productKod,
        },
      });

      return {
        tekrarEdildi: false as const,
        yeni: {
          id: yeniEtiket.id,
          code: uretilen.code,
          activationCode: uretilen.activationCode,
        },
      };
    });

    if (sonuc.tekrarEdildi) {
      // Tekrar gönderim: hiçbir şey değişmedi, yeni etiket üretilmedi.
      return NextResponse.json({
        success: true,
        tekrarEdildi: true,
        islem,
        kod: etiketKoduBicimle(etiket.code),
        yeni: null,
      });
    }

    return NextResponse.json({
      success: true,
      tekrarEdildi: false,
      islem,
      kod: etiketKoduBicimle(etiket.code),
      /*
        `activationCode` YALNIZCA BURADA, yalnızca bir kez döner.
        Yanıt kaybedilirse geri getirilemez; etiketin yeniden
        yenilenmesi gerekir.
      */
      yeni: sonuc.yeni
        ? {
            id: sonuc.yeni.id,
            kod: etiketKoduBicimle(sonuc.yeni.code),
            activationCode: sonuc.yeni.activationCode,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Etiket işlem hatası:",
      error instanceof Error ? error.name : "BilinmeyenHata"
    );

    return hata("İşlem tamamlanamadı.", 500);
  }
}
