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
import HeroBolumu from "@/components/hero/HeroBolumu";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
import { CANLI_ADRES, PAYLASIM_GORSELI } from "@/lib/seo";
import UrunlerBolumu from "@/components/UrunlerBolumu";

/**
 * ARKVIUM ana sayfası — pazarlama katmanı.
 *
 * Tasarım kuralları DESIGN.md içinde tanımlıdır. Renk, boşluk, gölge ve
 * hareket değerleri burada uydurulmaz: `ark-*` tokenları kullanılır.
 *
 * Bölüm ritmi: beyaz → `surface-2` bandı → beyaz ... Bantlar arasındaki
 * geçiş yalnızca zemin rengi ve 1px kenarlıkla yapılır; ek boşluk verilmez.
 *
 * Ana sayfanın kendi canonical adresi vardır; global layout'ta canonical
 * TANIMLI DEĞİLDİR, her sayfa kendini gösterir.
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

/** Üst barda ve mobil menüde AYNI sırayla kullanılan bölüm çıpaları. */
const BOLUMLER = [
  { href: "#urunler", metin: "Ürünler" },
  { href: "#nasil", metin: "Nasıl Çalışır" },
  { href: "#faydalar", metin: "Faydalar" },
  { href: "#senaryolar", metin: "Araç" },
  { href: "#guvenlik", metin: "Gizlilik" },
  { href: "#sss", metin: "SSS" },
];

const ADIMLAR = [
  {
    numara: "01",
    baslik: "Ürününü seç",
    metin:
      "İhtiyacına uygun QR sticker, anahtarlık, künye veya valiz etiketini seç.",
  },
  {
    numara: "02",
    baslik: "Satın al",
    metin:
      "Teslimat bilgilerini gir ve ödemeni güvenli ödeme sayfasında tamamla.",
  },
  {
    numara: "03",
    baslik: "Etiketini etkinleştir",
    metin:
      "Ürün eline ulaştığında hesabına giriş yap ve QR etiketini hesabına bağla.",
  },
  {
    numara: "04",
    baslik: "Güvenle mesaj al",
    metin:
      "Etiketi eşyana uygula; QR okutulduğunda kişisel bilgilerin görünmeden sana mesaj gelsin.",
  },
];

const FAYDALAR = [
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
];

const GIZLILIK_MADDELERI = [
  "QR kodun içinde telefon numaran bulunmaz.",
  "QR kodun açtığı sayfada kişisel iletişim bilgin doğrudan gösterilmez.",
  "Mesaj sana ARKVIUM üzerinden iletilir.",
];

const SORULAR = [
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
];

