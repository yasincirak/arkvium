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
 * ARKVIUM'un beş kullanım sahnesini sırayla anlatır.
 *
 * RENK DÜZENİ: beyaz zemin, koyu başlık, zümrüt vurgu ve düğme.
 * Beş slayt da AYNI sistemi kullanır; bu renkler yalnızca buradadır.
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
  /** Başlık içinde zümrüt yeşiliyle vurgulanacak alt dize. */
  vurgu?: string;
  metin?: string;
  gorsel?: GorselAnahtari;
  bilgiEtiketleri?: string[];
  dugmeler?: Dugme[];
  /** Sağlık verisi taşıyan slaytta zorunlu hukuki açıklama. */
  beyanUyarisi?: string;
  /**
   * Acil durum slaytı: rozetin başına küçük bir nokta konur.
   * Renk düzeni beş slaytta AYNIDIR (beyaz / koyu / zümrüt).
   */
  acilDurum?: true;
};

/*
  SLIDER'A ÖZEL RENK DÜZENİ.

  Bu değerler YALNIZCA kaydırıcıda kullanılır; `globals.css`
  içindeki genel `--ark-*` paletine dokunulmaz. Bu yüzden Tailwind
  tokenı değil, doğrudan değer olarak yazılırlar.
*/
const BASLIK_RENGI = "#132238";
const VURGU_RENGI = "#0E8A68";
const METIN_RENGI = "#263238";

/*
  ACİL DURUM RENK DÜZENİ.

  YALNIZCA `acilDurum: true` taşıyan slaytlarda (kask ve araç kazası)
  zümrüt vurgunun yerini alır. Diğer dört slayt (çanta, valiz,
  anahtarlık, künye) zümrüt düzeni AYNEN korur.

  Başlık ve açıklama renkleri iki düzende de aynıdır; değişen yalnızca
  VURGU: rozet, başlığın vurgulanan bölümü ve birincil düğme.
*/
const ACIL_ROZET_ZEMIN = "#FEF2F2";
const ACIL_ROZET_YAZI = "#B91C1C";
const ACIL_VURGU_RENGI = "#DC2626";

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

/**
 * Başlığı, `vurgu` alt dizesini vurgu rengiyle ayırarak basar.
 *
 * Vurgu rengi slayta göre gelir: normal slaytlarda zümrüt, acil durum
 * slaytlarında kırmızı. Başlığın geri kalanı her iki durumda da
 * `BASLIK_RENGI` ile kalır.
 *
 * Vurgu bulunamazsa başlık olduğu gibi yazılır — metin ASLA kaybolmaz.
 */
