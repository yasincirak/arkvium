import Link from "next/link";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import {
  Gorsel,
  TemsiliRozet,
  type GorselAnahtari,
} from "@/components/gorsel/UrunGorselleri";

/**
 * Kullanım vitrini.
 *
 * Eskiden bu bölüm tek büyük araç görseli + altında dört düz metin kartıydı;
 * senaryolar birbirinden ayırt edilemiyordu. Yerine görsel ağırlıklı,
 * farklı boyutlarda kutulardan oluşan bir yerleşim kondu: her senaryonun
 * kendi fotoğrafı var ve kutular aynı boyutta olmadığı için göz sayfada
 * ritim yakalar.
 *
 * Metin fotoğrafın üzerine biner; okunabilirliği `.ark-perde` maskesi
 * güvenceye alır (bkz. globals.css).
 */

type Senaryo = {
  anahtar: GorselAnahtari;
  baslik: string;
  metin: string;
  /** Yerleşimde kapladığı alan; yalnızca `lg` ve üzerinde geçerli. */
  genis?: boolean;
  /** Yalnızca kendi ayrıntı sayfası olan üründe bulunur. */
  baglanti?: { href: string; metin: string };
};

const SENARYOLAR: Senaryo[] = [
  {
    anahtar: "arac",
    baslik: "Araç",
    metin:
      "Hatalı park, açık unutulan far veya araçla ilgili bir durumda sürücüler sana ulaşsın — camında numaran yazmadan.",
    genis: true,
    baglanti: { href: "/urun/arac-stickeri", metin: "Araç ürününü incele" },
  },
  {
    anahtar: "anahtarlik",
    baslik: "Anahtar",
    metin: "Düşen ev ve araç anahtarların sana dönsün.",
  },
  {
    anahtar: "evcil-hayvan",
    baslik: "Evcil hayvan",
    metin: "Künyeyi okutan kişi seninle güvenle iletişime geçsin.",
  },
  {
    anahtar: "valiz",
    baslik: "Valiz",
    metin: "Bagaj bandında karışan valizin sahibini bulsun.",
  },
  {
    anahtar: "hero",
    baslik: "Kayıp eşya",
    metin: "Eşyanı kayıp işaretle; QR'ı okutan kişi bu uyarıyı görsün.",
  },
];

export default function KullanimVitrini() {
  return (
    <section
      id="senaryolar"
      aria-labelledby="senaryolar-basligi"
      className="scroll-mt-24 border-b border-ark-line bg-ark-surface-2"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <BolumGecisi className="max-w-2xl">
          <p className="ark-etiket text-ark-accent">Kullanım</p>

          <h2 id="senaryolar-basligi" className="ark-baslik mt-3 text-ark-ink">
            Değer verdiğin her şeye takılır
          </h2>

          <p className="ark-giris mt-4 text-ark-ink-2">
            Aynı sistem farklı eşyalarda çalışır: QR okutulur, sana ARKVIUM
            üzerinden mesaj gelir.
          </p>
        </BolumGecisi>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {SENARYOLAR.map((senaryo, sira) => (
            <BolumGecisi
              key={senaryo.baslik}
              gecikme={Math.min(sira * 70, 300)}
              className={
                senaryo.genis
                  ? "group relative overflow-hidden rounded-3xl border border-ark-line bg-ark-ink-deep shadow-ark-2 sm:col-span-2 lg:row-span-2"
                  : "group relative overflow-hidden rounded-3xl border border-ark-line bg-ark-ink-deep shadow-ark-1"
              }
            >
              <div
                className={
                  senaryo.genis
                    ? "relative aspect-[4/3] lg:h-full lg:min-h-[26rem]"
                    : "relative aspect-[4/3] lg:min-h-[12.5rem]"
                }
              >
                <Gorsel
                  anahtar={senaryo.anahtar}
                  sizes={
                    senaryo.genis
                      ? "(min-width: 1024px) 576px, (min-width: 640px) 92vw, 92vw"
                      : "(min-width: 1024px) 288px, (min-width: 640px) 45vw, 92vw"
                  }
                  className="transition duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none"
                />

                {/* Metnin okunabilirliğini güvenceye alan maske */}
                <div
                  aria-hidden="true"
                  className="ark-perde pointer-events-none absolute inset-0"
                />

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h3
                    className={
                      senaryo.genis
                        ? "text-2xl font-bold text-ark-on-dark sm:text-3xl"
                        : "text-lg font-bold text-ark-on-dark"
                    }
                  >
                    {senaryo.baslik}
                  </h3>

                  <p
                    className={
                      senaryo.genis
                        ? "ark-olcu mt-2 leading-relaxed text-ark-on-dark-2"
                        : "mt-1.5 text-sm leading-relaxed text-ark-on-dark-2"
                    }
                  >
                    {senaryo.metin}
                  </p>

                  {senaryo.baglanti && (
                    <Link
                      href={senaryo.baglanti.href}
                      className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ark-ink transition duration-200 hover:bg-ark-on-dark-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent-on-dark"
                    >
                      {senaryo.baglanti.metin}
                    </Link>
                  )}
                </div>

                {/*
                  Rozet normalde sağ ALTTA durur; burada alt kenar metin
                  bloğuna ayrıldığı için üst köşeye taşınır. Rozet bileşeni
                  değiştirilmez — konumlandırılmış küçük bir kutunun içine
                  alınarak yeri değiştirilir.
                */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 h-11 w-40"
                >
                  <TemsiliRozet />
                </div>
              </div>
            </BolumGecisi>
          ))}
        </div>
      </div>
    </section>
  );
}
