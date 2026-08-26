"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { dilSec } from "@/lib/i18n/dil-eylemi";
import { DESTEKLENEN_DILLER, type Dil } from "@/lib/i18n/diller";

/**
 * Dil seçici — TR / EN.
 *
 * SAYFA DEĞİŞMEZ: seçim bir çereze yazılır ve `router.refresh()` çağrılır.
 * Bu, sunucu bileşenlerini yerinde yeniden çizer; adres değişmez, sayfa
 * başa dönmez, kaydırma konumu korunur ve formlara yazılmış değerler
 * SİLİNMEZ (istemci bileşenlerinin durumu korunur).
 *
 * URL'ye `/tr` veya `/en` EKLENMEZ; basılmış QR etiketleri etkilenmez.
 *
 * Erişilebilirlik: seçici bir `radiogroup`tur, aktif dil `aria-checked` ile
 * bildirilir ve her düğmenin tam dil adını taşıyan bir etiketi vardır.
 * Klavyeyle sekme ve Enter/Boşluk ile kullanılabilir.
 */

type Props = {
  aktif: Dil;
  etiketler: {
    secici: string;
    aktif: string;
    turkce: string;
    ingilizce: string;
    turkceKisa: string;
    ingilizceKisa: string;
  };
  /** Koyu zeminde (hero, footer) kullanım için renk kümesi. */
  ton?: "acik" | "koyu";
  className?: string;
};

export default function DilSecici({
  aktif,
  etiketler,
  ton = "acik",
  className,
}: Props) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();

  const tamAd: Record<Dil, string> = {
    tr: etiketler.turkce,
    en: etiketler.ingilizce,
  };

  const kisaAd: Record<Dil, string> = {
    tr: etiketler.turkceKisa,
    en: etiketler.ingilizceKisa,
  };

  const kapsayici =
    ton === "koyu"
      ? "border-ark-line-dark bg-white/5"
      : "border-ark-line bg-ark-surface-2";

  function degistir(dil: Dil) {
    if (dil === aktif) {
      return;
    }

    basla(async () => {
      await dilSec(dil);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={etiketler.secici}
      className={`inline-flex items-center gap-0.5 rounded-xl border p-0.5 ${kapsayici} ${className ?? ""}`}
    >
      {DESTEKLENEN_DILLER.map((dil) => {
        const seciliMi = dil === aktif;

        const seciliSinif =
          ton === "koyu"
            ? "bg-white text-ark-ink"
            : "bg-ark-ink text-white";

        const pasifSinif =
          ton === "koyu"
            ? "text-ark-on-dark-2 hover:bg-white/10 hover:text-ark-on-dark"
            : "text-ark-ink-2 hover:bg-ark-surface hover:text-ark-ink";

        return (
          <button
            key={dil}
            type="button"
            role="radio"
            aria-checked={seciliMi}
            aria-label={`${tamAd[dil]}${seciliMi ? ` — ${etiketler.aktif}` : ""}`}
            disabled={bekliyor}
            onClick={() => degistir(dil)}
            className={`min-h-[44px] min-w-[44px] rounded-lg px-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent disabled:opacity-60 ${
              seciliMi ? seciliSinif : pasifSinif
            }`}
          >
            <span aria-hidden="true">{kisaAd[dil]}</span>
          </button>
        );
      })}
    </div>
  );
}