function VurguluBaslik({
  baslik,
  vurgu,
  renk,
}: {
  baslik: string;
  vurgu?: string;
  renk: string;
}) {
  const sira = vurgu ? baslik.indexOf(vurgu) : -1;

  if (sira === -1 || !vurgu) {
    return <>{baslik}</>;
  }

  return (
    <>
      {baslik.slice(0, sira)}
      <span style={{ color: renk }}>{vurgu}</span>
      {baslik.slice(sira + vurgu.length)}
    </>
  );
}

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
  /*
    Sekme görünür değilken zamanlayıcı KURULMAZ. Arka plandaki sekmede
    slayt ilerletmenin bir faydası yok; kullanıcı geri döndüğünde
    sayaç baştan başlar.
  */
  const [gizliSekme, setGizliSekme] = useState(false);
  const dokunusBaslangici = useRef<number | null>(null);

  const git = useCallback(
    (hedef: number) => {
      setEtkin((hedef + slaytSayisi) % slaytSayisi);
    },
    [slaytSayisi]
  );

  useEffect(() => {
    const olcum = () => setGizliSekme(document.visibilityState === "hidden");

    olcum();
    document.addEventListener("visibilitychange", olcum);

    return () => document.removeEventListener("visibilitychange", olcum);
  }, []);

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
    if (azaltilmisHareket || duraklat || gizliSekme) {
      return;
    }

    const zamanlayici = window.setTimeout(() => {
      setEtkin((mevcut) => (mevcut + 1) % slaytSayisi);
    }, GECIS_SURESI);

    return () => window.clearTimeout(zamanlayici);
  }, [etkin, duraklat, azaltilmisHareket, gizliSekme, slaytSayisi]);

  return (
    <section
      aria-labelledby="hero-basligi"
      aria-roledescription="karusel"
      className="relative overflow-hidden bg-white"
      onMouseEnter={() => setDuraklat(true)}
      onMouseLeave={() => setDuraklat(false)}
      onFocusCapture={() => setDuraklat(true)}
      onBlurCapture={() => setDuraklat(false)}
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
      {/*
        TAM GENİŞLİK HERO.

        Önceden `max-w-6xl` ile ~1152px'e sıkışıyor ve kenarlarda boşluk
        bırakarak KART gibi duruyordu. Artık bölüm ekranın kullanılabilir
        genişliğini kaplar; içerik yalnızca çok geniş ekranlarda
        okunabilirlik için `2xl:max-w-[1600px]` ile sınırlanır.
      */}
      <div className="relative mx-auto w-full px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12 lg:px-12 lg:pb-16 lg:pt-16 2xl:max-w-[1600px]">
        <div className="overflow-hidden">
          <div
            className={
              "flex transition-transform duration-500 ease-out motion-reduce:transition-none"
            }
            style={
              { transform: `translateX(-${etkin * 100}%)` }
            }
          >
            {SLAYTLAR.map((slayt, sira) => {
              const gizli = sira !== etkin;

              /*
                Acil durum slaytlarında (kask, araç kazası) vurgu rengi
                kırmızıdır; diğer dört slaytta zümrüt kalır. Tek yerden
                türetilir ki rozet, başlık vurgusu ve düğme ASLA
                birbirinden ayrışmasın.
              */
              const acil = slayt.acilDurum === true;
              const vurguRengi = acil ? ACIL_VURGU_RENGI : VURGU_RENGI;

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
                  <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-16">
                    {/*
                      Metin KAYNAK sırasında önce gelir (ekran okuyucu ve
                      `h1` sırası için), ama mobilde `order` ile görselin
                      ALTINA alınır: dar ekranda önce sahne görünür, sonra
                      başlık ve düğmeler okunur. Masaüstünde metin yine
                      solda kalır.
                    */}
                    <div className="order-2 lg:order-1 lg:col-span-5">
                      {/*
                        ROZET — iki renk düzeni, tek biçim.

                        Normal slaytlar: açık zümrüt zemin + koyu zümrüt
                        metin. Acil durum slaytları: açık kırmızı zemin
                        (#FEF2F2) + koyu kırmızı metin ve nokta (#B91C1C).
                        Ölçüler, yuvarlaklık ve tipografi AYNI kalır.
                      */}
                      <p
                        className={`ark-etiket inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 ${
                          acil ? "" : "bg-[#0E8A68]/10"
                        }`}
                        style={
                          acil
                            ? {
                                backgroundColor: ACIL_ROZET_ZEMIN,
                                color: ACIL_ROZET_YAZI,
                              }
                            : { color: VURGU_RENGI }
                        }
                      >
                        {slayt.acilDurum && (
                          <span
                            aria-hidden="true"
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: acil
                                ? ACIL_ROZET_YAZI
                                : VURGU_RENGI,
                            }}
                          />
                        )}
                        {slayt.etiket}
                      </p>

                      {sira === ANA_BASLIK_SIRASI ? (
                        <h1
                          id="hero-basligi"
                          className="ark-display mt-4 text-balance"
                          style={{ color: BASLIK_RENGI }}
                        >
                          <VurguluBaslik
                            baslik={slayt.baslik ?? ""}
                            vurgu={slayt.vurgu}
                            renk={vurguRengi}
                          />
                        </h1>
                      ) : (
                        <p
                          className="ark-display mt-4 text-balance"
                          style={{ color: BASLIK_RENGI }}
                        >
                          <VurguluBaslik
                            baslik={slayt.baslik ?? ""}
                            vurgu={slayt.vurgu}
                            renk={vurguRengi}
                          />
                        </p>
                      )}

                      <p
                        className="ark-giris ark-olcu mt-5"
                        style={{ color: METIN_RENGI }}
                      >
                        {slayt.metin}
                      </p>

                      {slayt.bilgiEtiketleri && (
                        <ul className="mt-6 flex flex-wrap gap-2">
                          {slayt.bilgiEtiketleri.map((bilgi) => (
                            <li
                              key={bilgi}
                              className="rounded-full border border-black/10 bg-black/[0.03] px-3.5 py-1.5 text-sm"
                              style={{ color: METIN_RENGI }}
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
                            /*
                              BİRİNCİL DÜĞME.

                              Acil durum slaytlarında zemin ve `hover`
                              rengi SINIFLA verilir (`bg-[#DC2626]` /
                              `hover:bg-[#B91C1C]`), satır içi `style`
                              ile DEĞİL: satır içi arka plan `hover`
                              kuralını her zaman yener ve fare üzerine
                              gelince renk değişmezdi.

                              Zümrüt düğme mevcut davranışını
                              (`hover:brightness-95` + satır içi zemin)
                              olduğu gibi korur.
                            */
                            className={
                              dugme.tur === "birincil"
                                ? `inline-flex min-h-[44px] items-center rounded-xl px-6 py-3.5 font-semibold text-white transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] motion-reduce:active:scale-100 ${
                                    acil
                                      ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                                      : "hover:brightness-95"
                                  }`
                                : "inline-flex min-h-[44px] items-center rounded-xl border px-6 py-3.5 font-semibold transition duration-200 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                            }
                            style={
                              dugme.tur === "birincil"
                                ? {
                                    /* Kırmızı zemin sınıftan gelir. */
                                    backgroundColor: acil
                                      ? undefined
                                      : VURGU_RENGI,
                                    outlineColor: BASLIK_RENGI,
                                  }
                                : {
                                    color: BASLIK_RENGI,
                                    borderColor: `${BASLIK_RENGI}33`,
                                    outlineColor: vurguRengi,
                                  }
                            }
                          >
                            {dugme.metin}
                          </Link>
                        ))}
                      </div>

                      {slayt.beyanUyarisi && (
                        <p
                          className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed"
                          style={{ color: METIN_RENGI }}
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 shrink-0"
                            style={{ color: vurguRengi }}
                          >
                            <IkonKalkan />
                          </span>
                          {slayt.beyanUyarisi}
                        </p>
                      )}
                    </div>

                    <div className="order-1 lg:order-2 lg:col-span-7">
                      {/*
                        Kadraj `UrunGorselleri` içindeki `konum` değeriyle
                        ayarlanır; her slayt kendi odak noktasını korur.

                        SERT SINIR YOK: masaüstünde görselin metne bakan
                        SOL kenarı beyaza doğru yumuşak bir gradyanla erir.

                        Geçiş DAR tutulur (yaklaşık ilk %24) ve %24'ten
                        sonra tamamen saydamdır: fotoğrafın orta ve sağ
                        bölümü — sahnedeki kişiler ve QR etiketi — hiç
                        soldurulmaz.

                        MOBİLDE GRADYAN YOKTUR. Dar ekranda metin görselin
                        ALTINDADIR; üstüne beyaz bindirmenin bir işlevi
                        olmadığı gibi fotoğrafı gereksiz yere soluklaştırır.
                      */}
                      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/3]">
                        <Gorsel
                          anahtar={slayt.gorsel!}
                          oncelikli={sira === ANA_BASLIK_SIRASI}
                          /*
                            Kaydırıcıda tembel yükleme KAPALI: slaytlar
                            `translateX` ile taşındığı için uzaktaki
                            görseller görünüre girse bile yüklenmiyor ve
                            kırık görsel gibi boş kalıyordu.
                          */
                          hemenYukle
                          sizes="(min-width: 1024px) 54vw, 92vw"
                        />

                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 hidden lg:block lg:bg-[linear-gradient(to_right,#FFFFFF_0%,rgba(255,255,255,0.72)_6%,rgba(255,255,255,0.28)_14%,rgba(255,255,255,0)_24%)]"
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

        {/*
          Kontroller: oklar solda, noktalar ortada — hepsi 44px hedefli.
          Mobilde kaydırıcı olmadığı için HİÇ render edilmezler.
        */}
        {(
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/10 pt-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => git(etkin - 1)}
              aria-label={metinler.oncekiSlayt}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/15 transition duration-200 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: BASLIK_RENGI, outlineColor: VURGU_RENGI }}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ‹
              </span>
            </button>

            <button
              type="button"
              onClick={() => git(etkin + 1)}
              aria-label={metinler.sonrakiSlayt}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/15 transition duration-200 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: BASLIK_RENGI, outlineColor: VURGU_RENGI }}
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
                className="inline-flex h-11 w-8 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ outlineColor: VURGU_RENGI }}
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full transition-all duration-200 ${
                    sira === etkin ? "w-7" : "w-1.5"
                  }`}
                  style={{
                    backgroundColor:
                      sira === etkin ? VURGU_RENGI : `${BASLIK_RENGI}33`,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
