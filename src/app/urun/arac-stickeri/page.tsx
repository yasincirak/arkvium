import type { Metadata } from "next";
import SayfaUstBari from "@/components/SayfaUstBari";
import { sozluk } from "@/lib/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import {
  ArkaPlanLogosu,
  Gorsel,
  TemsiliRozet,
} from "@/components/gorsel/UrunGorselleri";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
import { CANLI_ADRES, PAYLASIM_GORSELI } from "@/lib/seo";
import { fiyatBicimle, SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Araç İletişim QR Sticker'ı ürün detay sayfası.
 *
 * Fiyat ve ürün adı TEK KAYNAKTAN (`@/lib/siparis`) okunur; burada
 * tekrar yazılmaz. Satın alma düğmeleri mevcut sipariş akışına
 * (`/siparis?urun=<kod>`) gider; yeni bir ödeme yolu kurulmaz.
 *
 * Sayfadaki her iddia koddan doğrulanmıştır; doğrulanamayan hiçbir
 * dayanıklılık, ölçü, teslimat veya garanti bilgisi yazılmaz.
 */

const URUN_KODU = "arac-stickeri";

const urun = SIPARIS_URUNLERI.find((u) => u.kod === URUN_KODU);

export function generateMetadata(): Metadata {
  const ceviri = sozluk();

  return {
  title: ceviri.aracSayfasi.baslik,
  description:
    ceviri.aracSayfasi.altyazi,
  // Sayfa kendi canonical adresini gösterir.
  alternates: { canonical: `${CANLI_ADRES}/urun/arac-stickeri` },
  openGraph: {
    title: ceviri.aracSayfasi.metaBaslik,
    description:
      ceviri.aracSayfasi.metaAciklama,
    type: "website",
    url: `${CANLI_ADRES}/urun/arac-stickeri`,
    siteName: "ARKVIUM",
    locale: "tr_TR",
    images: [PAYLASIM_GORSELI],
  },
  };
}

/** Satın alma düğmesi — mevcut sipariş akışına gider. */
function SatinAlDugmesi({
  tamGenislik = false,
  metin,
}: {
  tamGenislik?: boolean;
  metin: string;
}) {
  return (
    <Link
      href={`/siparis?urun=${URUN_KODU}`}
      className={`inline-flex justify-center rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.98] motion-reduce:active:scale-100 ${
        tamGenislik ? "w-full" : ""
      }`}
    >
      {metin}
    </Link>
  );
}





export default function AracStickeriPage() {
  const ceviri = sozluk();

  const FAYDALAR = [
    {
      baslik: ceviri.aracSayfasi.fayda1Baslik,
      metin:
        ceviri.aracSayfasi.fayda1Metin,
    },
    {
      baslik: ceviri.aracSayfasi.fayda2Baslik,
      metin:
        ceviri.aracSayfasi.fayda2Metin,
    },
    {
      baslik: ceviri.aracSayfasi.fayda3Baslik,
      metin:
        ceviri.aracSayfasi.fayda3Metin,
    },
    {
      baslik: ceviri.aracSayfasi.fayda4Baslik,
      metin:
        ceviri.aracSayfasi.fayda4Metin,
    },
    {
      baslik: ceviri.aracSayfasi.fayda5Baslik,
      metin:
        ceviri.aracSayfasi.fayda5Metin,
    },
  ];

  const ADIMLAR = [
    { no: "01", baslik: ceviri.aracSayfasi.adim1Baslik, metin: ceviri.aracSayfasi.adim1Metin },
    {
      no: "02",
      baslik: ceviri.aracSayfasi.adim2Baslik,
      metin: ceviri.aracSayfasi.adim2Metin,
    },
    {
      no: "03",
      baslik: ceviri.aracSayfasi.adim3Baslik,
      metin: ceviri.aracSayfasi.adim3Metin,
    },
    {
      no: "04",
      baslik: ceviri.aracSayfasi.adim4Baslik,
      metin:
        ceviri.aracSayfasi.adim4Metin,
    },
  ];

  const SENARYOLAR = [
    ceviri.aracSayfasi.senaryo1,
    ceviri.aracSayfasi.senaryo2,
    ceviri.aracSayfasi.senaryo3,
    ceviri.aracSayfasi.senaryo4,
  ];

  const SSS = [
    {
      soru: ceviri.aracSayfasi.sss1Soru,
      cevap:
        ceviri.aracSayfasi.sss1Cevap,
    },
    {
      soru: ceviri.aracSayfasi.sss2Soru,
      cevap:
        ceviri.aracSayfasi.sss2Cevap,
    },
    {
      soru: ceviri.aracSayfasi.sss3Soru,
      cevap:
        ceviri.aracSayfasi.sss3Cevap,
    },
    {
      soru: ceviri.aracSayfasi.sss4Soru,
      cevap:
        ceviri.aracSayfasi.sss4Cevap,
    },
    {
      soru: ceviri.aracSayfasi.sss5Soru,
      cevap:
        ceviri.aracSayfasi.sss5Cevap,
    },
  ];


  if (!urun) {
    notFound();
  }

  return (
    <main className="pt-20 relative min-h-screen bg-white text-[#101a3d]">
      <SayfaUstBari ton="acik" />

      <ArkaPlanLogosu />

      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" aria-label="ARKVIUM ana sayfa">
            <Logo yaziSinifi="text-base sm:text-xl" amblemYuksekligi={30} />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/#urunler"
              className="whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 sm:px-4"
            >{ceviri.kalanlar.tumUrunler}</Link>

            <Link
              href="/login"
              className="whitespace-nowrap rounded-xl bg-[#101a3d] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2a5c] sm:px-5"
            >{ceviri.header.girisYap}</Link>
          </div>
        </div>
      </header>

      {/* A. Üst ürün alanı */}
      <section className="border-b border-[#e5e0ff] bg-gradient-to-b from-[#f6f4ff] to-white">
        {/*
          Ekranın üstündeki içerik geçişle GİZLENMEZ: ilk boyamada tam
          görünür olmalı, aksi halde açılış gecikmiş gibi algılanır.
        */}
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-10 sm:py-16 md:grid-cols-2">
          <div>
            <Link
              href="/#urunler"
              className="text-sm text-slate-500 transition hover:text-indigo-600"
            >
              {ceviri.kalanlar.urunlereGeri}
            </Link>

            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              {ceviri.urunler.ad.aracStickeri}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              {ceviri.aracSayfasi.altyazi}
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <span className="text-3xl font-bold">
                {fiyatBicimle(urun.fiyatKurus)}
              </span>
              <span className="pb-1 text-sm text-slate-500">{ceviri.kalanlar.kargoNotu}</span>
            </div>

            <div className="mt-8">
              <SatinAlDugmesi metin={ceviri.urunler.satinAl} />
            </div>

            <p className="mt-4 text-sm text-slate-500">
              {ceviri.kalanlar.siparisQrNotu.replace(
                "{n}",
                String(urun.qrAdedi)
              )}
            </p>
          </div>

          <div>
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#e5e0ff] bg-slate-100 shadow-sm">
                <Gorsel
                  anahtar="arac"
                  sizes="(min-width: 768px) 48vw, 92vw"
                  oncelikli
                />
                <TemsiliRozet metin={ceviri.gorsel.temsili} />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* B. Temel faydalar */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">{ceviri.aracSayfasi.neSaglar}</h2>
        </BolumGecisi>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FAYDALAR.map((fayda, sira) => (
            <BolumGecisi
              key={fayda.baslik}
              gecikme={sira * 70}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
            >
              <h3 className="text-lg font-semibold">{fayda.baslik}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{fayda.metin}</p>
            </BolumGecisi>
          ))}
        </div>
      </section>

      {/* C. Nasıl çalışır */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <BolumGecisi>
            <h2 className="text-center text-3xl font-bold">{ceviri.aracSayfasi.nasilCalisir}</h2>
          </BolumGecisi>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADIMLAR.map((adim, sira) => (
              <BolumGecisi
                key={adim.no}
                gecikme={sira * 90}
                className="rounded-2xl border border-slate-200 bg-white p-7"
              >
                <div className="text-4xl font-bold text-indigo-600">
                  {adim.no}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{adim.baslik}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">
                  {adim.metin}
                </p>
              </BolumGecisi>
            ))}
          </div>

          <BolumGecisi gecikme={140}>
            <div className="mx-auto mt-9 max-w-2xl">
              <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <Gorsel anahtar="aktivasyon" sizes="(min-width: 768px) 640px, 92vw" />
                <TemsiliRozet metin={ceviri.gorsel.temsili} />
              </div>
            </div>
          </BolumGecisi>
        </div>
      </section>

      {/* D. Kullanım senaryoları */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <BolumGecisi>
            <h2 className="text-3xl font-bold">{ceviri.aracSayfasi.hangiDurumlarda}</h2>

            <ul className="mt-8 space-y-4">
              {SENARYOLAR.map((senaryo) => (
                <li key={senaryo} className="flex gap-3 text-slate-600">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                  />
                  <span className="leading-relaxed">{senaryo}</span>
                </li>
              ))}
            </ul>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#e5e0ff] bg-slate-100">
              <Gorsel anahtar="arac" sizes="(min-width: 768px) 48vw, 92vw" />
                <TemsiliRozet metin={ceviri.gorsel.temsili} />
            </div>
          </BolumGecisi>
        </div>
      </section>

      {/* E. Gizlilik */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 sm:py-16 md:grid-cols-2">
          <BolumGecisi>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <Gorsel anahtar="mesajlasma" sizes="(min-width: 768px) 48vw, 92vw" />
                <TemsiliRozet metin={ceviri.gorsel.temsili} />
            </div>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <h2 className="text-3xl font-bold">{ceviri.aracSayfasi.gizlilikNasil}</h2>

            <ul className="mt-6 space-y-4 text-slate-600">
              <li className="leading-relaxed">{ceviri.kalanlar.qrNumaraYok}</li>
              <li className="leading-relaxed">{ceviri.kalanlar.qrIletisimGizli}</li>
              <li className="leading-relaxed">{ceviri.kalanlar.mesajArkviumIletilir}</li>
            </ul>
          </BolumGecisi>
        </div>
      </section>

      {/* F. SSS */}
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">{ceviri.aracSayfasi.sikSorulan}</h2>
        </BolumGecisi>

        <div className="mt-8 space-y-3">
          {SSS.map((oge, sira) => (
            <BolumGecisi key={oge.soru} gecikme={sira * 60}>
              <details className="group rounded-2xl border border-slate-200 bg-white px-6 open:border-indigo-200 open:bg-[#faf9ff]">
                <summary className="cursor-pointer list-none py-5 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60">
                  <span className="flex items-center justify-between gap-4">
                    {oge.soru}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-indigo-500 transition duration-300 group-open:rotate-45 motion-reduce:transition-none"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="pb-5 leading-relaxed text-slate-600">
                  {oge.cevap}
                </p>
              </details>
            </BolumGecisi>
          ))}
        </div>
      </section>

      {/* G. Son satın alma alanı */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <BolumGecisi>
          <div className="rounded-3xl border border-[#e5e0ff] bg-[#f6f4ff] p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold">{ceviri.urunler.ad.aracStickeri}</h2>

            <p className="mx-auto mt-4 max-w-xl text-slate-600">{ceviri.kalanlar.aracOzet}</p>

            <div className="mt-6 text-3xl font-bold">
              {fiyatBicimle(urun.fiyatKurus)}
            </div>
            <p className="mt-1 text-sm text-slate-500">{ceviri.kalanlar.kargoNotu}</p>

            <div className="mx-auto mt-8 max-w-xs">
              <SatinAlDugmesi tamGenislik metin={ceviri.urunler.satinAl} />
            </div>
          </div>
        </BolumGecisi>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        <div className="flex justify-center">
          <ArkviumTamLogo genislik={170} />
        </div>
        <div className="mt-5">{ceviri.aracSayfasi.telifHakki}</div>
      </footer>
    </main>
  );
}
