import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/session";
import { hizSiniriKontrol } from "@/lib/rate-limit";
import { sifrelemeHazirMi } from "@/lib/acil-durum-sifreleme";
import {
  AcilDurumHatasi,
  profiliEtkinlestir,
  profiliKaydet,
  profiliSil,
  rizayiGeriCek,
} from "@/lib/acil-durum";

/**
 * Acil Durum Profili yönetimi (yalnızca kayıt sahibi).
 *
 * GÜVENLİK NOTLARI:
 * - Sahiplik `src/lib/acil-durum.ts` içinde veritabanı sorgusuyla zorlanır.
 * - Sağlık verisi ASLA URL'ye, sorgu dizesine veya log'a yazılmaz; yalnızca
 *   POST gövdesinde taşınır.
 * - Şifreleme anahtarı yoksa istek 503 ile REDDEDİLİR; korumasız yazma yapılmaz.
 * - Beklenmeyen hatalarda istemciye yalnızca genel mesaj döner.
 */

type Islem = "kaydet" | "etkinlestir" | "rizayi-geri-cek" | "sil";

const GECERLI_ISLEMLER: readonly Islem[] = [
  "kaydet",
  "etkinlestir",
  "rizayi-geri-cek",
  "sil",
];

export async function POST(
  request: Request,
  { params }: { params: { itemRecordId: string } }
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
      kapsam: "acil-durum-profili",
      tanimlayici: session.userId,
      limit: 40,
      pencereSaniye: 60 * 60,
    });

    if (!siniri.izinli) {
      return NextResponse.json(
        {
          error: `Çok fazla işlem yapıldı. Lütfen ${Math.ceil(
            siniri.bekleSaniye / 60
          )} dakika sonra tekrar deneyin.`,
        },
        { status: 429, headers: { "Retry-After": String(siniri.bekleSaniye) } }
      );
    }

    // Anahtar yapılandırılmamışsa veri düz metin yazılmasın diye durdurulur.
    if (!sifrelemeHazirMi()) {
      return NextResponse.json(
        {
          error:
            "Acil durum profili şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const islem = String((body as { islem?: unknown }).islem || "") as Islem;

    if (!GECERLI_ISLEMLER.includes(islem)) {
      return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
    }

    const ortak = {
      itemRecordId: params.itemRecordId,
      userId: session.userId,
    };

    if (islem === "kaydet") {
      const sonuc = await profiliKaydet({ ...ortak, veri: body as never });

      // İçerik değişince profil yayından kalkar; kullanıcı bunu açıkça görmeli.
      return NextResponse.json({
        success: true,
        message: sonuc.yayindanKaldirildi
          ? "Bilgiler kaydedildi. Kapsam değiştiği için profil yayından kaldırıldı; yeniden yayına almak için onayları tekrar vermeniz gerekir."
          : "Bilgiler kaydedildi. Profil yayına alınmadan QR sayfasında görünmez.",
      });
    }

    if (islem === "etkinlestir") {
      await profiliEtkinlestir({
        ...ortak,
        saglikVerisiOnayi: (body as { saglikVerisiOnayi?: unknown })
          .saglikVerisiOnayi === true,
        yakinBeyani:
          (body as { yakinBeyani?: unknown }).yakinBeyani === true,
      });

      return NextResponse.json({
        success: true,
        message: "Acil durum profili yayına alındı.",
      });
    }

    if (islem === "rizayi-geri-cek") {
      await rizayiGeriCek(ortak);

      return NextResponse.json({
        success: true,
        message:
          "Rıza geri çekildi. Bilgiler QR sayfasında artık görünmüyor.",
      });
    }

    await profiliSil(ortak);

    return NextResponse.json({
      success: true,
      message: "Acil durum profili ve tüm bilgileri silindi.",
    });
  } catch (error) {
    if (error instanceof AcilDurumHatasi) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Hassas veri sızmaması için yalnızca hata tipi loglanır.
    console.error(
      "Acil durum profili işlemi başarısız:",
      error instanceof Error ? error.name : "BilinmeyenHata"
    );

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
