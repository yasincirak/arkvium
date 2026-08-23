import type { Metadata } from "next";
import Link from "next/link";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import MobilMenu from "@/components/MobilMenu";
import {
  IkonKalkan,
  IkonPanel,
  IkonTarama,
  IkonTasima,
} from "@/components/gorsel/Ikonlar";
import {
  ArkaPlanLogosu,
  Gorsel,
  TemsiliRozet,
} from "@/components/gorsel/UrunGorselleri";
import HeroCarousel from "@/components/hero/HeroCarousel";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
import { CANLI_ADRES, PAYLASIM_GORSELI } from "@/lib/seo";
import UrunlerBolumu from "@/components/UrunlerBolumu";

/**
 * Ana sayfanın kendi canonical adresi.
 * Global layout'ta canonical TANIMLI DEĞİLDİR; her sayfa kendini gösterir.
 */
export const metadata: Metadata = {
  alternates: { canonical: CANLI_ADRES },
  // DİKKAT: Next.js sayfa düzeyindeki `openGraph` nesnesini üsttekiyle
  // BİRLEŞTİRMEZ, üzerine yazar. Bu yüzden alanlar burada tekrar verilir.
  openGraph: {
    title: "ARKVIUM — Dijital Sahiplik Platformu",
    description:
      "Eşyaların kaybolsa bile sana geri dönsün. QR kodlu dijital sahiplik ve güvenli iletişim.",
    siteName: "ARKVIUM",
    locale: "tr_TR",
    type: "website",
    url: CANLI_ADRES,
    images: [PAYLASIM_GORSELI],
  },
};

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white text-[#101a3d]">
      <ArkaPlanLogosu />


      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo yaziSinifi="text-base sm:text-xl" amblemYuksekligi={30} />

          <div className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#urunler" className="transition hover:text-indigo-600">
              Ürünler
            </a>
            <a href="#faydalar" className="transition hover:text-indigo-600">
              Faydalar
            </a>
            <a href="#nasil" className="transition hover:text-indigo-600">
              Nasıl Çalışır
            </a>
            <a href="#senaryolar" className="transition hover:text-indigo-600">
              Kullanım
            </a>
            <a href="#guvenlik" className="transition hover:text-indigo-600">
              Güvenlik
            </a>
            <a href="#sss" className="transition hover:text-indigo-600">
              SSS
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobilde "Giriş Yap" menünün içindedir; masaüstünde header'da kalır. */}
            <a
              href="/login"
              className="hidden whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 md:inline-flex sm:px-4"
            >
              Giriş Yap
            </a>

            <a
              href="/register"
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl bg-[#101a3d] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2a5c] sm:px-5 md:min-h-0"
            >
              Hemen Başla
            </a>

            <MobilMenu
              baglantilar={[
                { href: "#urunler", metin: "Ürünler" },
                { href: "#faydalar", metin: "Faydalar" },
                { href: "#nasil", metin: "Nasıl Çalışır" },
                { href: "#senaryolar", metin: "Kullanım" },
                { href: "#guvenlik", metin: "Güvenlik" },
                { href: "#sss", metin: "SSS" },
                { href: "/login", metin: "Giriş Yap" },
              ]}
            />
          </div>
        </div>
      </header>

      <HeroCarousel />

      <section id="ozellikler" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">Neden ARKVIUM?</h2>
        </BolumGecisi>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <BolumGecisi className="rounded-2xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none">
            <h3 className="text-xl font-semibold">QR Dijital Kimlik</h3>
            <p className="mt-3 text-slate-600">
              Her eşya için benzersiz QR kod oluştur ve dijital kimlik ver.
            </p>
          </BolumGecisi>

          <BolumGecisi
            gecikme={80}
            className="rounded-2xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
          >
            <h3 className="text-xl font-semibold">Gizli İletişim</h3>
            <p className="mt-3 text-slate-600">
              Bulan kişi sana ulaşır ama telefon numaran doğrudan görünmez.
            </p>
          </BolumGecisi>

          <BolumGecisi
            gecikme={160}
            className="rounded-2xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
          >
            <h3 className="text-xl font-semibold">Hesabına Bağlı Etiket</h3>
            <p className="mt-3 text-slate-600">
              Etiketi hesabında etkinleştirirsin; dilediğinde başka bir kaydına
              taşıyabilirsin.
            </p>
          </BolumGecisi>

          <BolumGecisi
            gecikme={240}
            className="rounded-2xl border border-slate-200 bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
          >
            <h3 className="text-xl font-semibold">Kolay Yönetim</h3>
            <p className="mt-3 text-slate-600">
              Tüm eşyalarını tek panelden ekle, düzenle ve takip et.
            </p>
          </BolumGecisi>
        </div>

        <BolumGecisi gecikme={120}>
          <div className="mt-9 grid items-center gap-8 rounded-3xl border border-[#e5e0ff] bg-[#f6f4ff] p-8 md:grid-cols-2 sm:p-10">
            <div>
              <h3 className="text-2xl font-bold">Okut, mesaj gelsin</h3>
              <p className="mt-4 leading-relaxed text-slate-600">
                QR kod telefonun kamerasıyla okutulur ve tarayıcıda açılır.
                Mesajı gönderen kişinin uygulama kurmasına gerek yoktur;
                bildirim sana ARKVIUM üzerinden ulaşır.
              </p>
            </div>

            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#e5e0ff] bg-slate-100">
              <Gorsel anahtar="aktivasyon" sizes="(min-width: 768px) 48vw, 90vw" />
                <TemsiliRozet />
            </div>
          </div>
        </BolumGecisi>
      </section>

      <section id="nasil" className="scroll-mt-24 border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <BolumGecisi>
            <h2 className="text-center text-3xl font-bold">
              Fiziksel ARKVIUM ürününü dört adımda kullan
            </h2>
          </BolumGecisi>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <BolumGecisi className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="text-4xl font-bold text-indigo-600">01</div>
              <h3 className="mt-4 text-xl font-semibold">Ürününü seç</h3>
              <p className="mt-3 text-slate-600">
                İhtiyacına uygun QR sticker, anahtarlık, künye veya valiz
                etiketini seç.
              </p>
            </BolumGecisi>

            <BolumGecisi
              gecikme={90}
              className="rounded-2xl border border-slate-200 bg-white p-7"
            >
              <div className="text-4xl font-bold text-indigo-600">02</div>
              <h3 className="mt-4 text-xl font-semibold">Satın al</h3>
              <p className="mt-3 text-slate-600">
                Teslimat bilgilerini gir ve ödemeni güvenli ödeme sayfasında
                tamamla.
              </p>
            </BolumGecisi>

            <BolumGecisi
              gecikme={180}
              className="rounded-2xl border border-slate-200 bg-white p-7"
            >
              <div className="text-4xl font-bold text-indigo-600">03</div>
              <h3 className="mt-4 text-xl font-semibold">
                Etiketini etkinleştir
              </h3>
              <p className="mt-3 text-slate-600">
                Ürün eline ulaştığında ARKVIUM hesabına giriş yap ve QR etiketini
                hesabına bağla.
              </p>
            </BolumGecisi>

            <BolumGecisi
              gecikme={270}
              className="rounded-2xl border border-slate-200 bg-white p-7"
            >
              <div className="text-4xl font-bold text-indigo-600">04</div>
              <h3 className="mt-4 text-xl font-semibold">Güvenle mesaj al</h3>
              <p className="mt-3 text-slate-600">
                Etiketi eşyana veya aracına uygula; QR okutulduğunda kişisel
                bilgilerin görünmeden sana mesaj gelsin.
              </p>
            </BolumGecisi>
          </div>

          <p className="mt-8 text-center text-slate-600">
            Fiziksel ürün istemiyor musun?{" "}
            <a
              href="/register"
              className="font-semibold text-indigo-600 underline-offset-4 transition hover:text-indigo-700 hover:underline"
            >
              Ücretsiz hesap oluştur
            </a>
            arak dijital QR kodunu kendin oluşturabilirsin.
          </p>
        </div>
      </section>

      <UrunlerBolumu />

      {/* Sağladığı faydalar */}
      <section id="faydalar" className="scroll-mt-24 border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <BolumGecisi>
            <h2 className="text-center text-3xl font-bold">Size ne sağlar?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
              ARKVIUM etiketi, eşyanla iletişim kurulmasını sen kontrol edersin.
            </p>
          </BolumGecisi>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Ikon: IkonTarama,
                baslik: "Kurulum gerektirmez",
                metin:
                  "QR kod telefonun kamerasıyla okunur ve tarayıcıda açılır. Mesajı gönderen kişinin uygulama yüklemesine gerek yoktur.",
              },
              {
                Ikon: IkonKalkan,
                baslik: "Numaran açıkta durmaz",
                metin:
                  "Etikette telefon numaran yazmaz. Bildirim sana ARKVIUM üzerinden iletilir.",
              },
              {
                Ikon: IkonTasima,
                baslik: "Etiketi taşıyabilirsin",
                metin:
                  "Eşyan değişirse etiketi iptal etmeden hesabındaki başka bir kayda bağlayabilirsin.",
              },
              {
                Ikon: IkonPanel,
                baslik: "Tek panelden yönetirsin",
                metin:
                  "Eşyalarını ekler, düzenler, kayıp olarak işaretler ve gelen bildirimleri aynı yerden görürsün.",
              },
            ].map((oge, sira) => (
              <BolumGecisi
                key={oge.baslik}
                gecikme={sira * 70}
                className="rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
              >
                <oge.Ikon />
                <h3 className="mt-5 text-lg font-semibold">{oge.baslik}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{oge.metin}</p>
              </BolumGecisi>
            ))}
          </div>
        </div>
      </section>

      {/* Kullanım senaryoları */}
      <section id="senaryolar" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">Nerelerde kullanılır?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Aynı mantık farklı eşyalarda çalışır: QR okutulur, sana ARKVIUM
            üzerinden mesaj gelir.
          </p>
        </BolumGecisi>

        <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
          <BolumGecisi>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#e5e0ff] bg-slate-100">
              <Gorsel anahtar="arac" sizes="(min-width: 768px) 48vw, 90vw" />
                <TemsiliRozet />
            </div>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <h3 className="text-2xl font-bold">Araç</h3>
            <p className="mt-4 leading-relaxed text-slate-600">
              Hatalı park, açık unutulan far veya araçta fark edilen bir durum
              için numaran görünmeden bildirim al.
            </p>

            <Link
              href="/urun/arac-stickeri"
              className="mt-6 inline-flex rounded-xl border border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Araç ürününü incele
            </Link>
          </BolumGecisi>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              baslik: "Anahtar",
              metin: "Anahtarlığa takılan metal etiketle kayıp anahtarlarına ulaşılsın.",
            },
            {
              baslik: "Evcil hayvan",
              metin: "Tasmadaki künye okutulduğunda sana güvenli mesaj gelsin.",
            },
            {
              baslik: "Valiz",
              metin: "Valizin kaybolduğunda bulan kişi seninle iletişime geçebilsin.",
            },
            {
              baslik: "Kayıp eşya",
              metin: "Eşyanı kayıp olarak işaretle; QR okutan kişi bu uyarıyı görsün.",
            },
          ].map((oge, sira) => (
            <BolumGecisi
              key={oge.baslik}
              gecikme={sira * 70}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
            >
              <h3 className="text-lg font-semibold">{oge.baslik}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{oge.metin}</p>
            </BolumGecisi>
          ))}
        </div>
      </section>

      {/* Güven ve gizlilik */}
      <section id="guvenlik" className="scroll-mt-24 border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 sm:py-16 md:grid-cols-2">
          <BolumGecisi>
            <h2 className="text-3xl font-bold">Gizlilik önce gelir</h2>

            <p className="mt-4 leading-relaxed text-slate-600">
              ARKVIUM&apos;un hedefi sadece eşyayı buldurmak değil; kullanıcıyı
              koruyan, güvenli ve kontrollü bir dijital sahiplik altyapısı
              kurmaktır.
            </p>

            <ul className="mt-8 space-y-4 text-slate-600">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                <span className="leading-relaxed">
                  QR kodun içinde telefon numaran bulunmaz.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                <span className="leading-relaxed">
                  QR kodun açtığı sayfada kişisel iletişim bilgin doğrudan
                  gösterilmez.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                <span className="leading-relaxed">
                  Mesaj sana ARKVIUM üzerinden iletilir.
                </span>
              </li>
            </ul>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <Gorsel anahtar="mesajlasma" sizes="(min-width: 768px) 48vw, 90vw" />
                <TemsiliRozet />
            </div>
          </BolumGecisi>
        </div>
      </section>

      {/* Sık sorulan sorular */}
      <section id="sss" className="scroll-mt-24 mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">Sık sorulan sorular</h2>
        </BolumGecisi>

        <div className="mt-8 space-y-3">
          {[
            {
              soru: "QR kodu okutan kişinin uygulama yüklemesi gerekir mi?",
              cevap:
                "Hayır. QR kod tarayıcıda bir sayfa açar ve mesaj formu doğrudan orada doldurulur; uygulama kurulumu veya hesap açma gerekmez.",
            },
            {
              soru: "Telefon numaram görünür mü?",
              cevap:
                "QR kodun açtığı sayfada telefon numaran ve e-posta adresin gösterilmez. Mesajı gönderen kişi kendi iletişim bilgisini bırakır.",
            },
            {
              soru: "Etiketi nasıl etkinleştiririm?",
              cevap:
                "ARKVIUM hesabına giriş yapıp etiketin üzerindeki aktivasyon kodunu girersin. Etkinleştirme için giriş yapman gerekir.",
            },
            {
              soru: "Bana mesaj nasıl ulaşır?",
              cevap:
                "Gönderilen bildirim hesabındaki e-posta adresine iletilir ve hesabında da görüntülenir.",
            },
            {
              soru: "Eşyamı değiştirirsem etiket ne olur?",
              cevap:
                "Etiketi hesabındaki başka bir kayda taşıyabilirsin; etiket iptal olmadan yeni kaydına bağlanır.",
            },
            {
              soru: "Eşyamı kayıp olarak işaretleyebilir miyim?",
              cevap:
                "Evet. Kayıp işaretlediğinde QR kodu okutan kişi bu uyarıyı sayfada görür.",
            },
          ].map((oge, sira) => (
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
                <p className="pb-5 leading-relaxed text-slate-600">{oge.cevap}</p>
              </details>
            </BolumGecisi>
          ))}
        </div>
      </section>

      {/* Son çağrı */}
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <BolumGecisi>
          <div className="grid items-center gap-8 rounded-3xl border border-[#e5e0ff] bg-[#f6f4ff] p-8 md:grid-cols-2 sm:p-12">
            <div>
              <h2 className="text-3xl font-bold">Eşyana dijital kimlik ver</h2>

              <p className="mt-4 leading-relaxed text-slate-600">
                Etiketini seç, hesabına bağla ve numaran görünmeden bildirim al.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#urunler"
                  className="inline-flex justify-center rounded-xl bg-[#101a3d] px-8 py-4 font-semibold text-white transition hover:bg-[#1b2a5c] active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  Ürünleri İncele
                </Link>

                <Link
                  href="/account/tags/activate"
                  className="inline-flex justify-center rounded-xl border border-indigo-200 bg-white px-8 py-4 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  Etiketimi Etkinleştir
                </Link>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#e5e0ff] bg-slate-100">
              <Gorsel anahtar="anahtarlik" sizes="(min-width: 768px) 40vw, 90vw" />
                <TemsiliRozet />
            </div>
          </div>
        </BolumGecisi>
      </section>

      {/*
        Footer yalnızca GERÇEKTEN VAR OLAN sayfalara bağlanır. Sosyal medya
        veya hukuki metin bağlantısı eklenmez: bu hesaplar/sayfalar projede
        tanımlı değildir ve kırık bağlantı üretmemek için uydurulmaz.
      */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <ArkviumTamLogo genislik={160} />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
                Eşyalarına QR kodlu dijital kimlik ver; kişisel bilgilerin
                görünmeden sana ulaşılsın.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#101a3d]">Ürünler</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-500">
                <li>
                  <a href="/#urunler" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Tüm ürünler
                  </a>
                </li>
                <li>
                  <Link
                    href="/urun/arac-stickeri"
                    className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0"
                  >
                    Araç İletişim QR Sticker&apos;ı
                  </Link>
                </li>
                <li>
                  <a href="/#faydalar" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Size ne sağlar?
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#101a3d]">Nasıl çalışır</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-500">
                <li>
                  <a href="/#nasil" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Dört adımda kullanım
                  </a>
                </li>
                <li>
                  <a href="/#senaryolar" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Kullanım alanları
                  </a>
                </li>
                <li>
                  <a href="/#guvenlik" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Gizlilik
                  </a>
                </li>
                <li>
                  <a href="/#sss" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Sık sorulan sorular
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#101a3d]">Hesap</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-500">
                <li>
                  <Link href="/login" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Giriş yap
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0">
                    Hesap oluştur
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account/tags/activate"
                    className="flex min-h-[44px] items-center transition hover:text-indigo-600 md:min-h-0"
                  >
                    Etiketimi etkinleştir
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            © 2026 ARKVIUM. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </main>
  );
}
