import type { Metadata } from "next";
import Link from "next/link";
import AkisBolumu from "@/components/AkisBolumu";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import KonuKaydirici from "@/components/KonuKaydirici";
import KullanimVitrini from "@/components/KullanimVitrini";
import MobilMenu from "@/components/MobilMenu";
import { Gorsel, TemsiliRozet } from "@/components/gorsel/UrunGorselleri";
import HeroKaydirici from "@/components/hero/HeroKaydirici";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
import { CANLI_ADRES, PAYLASIM_GORSELI } from "@/lib/seo";
import UrunlerBolumu from "@/components/UrunlerBolumu";

/**
 * ARKVIUM ana sayfası — pazarlama katmanı.
 *
 * Tasarım kuralları DESIGN.md içinde tanımlıdır. Renk, boşluk, gölge ve
 * hareket değerleri burada uydurulmaz: `ark-*` tokenları kullanılır.
 *
 * BÖLÜM RİTMİ — her bölüm bir öncekinden farklı kompozisyon kullanır:
 *   1. Hero            koyu lacivert kaydırıcı (beş kullanım alanı)
 *   2. Akış            zikzak satırlar, büyük görseller, kart YOK
 *   3. Ürünler         karşılaştırma ızgarası (sayfadaki tek ızgara)
 *   4. Kullanım        farklı boyutlu görsel kutuları
 *   5. Konu kaydırıcı  elle geçilen slaytlar (acil durum profili dâhil)
 *   6. Gizlilik        koyu lacivert, numaralı ifadeler
 *   7. SSS             dar sütun, açılır kapanır
 *   8. Son çağrı       tek panel
 *
 * Böylece sayfa arka arkaya gelen aynı beyaz kart ızgaralarından oluşmaz.
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
  { href: "#nasil", metin: "Nasıl Çalışır" },
  { href: "#urunler", metin: "Ürünler" },
  { href: "#senaryolar", metin: "Kullanım" },
  { href: "#acil-durum", metin: "Acil Durum" },
  { href: "#guvenlik", metin: "Gizlilik" },
  { href: "#sss", metin: "SSS" },
];

/**
 * Gizlilik bölümündeki üç ifade.
 *
 * Bu üç madde ürünün DOĞRULANMIŞ davranışıdır ve bilerek genişletilmez:
 * "%100 güvenli", "kırılamaz" gibi ölçülemeyen hiçbir iddia eklenmez
 * (DESIGN.md § 11).
 */
