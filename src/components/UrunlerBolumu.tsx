import Link from "next/link";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import {
  Gorsel,
  TemsiliRozet,
  urunGorselAnahtari,
} from "@/components/gorsel/UrunGorselleri";
import { fiyatBicimle, KARGO_NOTU, SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Ana sayfadaki "Ürün ailesi" bölümü.
 *
 * SUNUM DİSİPLİNİ (DESIGN.md § 6.1): her kartın iç yapısı aynı sırayı
 * izler — görsel → kategori → ad → senaryo → kapsam → fiyat → eylem.
 * Kartlar eşit yükseklikte durur ve "Satın Al" düğmesi hepsinde AYNI
 * hizadadır; esnek boşluk düğmeyi en alta iter.
 *
 * ANLATIM: ürün soyut övgüyle değil, GERÇEK bir kullanım anıyla anlatılır —
 * "ne zaman işe yarar" sorusunun cevabı yazılır.
 *
 * TEK KAYNAK: ad, açıklama ve fiyat `@/lib/siparis` içinden gelir; burada
 * elle yazılmaz. Aşağıdaki `PAZARLAMA` tablosu yalnızca pazarlama katmanına
 * aittir ve sipariş/ödeme akışına sızmaz.
 */

type PazarlamaBilgisi = {
  /** Ürünün ait olduğu kullanım kategorisi. */
  kategori: string;
  /** Somut kullanım anı: ne zaman işe yarar? */
  senaryo: string;
};

const PAZARLAMA: Record<string, PazarlamaBilgisi> = {
  "sticker-seti": {
    kategori: "Günlük eşya",
    senaryo:
      "Laptop çantanı kafede unuttuğunda, bulan kişi kapaktaki QR'ı okutup sana haber verebilir.",
  },
  "arac-stickeri": {
    kategori: "Araç",
    senaryo:
      "Aracın yanlış yerde kaldığında ya da çıkışı kapattığında, sürücü camdaki QR'dan sana ulaşır.",
  },
  "metal-anahtarlik": {
    kategori: "Anahtar",
    senaryo:
      "Ev ve araç anahtarlarını düşürdüğünde, bulan kişi anahtarlıktaki QR'ı okutarak seni bulur.",
  },
  "evcil-hayvan-kunyesi": {
    kategori: "Evcil hayvan",
    senaryo:
      "Köpeğin tasmasından kurtulup kaybolduğunda, onu bulan kişi künyeyi okutup seninle iletişime geçer.",
  },
  "valiz-etiketi": {
    kategori: "Seyahat",
    senaryo:
      "Valizin bagaj bandında karıştığında, yanlış valizi alan yolcu etiketteki QR'dan sana yazar.",
  },
};

export default function UrunlerBolumu() {
  return (
    <section
      id="urunler"
      aria-labelledby="urunler-basligi"
      className="scroll-mt-24 border-y border-ark-line bg-ark-surface-2"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
        {/*
          Mobilde sola hizalı: giriş paragrafı dar ekranda 4 satıra çıkıyor ve
          ortalanmış çok satırlı metin okunurluğu düşürüyor (DESIGN.md § 4).
          `sm`den itibaren ortalanmış hâline döner; masaüstü değişmez.
        */}
        <BolumGecisi className="text-left sm:text-center">
          <p className="ark-etiket text-ark-accent">Ürün ailesi</p>

          <h2 id="urunler-basligi" className="ark-baslik mt-3 text-ark-ink">
            Her eşya için ayrı bir etiket
          </h2>

          <p className="ark-giris mt-4 max-w-2xl text-ark-ink-2 sm:mx-auto">
            Hepsi aynı sistemde çalışır: etiketi tak, hesabına bağla, bulan
            kişi sana ulaşsın. Farkları nereye takıldıkları ve neye
            dayandıklarıdır.
          </p>
        </BolumGecisi>

        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {SIPARIS_URUNLERI.map((urun, sira) => {
            const gorselAnahtari = urunGorselAnahtari(urun.kod);
            const pazarlama = PAZARLAMA[urun.kod];

            return (
              <BolumGecisi
                key={urun.kod}
                // Toplam gecikme 300ms'i aşmaz (DESIGN.md § 8).
                gecikme={Math.min(sira * 70, 300)}
                className="ark-kart-hover flex w-full flex-col rounded-2xl border border-ark-line bg-ark-surface p-6 shadow-ark-1 sm:w-[calc((100%-1.5rem)/2)] sm:p-7 lg:w-[calc((100%-3rem)/3)]"
              >
                {gorselAnahtari && (
                  <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-xl bg-ark-surface-3">
                    <Gorsel
                      anahtar={gorselAnahtari}
                      sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, 90vw"
                      className="transition duration-300 ease-out hover:scale-[1.04] motion-reduce:transform-none"
                    />
                    <TemsiliRozet />
                  </div>
                )}

                {pazarlama && (
                  <p className="ark-etiket text-ark-ink-3">
                    {pazarlama.kategori}
                  </p>
                )}

                <h3 className="mt-2 text-xl font-semibold text-ark-ink">
                  {urun.ad}
                </h3>

                <p className="mt-3 leading-relaxed text-ark-ink-2">
                  {urun.aciklama}
                </p>

                {pazarlama && (
                  <div className="mt-5 rounded-xl bg-ark-surface-2 p-4">
                    <p className="ark-etiket text-ark-ink-3">
                      Ne zaman işe yarar?
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ark-ink-2">
                      {pazarlama.senaryo}
                    </p>
                  </div>
                )}

                <p className="mt-4 text-sm text-ark-ink-3">
                  {urun.qrAdedi > 1
                    ? `${urun.qrAdedi} adet QR etiketi içerir`
                    : "1 adet QR etiketi içerir"}
                </p>

                {/* Esnek boşluk: fiyat ve düğmeyi tüm kartlarda aynı hizaya iter. */}
                <div className="mt-6 flex-1" aria-hidden="true" />

                <div>
                  <div className="text-2xl font-bold text-ark-ink">
                    {fiyatBicimle(urun.fiyatKurus)}
                  </div>
                  <div className="mt-1 text-sm text-ark-ink-3">
                    {KARGO_NOTU}
                  </div>
                </div>

                <Link
                  href={`/siparis?urun=${urun.kod}`}
                  className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-ark-commerce px-6 py-3 font-semibold text-white transition duration-200 hover:bg-ark-commerce-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  <span>Satın Al</span>
                  <span className="sr-only"> — {urun.ad}</span>
                </Link>
              </BolumGecisi>
            );
          })}
        </div>
      </div>
    </section>
  );
}
