"use client";

import Link from "next/link";
import DilSecici from "@/components/DilSecici";
import Logo from "@/components/Logo";
import { useDil, useSozluk } from "@/lib/i18n/istemci";

/**
 * Kullanıcı sayfaları için ortak üst bar.
 *
 * Ana sayfanın kendi zengin header'ı vardır ve DEĞİŞTİRİLMEZ; bu bar
 * yalnızca kendi header'ı olmayan sayfalara dil seçicisini ve ana sayfaya
 * dönüş bağlantısını getirir.
 *
 * İSTEMCİ BİLEŞENİDİR. Dil `next/headers` yerine kökteki `DilSaglayici`
 * bağlamından okunur; böylece hem sunucu hem de istemci sayfalarından
 * sorunsuz kullanılabilir.
 *
 * ROTA VE ADRES DEĞİŞMEZ: bar yalnızca görünümdür.
 *
 * KONUMLANDIRMA: bar `fixed`tir. Bazı sayfalarda `<main>` bir flex
 * kapsayıcıdır (`flex items-center justify-center`); akış içinde kalsaydı
 * satır öğesi olur ve daralırdı. `fixed` ile her sayfada tam genişlikte ve
 * üstte durur, sayfanın kendi yerleşimini etkilemez.
 */
export default function SayfaUstBari({
  ton = "acik",
}: {
  ton?: "acik" | "koyu";
}) {
  const ceviri = useSozluk();
  const dil = useDil();

  const kenarlik = ton === "koyu" ? "border-white/10" : "border-ark-line";

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-sm ${kenarlik} ${
        ton === "koyu" ? "bg-black/40" : "bg-white/80"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="inline-flex">
          {ton === "koyu" ? (
            <span className="text-sm font-semibold tracking-[0.18em] text-white">
              {ceviri.marka.ad}
            </span>
          ) : (
            <Logo yaziSinifi="text-sm sm:text-base" amblemYuksekligi={24} />
          )}
        </Link>

        <DilSecici aktif={dil} etiketler={ceviri.dil} ton={ton} />
      </div>
    </div>
  );
}
