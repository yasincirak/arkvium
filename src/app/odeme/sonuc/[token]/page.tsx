import type { Metadata } from "next";
import SayfaUstBari from "@/components/SayfaUstBari";
import { sozluk, type Sozluk } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fiyatBicimle } from "@/lib/siparis";

/**
 * Ödeme sonuç sayfası.
 *
 * YALNIZCA OKUR: hiçbir sipariş veya ödeme kaydını değiştirmez. Ödemenin
 * kesinleşmesi tamamen callback akışında, sağlayıcı doğrulamasıyla olur.
 *
 * Erişim siparişin kriptografik `publicToken` değeriyledir; oturum
 * gerekmez (misafir sipariş). Geçersiz token'da hiçbir bilgi sızdırmadan
 * 404 döner. Sayfada kart verisi, ödeme sağlayıcı token'ı veya anahtar
 * gösterilmez.
 */

type Props = {
  params: {
    token: string;
  };
};

export const metadata: Metadata = {
  title: "Ödeme Sonucu",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

type Gorunum = {
  ton: "basarili" | "uyari" | "notr";
  baslik: string;
  aciklama: string;
};

/** Sipariş durumundan kullanıcıya gösterilecek metni üretir. */
function gorunumSec(durum: string, ceviri: Sozluk): Gorunum {
  if (durum === "paid" || durum === "preparing" || durum === "shipped") {
    return {
      ton: "basarili",
      baslik: ceviri.odeme.basariBaslik,
      aciklama:
        ceviri.odeme.basariMetin,
    };
  }

  if (durum === "failed" || durum === "cancelled") {
    return {
      ton: "uyari",
      baslik: ceviri.odeme.hataBaslik,
      aciklama:
        ceviri.odeme.hataMetin,
    };
  }

  return {
    ton: "notr",
    baslik: ceviri.odeme.bekliyorBaslik,
    aciklama:
      ceviri.odeme.bekliyorMetin,
  };
}

export default async function OdemeSonucPage({ params }: Props) {
  const ceviri = sozluk();

  const siparis = await prisma.order.findUnique({
    where: { publicToken: params.token },
    select: {
      orderNumber: true,
      status: true,
      totalKurus: true,
      createdAt: true,
      items: {
        select: { productAdi: true, quantity: true, lineTotalKurus: true },
      },
    },
  });

  if (!siparis) {
    notFound();
  }

  const gorunum = gorunumSec(siparis.status, ceviri);

  const kutuSinifi =
    gorunum.ton === "basarili"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
      : gorunum.ton === "uyari"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
        : "border-white/10 bg-white/5 text-white/70";

  return (
    <main className="pt-20 min-h-screen bg-[#0a0a0f] px-4 py-12 text-white">
      <SayfaUstBari ton="acik" />

      <div className="mx-auto max-w-2xl">
        <div className={`rounded-2xl border p-8 ${kutuSinifi}`}>
          <h1 className="text-2xl font-bold">{gorunum.baslik}</h1>
          <p className="mt-4 leading-7">{gorunum.aciklama}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">{ceviri.odeme.ozet}</h2>

          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-white/40">{ceviri.odeme.numara}</p>
              <p className="mt-1 font-mono">{siparis.orderNumber}</p>
            </div>

            <div>
              <p className="text-white/40">{ceviri.odeme.tarih}</p>
              <p className="mt-1">
                {siparis.createdAt.toLocaleDateString("tr-TR")}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-sm">
            {siparis.items.map((kalem, sira) => (
              <div
                key={`${kalem.productAdi}-${sira}`}
                className="flex justify-between gap-4"
              >
                <span className="text-white/70">
                  {kalem.productAdi} × {kalem.quantity}
                </span>
                <span>{fiyatBicimle(kalem.lineTotalKurus)}</span>
              </div>
            ))}

            <div className="flex justify-between gap-4 border-t border-white/10 pt-3 font-semibold">
              <span>{ceviri.odeme.toplamKargoDahil}</span>
              <span>{fiyatBicimle(siparis.totalKurus)}</span>
            </div>
          </div>
        </div>

        {gorunum.ton === "basarili" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">{ceviri.odeme.siradakiAdim}</h2>

            <p className="mt-2 text-sm leading-6 text-white/60">{ceviri.kalanlar.siparisSonrasi}</p>

            <Link
              href="/account/tags/activate"
              className="mt-4 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
            >{ceviri.kalanlar.etiketiniEtkinlestir}</Link>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-white/40">{ceviri.qr.markaAlt}</p>
      </div>
    </main>
  );
}
