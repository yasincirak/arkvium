"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IkonKalkan } from "@/components/gorsel/Ikonlar";
import { ArkviumTamLogo } from "@/components/Logo";
import {
  Gorsel,
  TemsiliRozet,
  type GorselAnahtari,
} from "@/components/gorsel/UrunGorselleri";

/**
 * Ana sayfa hero kaydırıcısı.
 *
 * ARKVIUM'un beş temel kullanım alanını sırayla anlatır; ilk slayt her
 * zaman Acil Durum Profili'dir.
 *
 * DAVRANIŞ
 * - 6 saniyede bir otomatik ilerler.
 * - Fare üzerine gelince ve dokunma sırasında otomatik geçiş DURUR.
 * - Ok düğmeleri, noktalar, klavye ok tuşları ve parmakla kaydırma çalışır.
 * - Her kullanıcı etkileşiminde sayaç sıfırlanır (etkin slayt değişince
 *   zamanlayıcı efekti yeniden kurulur).
 * - `prefers-reduced-motion: reduce` tercihinde otomatik geçiş HİÇ
 *   başlamaz; slaytlar yalnızca elle değiştirilir.
 *
 * YÜKSEKLİK
 * Tüm slaytlar aynı esnek satırda durur; kapsayıcı en uzun slaytın
 * yüksekliğini alır. Slayt değişince sayfa yüksekliği değişmez, içerik
 * sıçraması olmaz.
 */

type Dugme = { metin: string; href: string; tur: "birincil" | "ikincil" };

type Slayt = {
  kod: string;
  etiket: string;
  /**
   * Açılış slaytı: yalnızca ARKVIUM logosunu gösterir.
   * Başlık, açıklama, düğme veya ek metin TAŞIMAZ.
   */
  markaSlayti?: true;
  baslik?: string;
  metin?: string;
  gorsel?: GorselAnahtari;
  bilgiEtiketleri?: string[];
  dugmeler?: Dugme[];
  /** Sağlık verisi taşıyan slaytta zorunlu hukuki açıklama. */
  beyanUyarisi?: string;
};

const GECIS_SURESI = 6000;
const KAYDIRMA_ESIGI = 48;

/** Metinler sunucudaki sözlükten prop olarak gelir. */
export type HeroMetinleri = {
  oncekiSlayt: string;
  sonrakiSlayt: string;
  slaydiGoster: string;
  temsiliGorsel: string;
  slaytlar: Slayt[];
};

