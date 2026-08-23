import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import {
  ArkaPlanLogosu,
  Gorsel,
  TemsiliRozet,
} from "@/components/gorsel/UrunGorselleri";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
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

export const metadata: Metadata = {
  title: "Araç İletişim QR Sticker'ı",
  description:
    "Telefon numaranızı aracınızda açıkça göstermeden, aracınızla ilgili durumlarda size ARKVIUM üzerinden güvenli mesaj gönderilmesini sağlayın.",
  openGraph: {
    title: "Araç İletişim QR Sticker'ı | ARKVIUM",
    description:
      "Telefon numaranız görünmeden aracınızla ilgili güvenli bildirim alın.",
    type: "website",
  },
};

/** Satın alma düğmesi — mevcut sipariş akışına gider. */
function SatinAlDugmesi({ tamGenislik = false }: { tamGenislik?: boolean }) {
  return (
    <Link
      href={`/siparis?urun=${URUN_KODU}`}
      className={`inline-flex justify-center rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.98] motion-reduce:active:scale-100 ${
        tamGenislik ? "w-full" : ""
      }`}
    >
      Satın Al
    </Link>
  );
}

const FAYDALAR = [
  {
    baslik: "Numaranız açıkta durmaz",
    metin:
      "Araç camında telefon numarası yazmaz. QR kodu okutan kişi size ARKVIUM üzerinden mesaj gönderir.",
  },
  {
    baslik: "Telefon kamerasıyla okunur",
    metin:
      "QR kod, telefonun kendi kamerasıyla okutulur ve tarayıcıda açılır.",
  },
  {
    baslik: "Uygulama kurulumu gerekmez",
    metin:
      "Mesaj gönderen kişinin uygulama yüklemesine veya hesap açmasına gerek yoktur.",
  },
  {
    baslik: "Etiket hesabınıza bağlıdır",
    metin:
      "Etiketi ARKVIUM hesabınızda etkinleştirirsiniz; bağ yalnızca sizin hesabınızla kurulur.",
  },
  {
    baslik: "Mesaj ARKVIUM üzerinden gelir",
    metin:
      "Bildirim size ARKVIUM üzerinden iletilir; iletişim doğrudan kurulmaz.",
  },
];

const ADIMLAR = [
  { no: "01", baslik: "Ürünü satın al", metin: "Sticker'ı sipariş edersin." },
  {
    no: "02",
    baslik: "Hesabında etkinleştir",
    metin: "Etiket eline ulaştığında hesabına giriş yapıp etiketi bağlarsın.",
  },
  {
    no: "03",
    baslik: "Aracına uygula",
    metin: "Sticker'ı aracında dışarıdan okunabilecek bir yere yapıştırırsın.",
  },
  {
    no: "04",
    baslik: "Güvenli mesaj al",
    metin:
      "QR kod okutulduğunda gönderilen mesaj sana ARKVIUM üzerinden ulaşır.",
  },
];

const SENARYOLAR = [
  "Hatalı ya da yolu kapatan park",
  "Açık unutulan far veya cam",
  "Araçta fark edilen hasar",
  "Aracın çekilme riski veya yerinin değişmesi",
];

const SSS = [
  {
    soru: "QR kodu okutan kişinin uygulama yüklemesi gerekir mi?",
    cevap:
      "Hayır. QR kod tarayıcıda bir sayfa açar; mesaj formu doğrudan orada doldurulur. Uygulama kurulumu veya hesap açma gerekmez.",
  },
  {
    soru: "Telefon numaram görünür mü?",
    cevap:
      "QR kodun açtığı sayfada telefon numaranız ve e-posta adresiniz gösterilmez. Mesaj gönderen kişi kendi iletişim bilgisini bırakır.",
  },
  {
    soru: "Etiketi nasıl etkinleştiririm?",
    cevap:
      "ARKVIUM hesabınıza giriş yapıp etiketin üzerindeki aktivasyon kodunu girersiniz. Etkinleştirme için giriş yapmanız gerekir.",
  },
  {
    soru: "Mesaj bana nasıl ulaşır?",
    cevap:
      "Gönderilen bildirim ARKVIUM tarafından hesabınızdaki e-posta adresine iletilir ve hesabınızda görüntülenir.",
  },
  {
    soru: "Aracımı değiştirirsem ne olur?",
    cevap:
      "Etiketi hesabınızdaki başka bir kayda taşıyabilirsiniz; etiket iptal olmadan yeni kaydınıza bağlanır.",
  },
];

export default function AracStickeriPage() {
  if (!urun) {
    notFound();
  }

  return (
    <main className="relative min-h-screen bg-white text-[#101a3d]">
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
            >
              Tüm Ürünler
            </Link>

            <Link
              href="/login"
              className="whitespace-nowrap rounded-xl bg-[#101a3d] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2a5c] sm:px-5"
            >
              Giriş Yap
            </Link>
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
              ← Ürünler
            </Link>

            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              {urun.ad}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Telefon numaranızı aracınızda açıkça göstermeden, aracınızla ilgili
              durumlarda size güvenli mesaj gönderilmesini sağlayın.
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <span className="text-3xl font-bold">
                {fiyatBicimle(urun.fiyatKurus)}
              </span>
              <span className="pb-1 text-sm text-slate-500">
                Kargo ücreti ödeme adımında eklenir.
              </span>
            </div>

            <div className="mt-8">
              <SatinAlDugmesi />
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Bu üründe {urun.qrAdedi} adet benzersiz QR etiketi bulunur.
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
                <TemsiliRozet />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* B. Temel faydalar */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">Ne sağlar?</h2>
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
            <h2 className="text-center text-3xl font-bold">Nasıl çalışır?</h2>
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
                <TemsiliRozet />
              </div>
            </div>
          </BolumGecisi>
        </div>
      </section>

      {/* D. Kullanım senaryoları */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <BolumGecisi>
            <h2 className="text-3xl font-bold">Hangi durumlarda işe yarar?</h2>

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
                <TemsiliRozet />
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
                <TemsiliRozet />
            </div>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <h2 className="text-3xl font-bold">Gizlilik nasıl korunur?</h2>

            <ul className="mt-6 space-y-4 text-slate-600">
              <li className="leading-relaxed">
                QR kodun içinde telefon numaranız bulunmaz.
              </li>
              <li className="leading-relaxed">
                QR kodun açtığı sayfada kişisel iletişim bilginiz doğrudan
                gösterilmez.
              </li>
              <li className="leading-relaxed">
                Mesaj ARKVIUM üzerinden iletilir.
              </li>
            </ul>
          </BolumGecisi>
        </div>
      </section>

      {/* F. SSS */}
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">Sık sorulan sorular</h2>
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
            <h2 className="text-3xl font-bold">{urun.ad}</h2>

            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Numaranız görünmeden, aracınızla ilgili bildirimleri ARKVIUM
              üzerinden alın.
            </p>

            <div className="mt-6 text-3xl font-bold">
              {fiyatBicimle(urun.fiyatKurus)}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Kargo ücreti ödeme adımında eklenir.
            </p>

            <div className="mx-auto mt-8 max-w-xs">
              <SatinAlDugmesi tamGenislik />
            </div>
          </div>
        </BolumGecisi>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        <div className="flex justify-center">
          <ArkviumTamLogo genislik={170} />
        </div>
        <div className="mt-5">© 2026 ARKVIUM. Tüm hakları saklıdır.</div>
      </footer>
    </main>
  );
}