/** Üst bardaki ve footer'daki bağlantılar için ortak sınıf. */
const BAGLANTI =
  "transition duration-200 hover:text-ark-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-ark-surface text-ark-ink">
      <ArkaPlanLogosu />

      <header className="sticky top-0 z-20 border-b border-ark-line bg-white/90 px-6 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Logo yaziSinifi="text-base sm:text-xl" amblemYuksekligi={30} />

          <nav
            aria-label="Bölümler"
            className="hidden gap-7 text-sm text-ark-ink-2 md:flex"
          >
            {BOLUMLER.map((bolum) => (
              <a key={bolum.href} href={bolum.href} className={BAGLANTI}>
                {bolum.metin}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobilde "Giriş Yap" menünün içindedir; masaüstünde header'da kalır. */}
            <a
              href="/login"
              className={`hidden whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold text-ark-ink-2 sm:px-4 md:inline-flex ${BAGLANTI}`}
            >
              Giriş Yap
            </a>

            <a
              href="/register"
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl bg-ark-ink px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-ark-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent sm:px-5 md:min-h-0"
            >
              Hemen Başla
            </a>

            <MobilMenu
              baglantilar={[...BOLUMLER, { href: "/login", metin: "Giriş Yap" }]}
            />
          </div>
        </div>
      </header>

      <HeroBolumu />

      {/* Nasıl çalışır — dört adım */}
      <section
        id="nasil"
        aria-labelledby="nasil-basligi"
        className="scroll-mt-24 border-y border-ark-line bg-ark-surface-2"
      >
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
          <BolumGecisi className="text-center">
            <p className="ark-etiket text-ark-accent">Nasıl çalışır</p>

            <h2 id="nasil-basligi" className="ark-baslik mt-3 text-ark-ink">
              Kutudan çıkıp korumaya dört adım
            </h2>
          </BolumGecisi>

          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADIMLAR.map((adim, sira) => (
              <BolumGecisi
                key={adim.numara}
                as="li"
                gecikme={Math.min(sira * 70, 300)}
                className="rounded-2xl border border-ark-line bg-ark-surface p-6 shadow-ark-1 sm:p-7"
              >
                <div
                  aria-hidden="true"
                  className="text-3xl font-bold tracking-tight text-ark-accent"
                >
                  {adim.numara}
                </div>

                <h3 className="mt-4 text-xl font-semibold text-ark-ink">
                  {adim.baslik}
                </h3>

                <p className="mt-3 leading-relaxed text-ark-ink-2">
                  {adim.metin}
                </p>
              </BolumGecisi>
            ))}
          </ol>

          <p className="mt-10 text-left text-ark-ink-2 sm:text-center">
            Fiziksel ürün istemiyor musun?{" "}
            <a
              href="/register"
              className="font-semibold text-ark-accent underline-offset-4 transition duration-200 hover:text-ark-accent-strong hover:underline"
            >
              Ücretsiz hesap oluştur
            </a>
            arak dijital QR kodunu kendin oluşturabilirsin.
          </p>
        </div>
      </section>

      <UrunlerBolumu />

      {/* Faydalar */}
      <section
        id="faydalar"
        aria-labelledby="faydalar-basligi"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:px-8 sm:py-24"
      >
        {/*
          Mobilde sola hizalı: dar ekranda ortalanmış çok satırlı paragrafın
          her satırı farklı yerden başlar ve göz satır başını kaybeder
          (DESIGN.md § 4). `sm`den itibaren ortalanmış hâline döner.
        */}
        <BolumGecisi className="text-left sm:text-center">
          <p className="ark-etiket text-ark-accent">Faydalar</p>

          <h2 id="faydalar-basligi" className="ark-baslik mt-3 text-ark-ink">
            İletişimi sen kontrol edersin
          </h2>

          <p className="ark-giris mt-4 max-w-2xl text-ark-ink-2 sm:mx-auto">
            Eşyanla kimin, nasıl ve ne zaman iletişim kuracağına karar veren
            taraf sensin.
          </p>
        </BolumGecisi>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FAYDALAR.map((oge, sira) => (
            <BolumGecisi
              key={oge.baslik}
              gecikme={Math.min(sira * 70, 300)}
              className="ark-kart-hover rounded-2xl border border-ark-line bg-ark-surface p-6 shadow-ark-1 sm:p-7"
            >
              <oge.Ikon />

              <h3 className="mt-5 text-lg font-semibold text-ark-ink">
                {oge.baslik}
              </h3>

              <p className="mt-3 leading-relaxed text-ark-ink-2">{oge.metin}</p>
            </BolumGecisi>
          ))}
        </div>
      </section>

      {/*
        Araç odaklı bölüm.

        Eski "Nerelerde kullanılır?" ızgarası KALDIRILDI: kullanım senaryoları
        artık ürün kartlarının içinde, ürünle birlikte anlatılıyor ve ikisi
        birbirini tekrar ediyordu. Burada yalnızca kendi ayrıntı sayfası olan
        tek ürün öne çıkarılır.
      */}
      <section
        id="senaryolar"
        aria-labelledby="arac-basligi"
        className="scroll-mt-24 border-y border-ark-line bg-ark-surface-2"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:px-8 sm:py-24 md:grid-cols-2 md:gap-16">
          {/*
            METİN, DOM'da da görselden ÖNCE gelir: mobilde tek sütuna inince
            ziyaretçi hangi bölümde olduğunu bilmeden bir fotoğrafla
            karşılaşmasın (DESIGN.md § 9) ve ekran okuyucu da başlığı önce
            okusun — okuma sırası görsel sırayla aynı kalır (§ 10).

            Masaüstünde görsel yine SOLDA durur; bunu yalnızca `md:order-*`
            sağlar, kaynak sırası değişmez.
          */}
          <BolumGecisi className="md:order-2">
            <p className="ark-etiket text-ark-accent">Araç</p>

            <h2 id="arac-basligi" className="ark-baslik mt-3 text-ark-ink">
              Camında numaran yazmasın
            </h2>

            <p className="ark-olcu mt-5 leading-relaxed text-ark-ink-2">
              Hatalı park, açık unutulan far veya araçta fark edilen bir durum
              için sürücüler sana ulaşabilsin — telefon numaran camda yazmadan.
              Kâğıda numara yazıp bırakma dönemi kapanır.
            </p>

            <Link
              href="/urun/arac-stickeri"
              className="mt-8 inline-flex min-h-[44px] items-center rounded-xl border border-ark-line-strong bg-ark-surface px-6 py-3 font-semibold text-ark-ink transition duration-200 hover:bg-ark-surface-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
            >
              Araç ürününü incele
            </Link>
          </BolumGecisi>

          <BolumGecisi gecikme={120} className="md:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-ark-line bg-ark-surface-3 shadow-ark-2">
              <Gorsel anahtar="arac" sizes="(min-width: 768px) 48vw, 90vw" />
              <TemsiliRozet />
            </div>
          </BolumGecisi>
        </div>
      </section>

      {/* Gizlilik */}
      <section
        id="guvenlik"
        aria-labelledby="guvenlik-basligi"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:px-8 sm:py-24"
      >
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <BolumGecisi>
            <p className="ark-etiket text-ark-accent">Gizlilik</p>

            <h2 id="guvenlik-basligi" className="ark-baslik mt-3 text-ark-ink">
              Bulunabilirlik, mahremiyet pahasına olmaz
            </h2>

            <p className="ark-olcu mt-5 leading-relaxed text-ark-ink-2">
              ARKVIUM&apos;un hedefi sadece eşyayı buldurmak değil; kullanıcıyı
              koruyan, kontrollü bir dijital sahiplik altyapısı kurmaktır.
            </p>

            <ul className="mt-8 space-y-4">
              {GIZLILIK_MADDELERI.map((madde) => (
                <li key={madde} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ark-accent"
                  />
                  <span className="leading-relaxed text-ark-ink-2">
                    {madde}
                  </span>
                </li>
              ))}
            </ul>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-ark-line bg-ark-surface-3 shadow-ark-2">
              <Gorsel
                anahtar="mesajlasma"
                sizes="(min-width: 768px) 48vw, 90vw"
              />
              <TemsiliRozet />
            </div>
          </BolumGecisi>
        </div>
      </section>

      {/* Sık sorulan sorular */}
      <section
        id="sss"
        aria-labelledby="sss-basligi"
        className="scroll-mt-24 border-y border-ark-line bg-ark-surface-2"
      >
        <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
          <BolumGecisi className="text-center">
            <p className="ark-etiket text-ark-accent">SSS</p>

            <h2 id="sss-basligi" className="ark-baslik mt-3 text-ark-ink">
              Sık sorulan sorular
            </h2>
          </BolumGecisi>

          <div className="mt-12 space-y-3">
            {SORULAR.map((oge, sira) => (
              <BolumGecisi key={oge.soru} gecikme={Math.min(sira * 60, 300)}>
                <details className="group rounded-2xl border border-ark-line bg-ark-surface px-6 shadow-ark-1">
                  <summary className="cursor-pointer list-none py-5 font-semibold text-ark-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent">
                    <span className="flex items-center justify-between gap-4">
                      {oge.soru}
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xl leading-none text-ark-accent transition duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </span>
                  </summary>

                  <p className="pb-5 leading-relaxed text-ark-ink-2">
                    {oge.cevap}
                  </p>
                </details>
              </BolumGecisi>
            ))}
          </div>
        </div>
      </section>

      {/* Son çağrı */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
        <BolumGecisi>
          <div className="grid items-center gap-10 rounded-3xl border border-ark-line bg-ark-surface-2 p-8 shadow-ark-1 sm:p-12 md:grid-cols-2">
            <div>
              <h2 className="ark-baslik text-ark-ink">
                Eşyana dijital kimlik ver
              </h2>

              <p className="ark-olcu mt-5 leading-relaxed text-ark-ink-2">
                Etiketini seç, hesabına bağla ve numaran görünmeden bildirim al.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#urunler"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-ark-ink px-8 py-3.5 font-semibold text-white transition duration-200 hover:bg-ark-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  Ürünleri İncele
                </Link>

                <Link
                  href="/account/tags/activate"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ark-line-strong bg-ark-surface px-8 py-3.5 font-semibold text-ark-ink transition duration-200 hover:bg-ark-surface-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
                >
                  Etiketimi Etkinleştir
                </Link>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ark-line bg-ark-surface-3">
              <Gorsel
                anahtar="anahtarlik"
                sizes="(min-width: 768px) 40vw, 90vw"
              />
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
      <footer className="border-t border-ark-line bg-ark-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <ArkviumTamLogo genislik={160} />

              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ark-ink-3">
                Dijital Sahiplik Platformu. Eşyalarına QR kodlu dijital kimlik
                ver; kişisel bilgilerin görünmeden sana ulaşılsın.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ark-ink">Ürünler</h2>
              <ul className="mt-4 space-y-2 text-sm text-ark-ink-3">
                <li>
                  <a
                    href="/#urunler"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Tüm ürünler
                  </a>
                </li>
                <li>
                  <Link
                    href="/urun/arac-stickeri"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Araç İletişim QR Sticker&apos;ı
                  </Link>
                </li>
                <li>
                  <a
                    href="/#faydalar"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Faydalar
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ark-ink">
                Nasıl çalışır
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-ark-ink-3">
                <li>
                  <a
                    href="/#nasil"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Dört adımda kullanım
                  </a>
                </li>
                <li>
                  <a
                    href="/#senaryolar"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Araç etiketi
                  </a>
                </li>
                <li>
                  <a
                    href="/#guvenlik"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Gizlilik
                  </a>
                </li>
                <li>
                  <a
                    href="/#sss"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Sık sorulan sorular
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ark-ink">Hesap</h2>
              <ul className="mt-4 space-y-2 text-sm text-ark-ink-3">
                <li>
                  <Link
                    href="/login"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Giriş yap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Hesap oluştur
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account/tags/activate"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1 ${BAGLANTI}`}
                  >
                    Etiketimi etkinleştir
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-ark-line pt-6 text-center text-sm text-ark-ink-3">
            © 2026 ARKVIUM. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </main>
  );
}
