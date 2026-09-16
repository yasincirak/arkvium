import type { Metadata } from "next";
import Link from "next/link";
import AkisBolumu from "@/components/AkisBolumu";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import DilSecici from "@/components/DilSecici";
import KonuKaydirici from "@/components/KonuKaydirici";
import KullanimVitrini from "@/components/KullanimVitrini";
import MobilMenu from "@/components/MobilMenu";
import { Gorsel, TemsiliRozet } from "@/components/gorsel/UrunGorselleri";
import HeroKaydirici from "@/components/hero/HeroKaydirici";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
import { aktifDil, sozluk } from "@/lib/i18n";
import { CANLI_ADRES, PAYLASIM_GORSELI } from "@/lib/seo";
import UrunlerBolumu from "@/components/UrunlerBolumu";
import CerezTercihleriBaglantisi from "@/components/CerezTercihleriBaglantisi";
import { HUKUKI_BELGE_LISTESI } from "@/lib/hukuki-belgeler";

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
export function generateMetadata(): Metadata {
  const s = sozluk();

  return {
    title: s.seo.anaBaslik,
    description: s.seo.anaAciklama,
    alternates: { canonical: CANLI_ADRES },
  // DİKKAT: Next.js sayfa düzeyindeki `openGraph` nesnesini üsttekiyle
  // BİRLEŞTİRMEZ, üzerine yazar. Bu yüzden alanlar burada tekrar verilir.
    openGraph: {
      title: s.seo.anaBaslik,
      description: s.seo.anaAciklama,
      siteName: "ARKVIUM",
      locale: aktifDil() === "en" ? "en_US" : "tr_TR",
      type: "website",
      url: CANLI_ADRES,
      images: [PAYLASIM_GORSELI],
    },
  };
}

/** Üst bardaki ve footer'daki bağlantılar için ortak sınıf. */
const BAGLANTI =
  "transition duration-200 hover:text-ark-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent";

