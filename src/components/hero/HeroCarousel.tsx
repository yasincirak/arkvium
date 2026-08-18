"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AraclarIllustrasyonu,
  EsyalarIllustrasyonu,
  EvcilHayvanlarIllustrasyonu,
  GuvenliIletisimIllustrasyonu,
} from "./illustrasyonlar";

/**
 * Ana sayfa hero carousel'i.
 *
 * ARKVIUM'un dört kullanım alanını sırayla gösterir. Sipariş ve etkinleştirme
 * düğmeleri slayttan bağımsızdır: hangi slayt açık olursa olsun ziyaretçi
 * aynı iki adımı görür.
 *
 * Erişilebilirlik: ok düğmeleri, gösterge noktaları, sol/sağ ok tuşları ve
 * `prefers-reduced-motion` desteği vardır. Hareketi azaltılmış kullanıcıda
 * otomatik geçiş hiç başlamaz; slaytlar yalnızca elle değiştirilir.
 */

const SLAYTLAR = [
  {
    kod: "esyalar",
    baslik: "Eşyalar",
    aciklama: "Değer verdiklerin sana geri dönebilsin.",
    Illustrasyon: EsyalarIllustrasyonu,
  },
  {
    kod: "araclar",
    baslik: "Araçlar",
    aciklama: "Aracına dokunmadan sana güvenle ulaşsınlar.",
    Illustrasyon: AraclarIllustrasyonu,
  },
  {
    kod: "evcil-hayvanlar",
    baslik: "Evcil Hayvanlar",
    aciklama: "Kaybolduğunda bulan kişi sana güvenle ulaşsın.",
    Illustrasyon: EvcilHayvanlarIllustrasyonu,
  },
  {
    kod: "guvenli-iletisim",
    baslik: "Güvenli İletişim",
    aciklama: "Telefon numaran görünmeden mesaj al.",
    Illustrasyon: GuvenliIletisimIllustrasyonu,
  },
];

const GECIS_SURESI = 6000;

export default function HeroCarousel() {
  const [etkin, setEtkin] = useState(0);
  const [azaltilmisHareket, setAzaltilmisHareket] = useState(false);
  const [duraklatildi, setDuraklatildi] = useState(false);
  const noktaRefleri = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const sorgu = window.matchMedia("(prefers-reduced-motion: reduce)");

    setAzaltilmisHareket(sorgu.matches);

    const dinleyici = (olay: MediaQueryListEvent) =>
      setAzaltilmisHareket(olay.matches);

    sorgu.addEventListener("change", dinleyici);

    return () => sorgu.removeEventListener("change", dinleyici);
  }, []);

  useEffect(() => {
    if (azaltilmisHareket || duraklatildi) {
      return;
    }

    const sayac = window.setInterval(
      () => setEtkin((onceki) => (onceki + 1) % SLAYTLAR.length),
      GECIS_SURESI
    );

    return () => window.clearInterval(sayac);
  }, [azaltilmisHareket, duraklatildi]);

  const git = useCallback((yon: number) => {
    setEtkin(
      (onceki) => (onceki + yon + SLAYTLAR.length) % SLAYTLAR.length
    );
  }, []);

  function tusaBasildi(olay: React.KeyboardEvent<HTMLDivElement>) {
    if (olay.key === "ArrowLeft") {
      olay.preventDefault();
      git(-1);
    } else if (olay.key === "ArrowRight") {
      olay.preventDefault();
      git(1);
    }
  }

  const gecis = azaltilmisHareket
    ? "opacity-100"
    : "transition-opacity duration-700";

  return (
    <section className="relative overflow-hidden px-6 py-12 sm:py-20">
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="ARKVIUM kullanım alanları"
        tabIndex={0}
        onKeyDown={tusaBasildi}
        onMouseEnter={() => setDuraklatildi(true)}
        onMouseLeave={() => setDuraklatildi(false)}
        onFocus={() => setDuraklatildi(true)}
        onBlur={() => setDuraklatildi(false)}
        className="relative mx-auto max-w-6xl rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
      >
        <div className="relative">
          {SLAYTLAR.map((slayt, sira) => {
            const acikMi = sira === etkin;
            const { Illustrasyon } = slayt;
            // Sayfada tek bir h1 kalsın: gizli slaytların başlığı p olarak
            // işlenir, görünüm aynı sınıflarla korunur.
            const Baslik = acikMi ? "h1" : "p";

            return (
              <div
                key={slayt.kod}
                role="group"
                aria-roledescription="slayt"
                aria-label={`${sira + 1} / ${SLAYTLAR.length}: ${slayt.baslik}`}
                aria-hidden={!acikMi}
                className={`${
                  acikMi
                    ? "relative opacity-100"
                    : "pointer-events-none absolute inset-0 opacity-0"
                } ${gecis} grid items-center gap-8 md:grid-cols-2 md:gap-10`}
              >
                <div className="text-center md:text-left">
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                    {slayt.baslik}
                  </div>

                  <Baslik className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                    {slayt.aciklama}
                  </Baslik>

                  <p className="mt-6 max-w-xl text-lg text-slate-600 md:mx-0">
                    ARKVIUM, eşyalarına QR kodlu dijital kimlik kazandırır.
                    Bulan kişi QR kodu okutur ve kişisel bilgilerin korunurken
                    sana güvenli şekilde ulaşır.
                  </p>

                  <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row md:justify-start">
                    <a
                      href="#urunler"
                      tabIndex={acikMi ? undefined : -1}
                      className="rounded-xl bg-[#101a3d] px-8 py-4 font-semibold text-white transition hover:bg-[#1b2a5c]"
                    >
                      Ürünleri İncele
                    </a>

                    <a
                      href="/account/tags/activate"
                      tabIndex={acikMi ? undefined : -1}
                      className="rounded-xl border border-indigo-200 bg-white px-8 py-4 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                    >
                      Etiketini Etkinleştir
                    </a>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-md rounded-3xl border border-[#e5e0ff] bg-gradient-to-br from-[#f6f4ff] to-white p-6">
                  <div className="aspect-[4/3]">
                    <Illustrasyon />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => git(-1)}
            aria-label="Önceki slayt"
            className="rounded-full border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-[#101a3d]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 stroke-current"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            {SLAYTLAR.map((slayt, sira) => (
              <button
                key={slayt.kod}
                type="button"
                ref={(dugme) => {
                  noktaRefleri.current[sira] = dugme;
                }}
                onClick={() => setEtkin(sira)}
                aria-label={`${slayt.baslik} slaytına git`}
                aria-current={sira === etkin}
                className={`h-2.5 rounded-full transition-all ${
                  sira === etkin
                    ? "w-8 bg-indigo-600"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => git(1)}
            aria-label="Sonraki slayt"
            className="rounded-full border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-50 hover:text-[#101a3d]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 stroke-current"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
