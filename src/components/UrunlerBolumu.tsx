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

/**
 * Son satırdaki kartların yatay konumu.
 *
 * Beş ürün üç sütuna sığmaz; ikinci satırda iki kart kalır. Bu kartlar
 * `col-start` ile ortalanır, aksi hâlde sola yapışıp ızgarayı dengesiz
 * gösterirler. Sınıf adları Tailwind tarayıcısının görebilmesi için TAM
 * yazılır; string birleştirmeyle üretilmez.
 */
const SON_SATIR_YERLESIMI: Record<number, string> = {
  3: "lg:col-start-2",
  4: "sm:col-start-2 lg:col-start-4",
};

export default function UrunlerBolumu() {
  return (
    <section
      id="urunler"
      aria-labelledby="urunler-basligi"
      className="scroll-mt-24 border-b border-ark-line bg-ark-surface"
    >
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-24">
        {/*
          Başlık bloğu sola hizalı: sayfadaki diğer bölümlerle aynı ritmi
          korur ve ortalanmış çok satırlı metnin mobilde yarattığı okuma
          sorununu baştan ortadan kaldırır (DESIGN.md § 4).
        */}
        <BolumGecisi className="max-w-2xl">
          <p className="ark-etiket text-ark-accent">Ürün ailesi</p>

          <h2 id="urunler-basligi" className="ark-baslik mt-3 text-ark-ink">
            Etiketini seç
          </h2>

          <p className="ark-giris mt-4 text-ark-ink-2">
            Hepsi aynı sistemde çalışır. Farkları nereye takıldıkları, neye
            dayandıkları ve kaç QR etiketi içerdikleridir.
          </p>
        </BolumGecisi>

        {/*
          Izgara `auto-rows-fr` kullanır: satır yükseklikleri eşitlenir, bu
          yüzden BEŞ kartın tamamı aynı yükseklikte olur ve "Satın Al"
          düğmeleri aynı hizaya oturur (flex-wrap bunu yalnızca satır içinde
          sağlıyordu).

          Sütun sayısı ikiye katlanmış ve her kart iki sütun kaplar; böylece
          eksik kalan son satır `col-start` ile ORTALANABİLİR.
        */}
        <div className="mt-12 grid auto-rows-fr gap-6 sm:mt-16 sm:grid-cols-4 lg:grid-cols-6">
          {SIPARIS_URUNLERI.map((urun, sira) => {
            const gorselAnahtari = urunGorselAnahtari(urun.kod);
            const pazarlama = PAZARLAMA[urun.kod];

            return (
              <BolumGecisi
                key={urun.kod}
                // Toplam gecikme 300ms'i aşmaz (DESIGN.md § 8).
                gecikme={Math.min(sira * 70, 300)}
                className={`ark-kart-hover flex flex-col rounded-3xl border border-ark-line bg-ark-surface p-5 shadow-ark-1 sm:col-span-2 sm:p-6 ${SON_SATIR_YERLESIMI[sira] ?? ""}`}
              >
                {gorselAnahtari && (
                  <div className="relative mb-6 aspect-[3/2] overflow-hidden rounded-2xl bg-ark-surface-3">
                    <Gorsel
                      anahtar={gorselAnahtari}
                      sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, 90vw"
                      className="transition duration-300 ease-out hover:scale-[1.04] motion-reduce:transform-none"
                    />
                    <TemsiliRozet />
                  </div>
                )}

                {pazarlama && (
                  <p className="ark-etiket inline-flex self-start rounded-full bg-ark-accent-soft px-3 py-1 text-ark-accent">
                    {pazarlama.kategori}
                  </p>
                )}

                <h3 className="mt-3 text-xl font-bold text-ark-ink">
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

                <div className="border-t border-ark-line pt-5">
                  <div className="text-3xl font-bold tracking-tight text-ark-ink">
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
