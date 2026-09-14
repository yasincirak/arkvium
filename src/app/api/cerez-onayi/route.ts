import { NextResponse } from "next/server";
import {
  CEREZ_ONAY_COOKIE,
  onayCookieAyarlari,
  onayDegeriYaz,
  onayDurumuMu,
} from "@/lib/cerez-onayi";
import {
  ZIYARET_COOKIE,
  ZIYARETCI_COOKIE,
} from "@/lib/analitik-ziyaretci";

/**
 * Çerez tercihini kaydeder (herkese açık).
 *
 * NEDEN SUNUCU UCU: Reddetme kararı yalnızca tercihi yazmakla bitmez —
 * daha önce oluşmuş analitik çerezlerinin de SİLİNMESİ gerekir. Bu
 * çerezler `httpOnly` olduğu için sayfa betiği onları silemez; yalnızca
 * sunucu silebilir.
 *
 * Güvenlik:
 * - Gövdeden YALNIZCA "kabul" veya "red" kabul edilir; başka hiçbir alan
 *   okunmaz. Kişisel veri alınmaz ve hiçbir tabloya yazılmaz.
 * - Kayıt tamamen çerezdedir; veritabanına dokunulmaz.
 * - Hız sınırı uygulanmaz: tek bir çerez yazımıdır, veritabanı maliyeti
 *   yoktur ve engellenmesi kullanıcıyı tercihini değiştiremez hâle
 *   getirirdi.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const durum = body?.durum;

    if (!onayDurumuMu(durum)) {
      return NextResponse.json(
        { error: "Geçersiz tercih." },
        { status: 400 }
      );
    }

    const yanit = NextResponse.json({ success: true, durum });

    yanit.cookies.set(
      CEREZ_ONAY_COOKIE,
      onayDegeriYaz(durum),
      onayCookieAyarlari
    );

    if (durum === "red") {
      /*
        Reddetme GERİYE DÖNÜK çalışır: daha önce kabul edilmişse oluşan
        analitik çerezleri hemen silinir. Silinmezse kullanıcı reddetmiş
        olmasına rağmen tarayıcısında takip kimliği durmaya devam ederdi.

        Zaten yazılmış analitik satırları anonimdir ve kişiye
        bağlanamaz; saklama süresi dolduğunda kendiliğinden silinir
        (bkz. ANALITIK_SAKLAMA_GUNU).
      */
      yanit.cookies.delete(ZIYARETCI_COOKIE);
      yanit.cookies.delete(ZIYARET_COOKIE);
    }

    return yanit;
  } catch (hata) {
    console.error("Çerez tercihi kaydedilemedi:", (hata as Error)?.name);

    return NextResponse.json(
      { error: "İşlem tamamlanamadı." },
      { status: 500 }
    );
  }
}
