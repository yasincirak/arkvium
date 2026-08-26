import type { Metadata } from "next";
import SayfaUstBari from "@/components/SayfaUstBari";
import { sozluk } from "@/lib/i18n";
import Link from "next/link";
import { GIZLI_SAYFA_ROBOTS } from "@/lib/seo";
import { notFound } from "next/navigation";
import SiparisFormu from "@/components/SiparisFormu";
import { KARGO_UCRETI_KURUS, SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Sipariş sayfası (herkese açık).
 *
 * Ürün, adres satırındaki `?urun=` koduyla belirlenir ve YALNIZCA sunucudaki
 * ürün kataloğundan doğrulanır; bilinmeyen kod 404 verir. Fiyat adresten
 * veya istemciden hiçbir şekilde alınmaz.
 *
 * Oturum GEREKTİRMEZ: misafir sipariş desteklenir.
 */

export const dynamic = "force-dynamic";

/** Bu sayfa indekslenmez. */
export const metadata: Metadata = {
  robots: GIZLI_SAYFA_ROBOTS,
};

export default function SiparisPage({
  searchParams,
}: {
  searchParams: { urun?: string };
}) {
  const ceviri = sozluk();

  const kod = String(searchParams?.urun ?? "").trim();
  const urun = SIPARIS_URUNLERI.find((u) => u.kod === kod);

  if (!urun) {
    notFound();
  }

  /**
   * Ürün adı ve açıklaması SEÇİLEN DİLDE gösterilir.
   *
   * Fiyat, ürün kodu ve sipariş hesaplaması `@/lib/siparis` içindeki tek
   * kaynaktan gelmeye devam eder — burada YALNIZCA görünen metin çevrilir.
   * Sözlükte karşılığı yoksa katalogdaki Türkçe metin kullanılır.
   */
  const URUN_ANAHTARI: Record<string, keyof typeof ceviri.urunler.ad> = {
    "sticker-seti": "stickerSeti",
    "arac-stickeri": "aracStickeri",
    "metal-anahtarlik": "metalAnahtarlik",
    "evcil-hayvan-kunyesi": "evcilHayvanKunyesi",
    "valiz-etiketi": "valizEtiketi",
  };

  const anahtar = URUN_ANAHTARI[urun.kod];
  const urunAdi = anahtar ? ceviri.urunler.ad[anahtar] : urun.ad;
  const urunAciklamasi = anahtar
    ? ceviri.urunler.aciklama[anahtar]
    : urun.aciklama;

  return (
    <main className="pt-20 min-h-screen bg-[#f6f4ff] text-[#101a3d]">
      <SayfaUstBari ton="acik" />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link
          href="/#urunler"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          {ceviri.kalanlar.urunlereDon}
        </Link>

        <h1 className="mt-4 text-3xl font-bold">{urunAdi}</h1>

        <p className="mt-3 leading-relaxed text-slate-600">{urunAciklamasi}</p>

        <p className="mt-3 text-sm text-slate-500">
          {ceviri.kalanlar.siparisQrNotu.replace(
            "{n}",
            String(urun.qrAdedi)
          )}
        </p>

        <SiparisFormu
          urunKodu={urun.kod}
          urunAdi={urunAdi}
          fiyatKurus={urun.fiyatKurus}
          kargoKurus={KARGO_UCRETI_KURUS}
        />
      </div>
    </main>
  );
}