export default function Home() {
  const s = sozluk();
  const dil = aktifDil();

  /** Üst barda ve mobil menüde AYNI sırayla kullanılan bölüm çıpaları. */
  const BOLUMLER = [
    { href: "#nasil", metin: s.header.nasilCalisir },
    { href: "#urunler", metin: s.header.urunler },
    { href: "#senaryolar", metin: s.header.kullanim },
    { href: "#acil-durum", metin: s.header.acilDurum },
    { href: "#guvenlik", metin: s.header.gizlilik },
    { href: "#sss", metin: s.header.sss },
  ];

  /**
   * Gizlilik bölümündeki üç ifade — ürünün DOĞRULANMIŞ davranışı.
   * Bilerek genişletilmez; ölçülemeyen hiçbir iddia eklenmez.
   */
  const GIZLILIK_MADDELERI = [
    { numara: "01", metin: s.gizlilik.madde1 },
    { numara: "02", metin: s.gizlilik.madde2 },
    { numara: "03", metin: s.gizlilik.madde3 },
  ];

  const SORULAR = [s.sss.s1, s.sss.s2, s.sss.s3, s.sss.s4, s.sss.s5, s.sss.s6];

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
            aria-label={s.header.bolumler}
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
            {/*
              Dil seçici masaüstünde header'da açıkça görünür; mobilde
              hamburger menünün içinde yer alır (bkz. MobilMenu).
            */}
            <DilSecici
              aktif={dil}
              etiketler={s.dil}
              className="hidden lg:inline-flex"
            />

            {/* Mobilde "Giriş Yap" menünün içindedir; masaüstünde header'da kalır. */}
            <a
              href="/login"
              className={`hidden whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold text-ark-ink-2 sm:px-4 lg:inline-flex ${BAGLANTI}`}
            >
              {s.header.girisYap}
            </a>

            <a
              href="/register"
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-xl bg-ark-accent px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-ark-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent sm:px-5 md:min-h-0"
            >
              {s.header.hemenBasla}
            </a>

            <MobilMenu
              baglantilar={[
                ...BOLUMLER,
                { href: "/login", metin: s.header.girisYap },
              ]}
              etiketler={{ ac: s.header.menuAc, kapat: s.header.menuKapat }}
              altIcerik={<DilSecici aktif={dil} etiketler={s.dil} />}
            />
          </div>
        </div>
      </header>

      <HeroKaydirici
        metinler={{
          oncekiSlayt: s.hero.oncekiSlayt,
          sonrakiSlayt: s.hero.sonrakiSlayt,
          slaydiGoster: s.hero.slaydiGoster,
          temsiliGorsel: s.gorsel.temsili,
          /*
            DÖRT SLAYT.

            1-3: ürün slaytları — her biri kendi sipariş adresine gider.
            Ürün detay sayfası yalnızca araç sticker'ında bulunduğu için
            diğerleri mevcut ve çalışan `/siparis?urun=<kod>` adresini
            kullanır (kodlar src/lib/siparis.ts kaynağındandır).

            4: acil durum — `a5a59c8^` sürümünden geri getirildi; yapı,
            bilgi etiketleri, iki düğmesi ve beyan uyarısı aynen korundu.
          */
          slaytlar: [
            {
              kod: "valiz-etiketi",
              ...s.hero.esyalar,
              gorsel: "hero-valiz",
              dugmeler: [
                {
                  metin: s.hero.esyalar.dugme,
                  href: "/siparis?urun=valiz-etiketi",
                  tur: "birincil",
                },
              ],
            },
            {
              kod: "metal-anahtarlik",
              ...s.hero.anahtarlik,
              gorsel: "hero-anahtarlik",
              dugmeler: [
                {
                  metin: s.hero.anahtarlik.dugme,
                  href: "/siparis?urun=metal-anahtarlik",
                  tur: "birincil",
                },
              ],
            },
            {
              kod: "evcil-hayvan-kunyesi",
              ...s.hero.kunye,
              gorsel: "hero-kunye",
              dugmeler: [
                {
                  metin: s.hero.kunye.dugme,
                  href: "/siparis?urun=evcil-hayvan-kunyesi",
                  tur: "birincil",
                },
              ],
            },
            {
              kod: "acil-durum",
              ...s.hero.acilDurum,
              acilDurum: true,
              bilgiEtiketleri: [
                s.hero.acilDurum.bilgiler.kanGrubu,
                s.hero.acilDurum.bilgiler.alerjiler,
                s.hero.acilDurum.bilgiler.ilaclar,
                s.hero.acilDurum.bilgiler.kisiler,
              ],
              gorsel: "acil-durum",
              beyanUyarisi: s.hero.acilDurum.beyan,
              dugmeler: [
                {
                  metin: s.hero.acilDurum.dugmeBirincil,
                  href: "#acil-durum",
                  tur: "birincil",
                },
                {
                  metin: s.hero.acilDurum.dugmeIkincil,
                  href: "#nasil",
                  tur: "ikincil",
                },
              ],
            },
          ],
        }}
      />

      <AkisBolumu />

      <UrunlerBolumu />

      <KullanimVitrini />

      <KonuKaydirici
        metinler={{
          etiket: s.konuKaydirici.etiket,
          baslik: s.konuKaydirici.baslik,
          onceki: s.konuKaydirici.onceki,
          sonraki: s.konuKaydirici.sonraki,
          basliklar: s.konuKaydirici.basliklar,
          konuyuGoster: s.konuKaydirici.konuyuGoster,
          temsiliGorsel: s.gorsel.temsili,
          slaytlar: [
            {
              kod: "acil-durum",
              ...s.konuKaydirici.acilDurum,
              maddeler: [
                s.konuKaydirici.acilDurum.m1,
                s.konuKaydirici.acilDurum.m2,
                s.konuKaydirici.acilDurum.m3,
              ],
              gorsel: "arac",
            },
            {
              kod: "kayip-esya",
              ...s.konuKaydirici.kayipEsya,
              maddeler: [
                s.konuKaydirici.kayipEsya.m1,
                s.konuKaydirici.kayipEsya.m2,
                s.konuKaydirici.kayipEsya.m3,
              ],
              gorsel: "hero",
            },
            {
              kod: "evcil-hayvan",
              ...s.konuKaydirici.evcilHayvan,
              maddeler: [
                s.konuKaydirici.evcilHayvan.m1,
                s.konuKaydirici.evcilHayvan.m2,
                s.konuKaydirici.evcilHayvan.m3,
              ],
              gorsel: "evcil-hayvan",
            },
            {
              kod: "guvenli-iletisim",
              ...s.konuKaydirici.guvenliIletisim,
              maddeler: [
                s.konuKaydirici.guvenliIletisim.m1,
                s.konuKaydirici.guvenliIletisim.m2,
                s.konuKaydirici.guvenliIletisim.m3,
              ],
              gorsel: "mesajlasma",
            },
          ],
        }}
      />

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
            <p className="ark-etiket text-ark-accent-on-dark">
              {s.gizlilik.etiket}
            </p>

            <h2
              id="guvenlik-basligi"
              className="ark-baslik mt-3 text-balance text-ark-on-dark"
            >
              {s.gizlilik.baslik}
            </h2>

            <p className="ark-olcu mt-5 leading-relaxed text-ark-on-dark-2">
              {s.gizlilik.giris}
            </p>

            {/*
              GÜVEN KARTLARI.

              Önceden ince bir dikey çizgiyle ayrılmış düz listeydi;
              maddeler birbirine akıyor, göz "kaç madde var" sorusunu
              hızlı cevaplayamıyordu. Her madde kendi kutusuna alındı:
              numara dolu turkuaz rozette, metin altında. Koyu lacivert
              zeminde beyaz metin 16.97:1 (AAA), turkuaz rozet üzerinde
              beyaz 5.47:1 (AA).
            */}
            <ol className="mt-10 space-y-4">
              {GIZLILIK_MADDELERI.map((madde) => (
                <li
                  key={madde.numara}
                  className="flex gap-4 rounded-2xl border border-ark-line-dark bg-white/5 p-5 transition-colors duration-200 hover:border-ark-accent-on-dark sm:gap-5 sm:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ark-accent text-sm font-bold tracking-wider text-white"
                  >
                    {madde.numara}
                  </span>

                  <span className="self-center text-base leading-relaxed text-ark-on-dark sm:text-lg">
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
              <TemsiliRozet metin={s.gorsel.temsili} />
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
            <p className="ark-etiket text-ark-accent">{s.sss.etiket}</p>

            <h2 id="sss-basligi" className="ark-baslik mt-3 text-ark-ink">
              {s.sss.baslik}
            </h2>
          </BolumGecisi>

          {/*
            SSS AÇILIR KARTLARI.

            Önceden tek bir çizgili liste blokuydu; sorular birbirinden
            ayrılmıyordu. Her soru kendi kartına alındı ve açıkken
            yumuşak turkuaz zemine geçerek hangi sorunun açık olduğunu
            belli ediyor.

            ERİŞİLEBİLİRLİK: `<details>/<summary>` korunuyor — klavyeyle
            Tab ile gezilir, Enter/Space ile açılıp kapanır ve ekran
            okuyucuya açık/kapalı durumu tarayıcı tarafından bildirilir.
            Ek ARIA gerekmez. Dokunma hedefi 44px'in altına düşmez.
          */}
          <div className="mt-10 space-y-3">
            {SORULAR.map((oge, sira) => (
              <BolumGecisi key={oge.soru} gecikme={Math.min(sira * 60, 300)}>
                <details className="group overflow-hidden rounded-2xl border border-ark-line bg-ark-surface transition-colors duration-200 hover:border-ark-accent">
                  {/*
                    Açık durum `group-open:` ile boyanır: aynı varyant
                    hem başlığı hem rozeti hem de cevabı kapsadığı için
                    kart tek parça görünür.
                  */}
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-ark-ink outline-none transition-colors duration-200 group-open:bg-ark-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent">
                    {oge.soru}

                    <span
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ark-accent-soft text-xl leading-none text-ark-accent transition duration-200 group-open:rotate-45 group-open:bg-ark-accent group-open:text-white motion-reduce:transition-none"
                    >
                      +
                    </span>
                  </summary>

                  <p className="bg-ark-accent-soft px-5 pb-5 leading-relaxed text-ark-ink-2">
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
              {s.sonCagri.baslik}
            </h2>

            <p className="mt-5 leading-relaxed text-ark-ink-2">
              {s.sonCagri.metin}
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/#urunler"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-ark-ink px-8 py-3.5 font-semibold text-white transition duration-200 hover:bg-ark-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent active:scale-[0.98] motion-reduce:active:scale-100"
              >
                {s.sonCagri.urunleriIncele}
              </Link>

              <Link
                href="/account/tags/activate"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-ark-line-strong bg-ark-surface px-8 py-3.5 font-semibold text-ark-ink transition duration-200 hover:bg-ark-surface-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
              >
                {s.sonCagri.etiketiEtkinlestir}
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
      {/*
        Footer, beyaz gövdeden ayrılsın diye bir ton koyu yüzeye oturur.
        KOYU LACİVERT YAPILMADI: `ArkviumTamLogo` siyah-beyaz bir
        dosyadır ve koyu zeminde okunmaz (bkz. HeroKaydirici'deki not).
      */}
      <footer className="border-t border-ark-line bg-ark-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <ArkviumTamLogo genislik={124} />

              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ark-ink-3">
                {s.footer.aciklama}
              </p>
            </div>

            <div>
              <h2 className="ark-etiket text-ark-accent">
                {s.footer.urunler}
              </h2>
              <ul className="mt-4 space-y-1 text-sm text-ark-ink-3">
                <li>
                  <a
                    href="/#urunler"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.tumUrunler}
                  </a>
                </li>
                <li>
                  <Link
                    href="/urun/arac-stickeri"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.urunler.ad.aracStickeri}
                  </Link>
                </li>
                <li>
                  <a
                    href="/#senaryolar"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.kullanimAlanlari}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="ark-etiket text-ark-accent">
                {s.footer.nasilCalisir}
              </h2>
              <ul className="mt-4 space-y-1 text-sm text-ark-ink-3">
                <li>
                  <a
                    href="/#nasil"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.ucAdimdaKullanim}
                  </a>
                </li>
                <li>
                  <a
                    href="/#acil-durum"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >{s.acilDurumPaneli.baslik}</a>
                </li>
                <li>
                  <a
                    href="/#guvenlik"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.gizlilik}
                  </a>
                </li>
                <li>
                  <a
                    href="/#sss"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.sss}
                  </a>
                </li>
                {/*
                  Hukuki belgeler TEK KAYNAKTAN üretilir; adresler burada
                  elle yazılmaz (bkz. src/lib/hukuki-belgeler.ts).
                */}
                {HUKUKI_BELGE_LISTESI.map((belge) => (
                  <li key={belge.yol}>
                    <Link
                      href={belge.yol}
                      className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                    >
                      {belge.baslik}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/cerez-politikasi"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.cerezPolitikasi}
                  </Link>
                </li>
                <li>
                  {/* Tercihi sonradan değiştirme: mevzuatın gereği. */}
                  <CerezTercihleriBaglantisi
                    className={`flex min-h-[44px] items-center text-left md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  />
                </li>
              </ul>
            </div>

            <div>
              <h2 className="ark-etiket text-ark-accent">
                {s.footer.hesap}
              </h2>
              <ul className="mt-4 space-y-1 text-sm text-ark-ink-3">
                <li>
                  <Link
                    href="/login"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.girisYap}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.hesapOlustur}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account/tags/activate"
                    className={`flex min-h-[44px] items-center md:min-h-0 md:py-1.5 ${BAGLANTI}`}
                  >
                    {s.footer.etiketimiEtkinlestir}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-ark-line pt-6 text-center text-sm text-ark-ink-3">
            {s.footer.telifHakki}
          </div>
        </div>
      </footer>
    </main>
  );
}