export default function HeroKaydirici({
  metinler,
}: {
  metinler: HeroMetinleri;
}) {
  const SLAYTLAR = metinler.slaytlar;
  const slaytSayisi = SLAYTLAR.length;

  /** `h1` ve öncelikli görsel, marka slaytından sonraki ilk içerik slaytındadır. */
  const ANA_BASLIK_SIRASI = SLAYTLAR.findIndex((slayt) => !slayt.markaSlayti);

  const [etkin, setEtkin] = useState(0);
  const [duraklat, setDuraklat] = useState(false);
  const [azaltilmisHareket, setAzaltilmisHareket] = useState(false);
  const dokunusBaslangici = useRef<number | null>(null);

  const git = useCallback(
    (hedef: number) => {
      setEtkin((hedef + slaytSayisi) % slaytSayisi);
    },
    [slaytSayisi]
  );

  // Hareket azaltma tercihi: otomatik geçiş hiç başlamaz.
  useEffect(() => {
    const sorgu = window.matchMedia("(prefers-reduced-motion: reduce)");

    setAzaltilmisHareket(sorgu.matches);

    const dinleyici = (olay: MediaQueryListEvent) =>
      setAzaltilmisHareket(olay.matches);

    sorgu.addEventListener("change", dinleyici);

    return () => sorgu.removeEventListener("change", dinleyici);
  }, []);

  /**
   * Otomatik ilerleme.
   *
   * `etkin` bağımlılıkta olduğu için kullanıcı ok, nokta veya kaydırmayla
   * slaytı değiştirdiğinde efekt yeniden kurulur — yani SAYAÇ SIFIRLANIR.
   */
  useEffect(() => {
    if (azaltilmisHareket || duraklat) {
      return;
    }

    const zamanlayici = window.setTimeout(() => {
      setEtkin((mevcut) => (mevcut + 1) % slaytSayisi);
    }, GECIS_SURESI);

    return () => window.clearTimeout(zamanlayici);
  }, [etkin, duraklat, azaltilmisHareket, slaytSayisi]);

  return (
    <section
      aria-labelledby="hero-basligi"
      aria-roledescription="karusel"
      className="relative overflow-hidden bg-ark-surface-dark"
      onMouseEnter={() => setDuraklat(true)}
      onMouseLeave={() => setDuraklat(false)}
      onTouchStart={(olay) => {
        setDuraklat(true);
        dokunusBaslangici.current = olay.touches[0].clientX;
      }}
      onTouchEnd={(olay) => {
        const baslangic = dokunusBaslangici.current;

        dokunusBaslangici.current = null;
        setDuraklat(false);

        if (baslangic === null) {
          return;
        }

        const fark = olay.changedTouches[0].clientX - baslangic;

        if (Math.abs(fark) < KAYDIRMA_ESIGI) {
          return;
        }

        // Sola kaydırma sonraki slaydı getirir.
        git(fark < 0 ? etkin + 1 : etkin - 1);
      }}
      onKeyDown={(olay) => {
        if (olay.key === "ArrowLeft") {
          olay.preventDefault();
          git(etkin - 1);
        }
        if (olay.key === "ArrowRight") {
          olay.preventDefault();
          git(etkin + 1);
        }
      }}
    >
      {/* Zemin derinliği — dekoratif, metin taşımaz, kontrastı düşürmez. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_85%_0%,transparent_35%,var(--ark-ink-deep)_100%)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-12 lg:pt-14">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${etkin * 100}%)` }}
          >
            {SLAYTLAR.map((slayt, sira) => {
              const gizli = sira !== etkin;

              return (
                <div
                  key={slayt.kod}
                  aria-hidden={gizli}
                  className="w-full shrink-0"
                >
                  {slayt.markaSlayti ? (
                    /*
                      Açılış slaytı — resmî tam logo.

                      Logo siyah-beyaz bir dosyadır; okunabilirliği için
                      BEYAZ zemin üzerinde durur. Dosya, biçim, oran ve
                      renkler DEĞİŞTİRİLMEZ; kırpma, filtre veya yeniden
                      çizim uygulanmaz — yalnızca ölçeklenir.

                      Slayt, kardeşleriyle aynı esnek satırdadır; `h-full`
                      ile aynı yüksekliği alır ve logo dikeyde ortalanır.
                    */
                    <div className="h-full">
                      {/*
                        Beyaz panel slaydın TAMAMINI kaplar (`h-full`).
                        Aksi hâlde panel, en uzun slaytın yüksekliğine göre
                        ortalanıp üstünde ve altında büyük boş lacivert alan
                        bırakıyordu — özellikle mobilde.
                      */}
                      <div className="flex h-full w-full items-center justify-center rounded-3xl bg-white px-6 py-14 shadow-ark-3 sm:px-10">
                        <ArkviumTamLogo
                          genislik={640}
                          className="h-auto w-[210px] sm:w-[300px] lg:w-[380px]"
                        />
                      </div>
                    </div>
                  ) : (
                  <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
                    {/*
                      Metin KAYNAK sırasında önce gelir (ekran okuyucu ve
                      `h1` sırası için), ama mobilde `order` ile görselin
                      ALTINA alınır: dar ekranda önce sahne görünür, sonra
                      başlık ve düğmeler okunur. Masaüstünde metin yine
                      solda kalır.
                    */}
                    <div className="order-2 lg:order-1 lg:col-span-6">
                      <p className="ark-etiket text-ark-accent-on-dark">
                        {slayt.etiket}
                      </p>

                      {sira === ANA_BASLIK_SIRASI ? (
                        <h1
                          id="hero-basligi"
                          className="ark-display mt-4 text-balance text-ark-on-dark"
                        >
                          {slayt.baslik}
                        </h1>
                      ) : (
                        <p className="ark-display mt-4 text-balance text-ark-on-dark">
                          {slayt.baslik}
                        </p>
                      )}

                      <p className="ark-giris ark-olcu mt-5 text-ark-on-dark-2">
                        {slayt.metin}
                      </p>

                      {slayt.bilgiEtiketleri && (
                        <ul className="mt-6 flex flex-wrap gap-2">
                          {slayt.bilgiEtiketleri.map((bilgi) => (
                            <li
                              key={bilgi}
                              className="rounded-full border border-ark-line-dark bg-white/5 px-3.5 py-1.5 text-sm text-ark-on-dark"
                            >
                              {bilgi}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-8 flex flex-wrap gap-3">
                        {slayt.dugmeler?.map((dugme) => (
                          <Link
                            key={dugme.href}
                            href={dugme.href}
                            tabIndex={gizli ? -1 : undefined}
                            onClick={() => setDuraklat(false)}
                            className={
                              dugme.tur === "birincil"
                                ? "inline-flex min-h-[44px] items-center rounded-xl bg-white px-6 py-3.5 font-semibold text-ark-ink transition duration-200 hover:bg-ark-on-dark-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent-on-dark active:scale-[0.98] motion-reduce:active:scale-100"
                                : "inline-flex min-h-[44px] items-center rounded-xl border border-ark-line-dark px-6 py-3.5 font-semibold text-ark-on-dark transition duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent-on-dark"
                            }
                          >
                            {dugme.metin}
                          </Link>
                        ))}
                      </div>

                      {slayt.beyanUyarisi && (
                        <p className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed text-ark-on-dark-2">
                          <span
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-ark-accent-on-dark"
                          >
                            <IkonKalkan />
                          </span>
                          {slayt.beyanUyarisi}
                        </p>
                      )}
                    </div>

                    <div className="order-1 lg:order-2 lg:col-span-6">
                      {/*
                        Kadraj `UrunGorselleri` içindeki `konum` değeriyle
                        ayarlanır; acil durum görselinde QR okutma anı hem
                        4:3 (mobil) hem 5:4 (masaüstü) kırpmada çerçevede
                        kalır. "Temsili görsel" ibaresi sağ altta durur.
                      */}
                      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-ark-line-dark shadow-ark-3 sm:aspect-[5/4]">
                        <Gorsel
                          anahtar={slayt.gorsel!}
                          oncelikli={sira === ANA_BASLIK_SIRASI}
                          sizes="(min-width: 1024px) 560px, 92vw"
                        />
                        <TemsiliRozet metin={metinler.temsiliGorsel} />
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kontroller: oklar solda, noktalar ortada — hepsi 44px hedefli. */}
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-ark-line-dark pt-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => git(etkin - 1)}
              aria-label={metinler.oncekiSlayt}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ark-line-dark text-ark-on-dark transition duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent-on-dark"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ‹
              </span>
            </button>

            <button
              type="button"
              onClick={() => git(etkin + 1)}
              aria-label={metinler.sonrakiSlayt}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ark-line-dark text-ark-on-dark transition duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent-on-dark"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ›
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {SLAYTLAR.map((slayt, sira) => (
              <button
                key={slayt.kod}
                type="button"
                onClick={() => git(sira)}
                aria-label={`${slayt.etiket} — ${metinler.slaydiGoster}`}
                aria-current={sira === etkin}
                className="inline-flex h-11 w-8 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent-on-dark"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full transition-all duration-200 ${
                    sira === etkin
                      ? "w-7 bg-white"
                      : "w-1.5 bg-white/35"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