const GIZLILIK_MADDELERI = [
  { numara: "01", metin: "Telefon numaran QR kodda yer almaz." },
  { numara: "02", metin: "Kişisel iletişim bilgilerin doğrudan gösterilmez." },
  { numara: "03", metin: "Mesaj ARKVIUM üzerinden iletilir." },
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
    <main className="min-h-screen bg-ark-surface text-ark-ink">
      <header className="sticky top-0 z-20 border-b border-ark-line bg-white/90 px-6 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Logo yaziSinifi="text-base sm:text-xl" amblemYuksekligi={30} />

          {/*
            Bölüm çıpaları düz metin yerine SEGMENTLİ DÜĞME grubu.

            Tek bir hafif zemin üzerinde duran küçük düğmeler; üzerine
            gelince beyaz yüzeye çıkar. Düğme köşesi tasarım sistemindeki
            `rounded-xl` ile aynı (DESIGN.md § 6.2), böylece sayfadaki diğer
            düğmelerle aynı dili konuşur.

            Grup `lg`de görünür: altı düğme `md` (768px) genişliğinde sağdaki
            eylemlerle çakışıyordu, o aralıkta hamburger menü kullanılır.
          */}
          <nav
            aria-label="Bölümler"
            className="hidden items-center gap-1 rounded-2xl border border-ark-line bg-ark-surface-2 p-1 lg:flex"
          >
            {BOLUMLER.map((bolum) => (
              <a
                key={bolum.href}
                href={bolum.href}
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-ark-ink-2 transition duration-200 hover:bg-ark-surface hover:text-ark-ink hover:shadow-ark-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
              >
                {bolum.metin}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobilde "Giriş Yap" menünün içindedir; masaüstünde header'da kalır. */}
            <a
              href="/login"
              className={`hidden whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold text-ark-ink-2 sm:px-4 lg:inline-flex ${BAGLANTI}`}
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

      <HeroKaydirici />

      <AkisBolumu />

      <UrunlerBolumu />

      <KullanimVitrini />

      <KonuKaydirici />

      {/*
        Gizlilik — koyu lacivert.

        Sayfanın ikinci koyu bölümü: hero ile görsel olarak eşleşir ve güven
        mesajını sayfanın geri kalanından ayırır.
      */}
      <section
        id="guvenlik"
        aria-labelledby="guvenlik-basligi"
        className="scroll-mt-24 bg-ark-surface-dark"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-16">
          <BolumGecisi>
            <p className="ark-etiket text-ark-accent-on-dark">Gizlilik</p>

            <h2
              id="guvenlik-basligi"
              className="ark-baslik mt-3 text-balance text-ark-on-dark"
            >
              Bulunabilirlik, mahremiyet pahasına olmaz
            </h2>

            <p className="ark-olcu mt-5 leading-relaxed text-ark-on-dark-2">
              Eşyanı bulan kişinin sana ulaşabilmesi için kişisel bilgilerinin
              ortada durması gerekmiyor.
            </p>

            <ol className="mt-10 space-y-6">
              {GIZLILIK_MADDELERI.map((madde) => (
                <li key={madde.numara} className="flex gap-5">
                  <span
                    aria-hidden="true"
                    className="shrink-0 pt-1 text-sm font-bold tracking-wider text-ark-accent-on-dark"
                  >
                    {madde.numara}
                  </span>

                  <span className="border-l border-ark-line-dark pl-5 text-lg leading-relaxed text-ark-on-dark">
                    {madde.metin}
                  </span>
                </li>
              ))}
            </ol>
          </BolumGecisi>

          <BolumGecisi gecikme={120}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-ark-line-dark shadow-ark-3">
              <Gorsel
                anahtar="mesajlasma"
                sizes="(min-width: 1024px) 48vw, 90vw"
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
        className="scroll-mt-24 border-b border-ark-line bg-ark-surface"
      >
        <div className="mx-auto max-w-3xl px-6 py-20 sm:px-8 sm:py-28">
          <BolumGecisi>
            <p className="ark-etiket text-ark-accent">SSS</p>

            <h2 id="sss-basligi" className="ark-baslik mt-3 text-ark-ink">
              Sık sorulan sorular
            </h2>
          </BolumGecisi>

          <div className="mt-10 divide-y divide-ark-line border-y border-ark-line">
            {SORULAR.map((oge, sira) => (
              <BolumGecisi key={oge.soru} gecikme={Math.min(sira * 60, 300)}>
                <details className="group">
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
      <section className="bg-ark-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
          <BolumGecisi className="mx-auto max-w-2xl text-center">
            <h2 className="ark-baslik text-balance text-ark-ink">
              Eşyana dijital kimlik ver
            </h2>

            <p className="mt-5 leading-relaxed text-ark-ink-2">
              Etiketini seç, hesabına bağla ve numaran görünmeden bildirim al.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
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
          </BolumGecisi>
        </div>
      </section>

      {/*
        Footer yalnızca GERÇEKTEN VAR OLAN sayfalara bağlanır. Sosyal medya
        veya hukuki metin bağlantısı eklenmez: bu hesaplar/sayfalar projede
        tanımlı değildir ve kırık bağlantı üretmemek için uydurulmaz.
      */}
      <footer className="border-t border-ark-line bg-ark-surface">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <ArkviumTamLogo genislik={124} />

              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ark-ink-3">
                Dijital Sahiplik Platformu. Eşyalarına QR kodlu dijital kimlik
                ver; kişisel bilgilerin görünmeden sana ulaşılsın.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ark-ink">Ürünler</h2>
              <ul className="mt-4 space-y-1 text-sm text-ark-ink-3">
                <li>
                  <a
                    href="/#urunler"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Tüm ürünler
                  </a>
                </li>
                <li>
                  <Link
                    href="/urun/arac-stickeri"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Araç İletişim QR Sticker&apos;ı
                  </Link>
                </li>
                <li>
                  <a
                    href="/#senaryolar"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Kullanım alanları
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ark-ink">
                Nasıl çalışır
              </h2>
              <ul className="mt-4 space-y-1 text-sm text-ark-ink-3">
                <li>
                  <a
                    href="/#nasil"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Üç adımda kullanım
                  </a>
                </li>
                <li>
                  <a
                    href="/#acil-durum"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Acil Durum Profili
                  </a>
                </li>
                <li>
                  <a
                    href="/#guvenlik"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Gizlilik
                  </a>
                </li>
                <li>
                  <a
                    href="/#sss"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Sık sorulan sorular
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-ark-ink">Hesap</h2>
              <ul className="mt-4 space-y-1 text-sm text-ark-ink-3">
                <li>
                  <Link
                    href="/login"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Giriş yap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    Hesap oluştur
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account/tags/activate"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
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
