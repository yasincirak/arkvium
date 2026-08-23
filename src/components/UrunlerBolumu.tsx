import Link from "next/link";
import BolumGecisi from "@/components/animasyon/BolumGecisi";
import {
  Gorsel,
  TemsiliRozet,
  urunGorselAnahtari,
} from "@/components/gorsel/UrunGorselleri";
import { fiyatBicimle, KARGO_NOTU, SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Ana sayfadaki "Ürünler ve Fiyatlar" bölümü.
 *
 * Her kart, ürünün kendi koduyla sipariş akışına gider; ödeme mevcut iyzico
 * akışıyla alınır. Ürün adı ve fiyatı `@/lib/siparis` içinde tek yerde durur;
 * burada tekrar yazılmaz ve adres satırına fiyat KONULMAZ.
 *
 * Araç ürünü önce kendi detay sayfasına gider; diğer ürünler doğrudan
 * sipariş sayfasına gider (mevcut davranış).
 */

/** Detay sayfası bulunan ürünler. Diğerleri doğrudan siparişe gider. */
const DETAY_SAYFALARI: Record<string, string> = {
  "arac-stickeri": "/urun/arac-stickeri",
};

export default function UrunlerBolumu() {
  return (
    <section id="urunler" className="border-y border-[#e5e0ff] bg-[#f6f4ff]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <BolumGecisi>
          <h2 className="text-center text-3xl font-bold">Ürünler ve Fiyatlar</h2>

          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Etiketini seç, güvenli ödemeyle satın al. Etiketin eline ulaştığında
            hesabına bağlayıp eşyanla eşleştirirsin.
          </p>
        </BolumGecisi>

        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {SIPARIS_URUNLERI.map((urun, sira) => {
            const detay = DETAY_SAYFALARI[urun.kod];
            const gorselAnahtari = urunGorselAnahtari(urun.kod);

            return (
              <BolumGecisi
                key={urun.kod}
                gecikme={sira * 70}
                className="flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
              >
                {gorselAnahtari && (
                  <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                    <Gorsel
                      anahtar={gorselAnahtari}
                      sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, 90vw"
                      className="transition duration-500 hover:scale-[1.04] motion-reduce:transform-none"
                    />
                    <TemsiliRozet />
                  </div>
                )}

                <h3 className="text-xl font-semibold">{urun.ad}</h3>

                <p className="mt-3 flex-1 leading-relaxed text-slate-600">
                  {urun.aciklama}
                </p>

                <div className="mt-6">
                  <div className="text-2xl font-bold">
                    {fiyatBicimle(urun.fiyatKurus)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{KARGO_NOTU}</div>
                </div>

                {/*
                  Detay sayfası olan üründe kart ÖNCE detay sayfasına gider;
                  satın alma oradaki düğmelerle yapılır. Detay sayfası olmayan
                  ürünlerin mevcut davranışı (doğrudan sipariş) korunur.
                */}
                <Link
                  href={detay ?? `/siparis?urun=${urun.kod}`}
                  className="mt-6 inline-flex justify-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-500 active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  {detay ? "Ürünü İncele" : "Satın Al"}
                </Link>
              </BolumGecisi>
            );
          })}
        </div>
      </div>
    </section>
  );
}
