"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Sayfanın başına dön" düğmesi.
 *
 * Ortak layout'a BİR KEZ eklenir; sayfalara tek tek kopyalanmaz.
 *
 * ────────────────────────────────────────────────────────────
 * KONUM — SABİT ÖĞELERLE ÇAKIŞMAZ
 *
 * Sayfada üç sabit öğe var:
 *   • WhatsApp düğmesi — sağ altta, `z-10`, 52px (mobil) / 56px (sm+)
 *   • Çerez bildirimi  — alt kenarda tam genişlikte, `z-50`
 *   • Üst bar          — üstte
 *
 * Bu düğme WhatsApp düğmesinin TAM ÜSTÜNE, 12px boşlukla oturur:
 * mobilde 16+52+12 = 80px, `sm`de 24+56+12 = 92px. `env(safe-area-inset-bottom)`
 * korunur, böylece çentikli telefonlarda alt çubuğun altında kalmaz.
 *
 * `z-10` seçildi (WhatsApp düğmesiyle aynı): çerez bildirimi `z-50`
 * olduğu için panel açıkken düğmenin ÜSTÜNÜ ÖRTER; düğme panelin üstüne
 * binmez ve görsel bir çakışma oluşmaz. Bu, WhatsApp düğmesinin da
 * mevcut davranışıdır.
 * ────────────────────────────────────────────────────────────
 *
 * ERİŞİLEBİLİRLİK
 * - Gerçek `<button>`: klavyeyle odaklanılır, Enter/Space ile çalışır.
 * - `aria-label` ile amacı bildirilir; ok simgesi `aria-hidden`.
 * - Görünmezken `pointer-events-none` VE `tabIndex={-1}`: sayfanın
 *   üstündeyken sekme sırasına girmez.
 * - Hareket azaltma tercihinde yumuşak kaydırma KAPANIR, anında gider.
 */

/** Bu eşiği geçince düğme görünür (piksel). */
const ESIK = 400;

export default function YukariCikButonu() {
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    /*
      Kaydırma olayı `passive` dinlenir ve durum DOĞRUDAN güncellenir.

      `requestAnimationFrame` ile kısmak cazip görünüyor ama gereksiz ve
      kırılgan: rAF sayfa çizilmediğinde (arka plan sekmesi, gizli
      pencere) DURUR ve düğme yanlış durumda takılı kalır. Buradaki iş
      zaten tek bir karşılaştırma; React aynı boole değerinde yeniden
      render ETMEZ, dolayısıyla kısmaya gerek yoktur.
    */
    /*
      Kaydırma olayı `passive` dinlenir ve durum DOĞRUDAN güncellenir.
      İş tek bir karşılaştırma; React aynı boole değerinde yeniden
      render etmez, dolayısıyla kısmaya gerek yoktur.

      `requestAnimationFrame` ile kısmak kırılgandır: sayfa çizilmediğinde
      (arka plan sekmesi) rAF durur ve düğme yanlış durumda takılı kalır.
    */
    const olcum = () => setGorunur(window.scrollY > ESIK);

    // İlk durum: sayfa kaydırılmış olarak açılmış olabilir (çıpa, geri tuşu).
    olcum();

    window.addEventListener("scroll", olcum, { passive: true });

    return () => window.removeEventListener("scroll", olcum);
  }, []);

  const basaDon = useCallback(() => {
    const azaltilmisHareket = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: azaltilmisHareket ? "auto" : "smooth",
    });
  }, []);

  /*
    Düğme HER ZAMAN render edilir; görünürlük opaklıkla değişir. Böylece
    yumuşak bir geçiş olur ve sunucu çıktısı ile ilk istemci render'ı
    aynı kalır (hidrasyon uyuşmazlığı olmaz).
  */
  return (
    <button
      type="button"
      onClick={basaDon}
      aria-label="Sayfanın başına dön"
      aria-hidden={!gorunur}
      tabIndex={gorunur ? 0 : -1}
      className={`fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-10 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-ark-line-dark bg-ark-ink text-white shadow-ark-2 transition duration-200 hover:bg-ark-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent motion-reduce:transition-none sm:bottom-[92px] sm:right-6 sm:h-14 sm:w-14 ${
        gorunur
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    >
      {/* Tek ve anlaşılır bir yukarı ok; başka simge veya metin yok. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
