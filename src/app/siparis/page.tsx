import Link from "next/link";
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

export default function SiparisPage({
  searchParams,
}: {
  searchParams: { urun?: string };
}) {
  const kod = String(searchParams?.urun ?? "").trim();
  const urun = SIPARIS_URUNLERI.find((u) => u.kod === kod);

  if (!urun) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f4ff] text-[#101a3d]">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link
          href="/#urunler"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Ürünlere Dön
        </Link>

        <h1 className="mt-4 text-3xl font-bold">{urun.ad}</h1>

        <p className="mt-3 leading-relaxed text-slate-600">{urun.aciklama}</p>

        <p className="mt-3 text-sm text-slate-500">
          Bu üründe {urun.qrAdedi} adet benzersiz QR etiketi bulunur. Ödeme
          kuruluşu iyzico üzerinden alınır; kart bilgileriniz ARKVIUM
          sunucusuna hiç gelmez.
        </p>

        <SiparisFormu
          urunKodu={urun.kod}
          urunAdi={urun.ad}
          fiyatKurus={urun.fiyatKurus}
          kargoKurus={KARGO_UCRETI_KURUS}
        />
      </div>
    </main>
  );
}
