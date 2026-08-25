"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Mobil (md altı) gezinme menüsü.
 *
 * Masaüstü görünümü ETKİLENMEZ: bileşen `lg:hidden` ile yalnızca dar
 * ekranlarda görünür; masaüstündeki yatay menü olduğu gibi kalır.
 *
 * Erişilebilirlik:
 * - Hamburger butonunda `aria-label`, `aria-expanded` ve `aria-controls` var.
 * - Escape tuşu menüyü kapatır ve odağı butona geri verir.
 * - Bağlantıya basılınca menü kapanır (sayfa içi bölüme kayar).
 *
 * Dokunma alanı: buton en az 44×44 px, menü bağlantıları en az 44 px yüksek.
 */

type Baglanti = { href: string; metin: string };

export default function MobilMenu({ baglantilar }: { baglantilar: Baglanti[] }) {
  const [acik, setAcik] = useState(false);
  const panelId = useId();
  const dugmeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!acik) {
      return;
    }

    const tusaBasildi = (olay: KeyboardEvent) => {
      if (olay.key === "Escape") {
        setAcik(false);
        dugmeRef.current?.focus();
      }
    };

    window.addEventListener("keydown", tusaBasildi);

    return () => window.removeEventListener("keydown", tusaBasildi);
  }, [acik]);

  return (
    <div className="lg:hidden">
      <button
        ref={dugmeRef}
        type="button"
        onClick={() => setAcik((onceki) => !onceki)}
        aria-label={acik ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={acik}
        aria-controls={panelId}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#101a3d] transition hover:bg-slate-100"
      >
        {/* Basit çizgi ikon; ek ikon paketi kullanılmaz. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          {acik ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {acik && (
        <div
          id={panelId}
          className="absolute left-0 right-0 top-full border-b border-slate-200 bg-white shadow-sm"
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {baglantilar.map((baglanti) => (
              <a
                key={baglanti.href}
                href={baglanti.href}
                onClick={() => setAcik(false)}
                className="flex min-h-[44px] items-center rounded-lg px-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600"
              >
                {baglanti.metin}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
