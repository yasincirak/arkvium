import Link from "next/link";
import { Gorsel, TemsiliRozet } from "@/components/gorsel/UrunGorselleri";

/**
 * Ana sayfa hero bölümü.
 *
 * TEK GÖREVİ: ziyaretçi ilk ekranda ARKVIUM'un ne yaptığını anlamalı.
 * Bu yüzden başlık bir slogan değil, bir TANIMdır; hemen altında akış üç
 * adımda özetlenir.
 *
 * Otomatik dönen carousel KULLANILMAZ (DESIGN.md § 12): kullanıcı okurken
 * içerik kayar ve mesaj hangi slaytta olduğuna bağlı hâle gelir. Tek ve
 * sabit bir anlatım, ilk bakışta anlaşılırlık için daha güvenilirdir.
 *
 * Bileşen tamamen sunucu tarafındadır; istemci JavaScript'i gerektirmez.
 */

/** Akışın üç adımı — hero'da özet, "Nasıl çalışır" bölümünde ayrıntılı. */
const AKIS = [
  {
    numara: "1",
    baslik: "Etiketi eşyana tak",
    metin: "Sticker'ı yapıştır, künyeyi veya anahtarlığı tak.",
  },
  {
    numara: "2",
    baslik: "Hesabına bağla",
    metin: "Etiketi bir kez etkinleştir, eşyanla eşleştir.",
  },
  {
    numara: "3",
    baslik: "Bulan kişi ulaşsın",
    metin: "QR okutulur, sana bildirim gelir — numaran görünmeden.",
  },
];

export default function HeroBolumu() {
  return (
    <section
      aria-labelledby="hero-basligi"
      className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        {/*
         * Metin her zaman ÖNCE gelir. Mobilde görsel altta kalır; ziyaretçi
         * önce ne olduğunu okur, sonra ürünü görür (DESIGN.md § 9).
         */}
        <div data-gecis="">
          <p className="ark-etiket text-ark-accent">
            Dijital Sahiplik Platformu
          </p>

          <h1 id="hero-basligi" className="ark-display mt-4 text-ark-ink">
            Eşyalarına QR kodlu bir kimlik ver
          </h1>

          <p className="ark-giris ark-olcu mt-6 text-ark-ink-2">
            ARKVIUM etiketini eşyana takarsın, hesabına bağlarsın. Eşyan
            kaybolduğunda bulan kişi QR kodu okutur ve sana ulaşır — telefon
            numaran ve adresin ona gösterilmeden.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#urunler"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-ark-ink px-6 py-3 font-semibold text-white transition duration-200 hover:bg-ark-ink-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent active:scale-[0.98] motion-reduce:active:scale-100"
            >
              Ürünleri incele
            </Link>

            <Link
              href="#nasil"
              className="inline-flex min-h-[44px] items-center rounded-xl border border-ark-line-strong px-6 py-3 font-semibold text-ark-ink transition duration-200 hover:bg-ark-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
            >
              Nasıl çalışır?
            </Link>
          </div>

          {/* Akış özeti: başlığın vaadini somutlaştırır. */}
          <ol className="mt-10 grid gap-4 border-t border-ark-line pt-8 sm:grid-cols-3">
            {AKIS.map((adim) => (
              <li key={adim.numara}>
                <span
                  aria-hidden="true"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ark-accent-soft text-sm font-bold text-ark-accent"
                >
                  {adim.numara}
                </span>

                <h2 className="mt-3 text-base font-semibold text-ark-ink">
                  {adim.baslik}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-ark-ink-3">
                  {adim.metin}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/*
         * Görsel kutusu sabit en-boy oranı taşır: yüklenirken sayfa
         * atlamaz (CLS = 0). `priority` yalnızca burada verilir.
         */}
        <div
          data-gecis=""
          style={{ animationDelay: "120ms" }}
          className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ark-surface-3 shadow-ark-3 lg:aspect-[5/4]"
        >
          <Gorsel
            anahtar="hero"
            oncelikli
            sizes="(min-width: 1024px) 560px, 92vw"
          />
          <TemsiliRozet />
        </div>
      </div>
    </section>
  );
}
