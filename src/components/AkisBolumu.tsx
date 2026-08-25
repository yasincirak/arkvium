import BolumGecisi from "@/components/animasyon/BolumGecisi";
import {
  IkonKalkan,
  IkonPanel,
  IkonTarama,
  IkonTasima,
} from "@/components/gorsel/Ikonlar";
import {
  Gorsel,
  TemsiliRozet,
  type GorselAnahtari,
} from "@/components/gorsel/UrunGorselleri";

/**
 * "Nasıl çalışır" akışı.
 *
 * Bu bölüm eskiden ÜÇ AYRI bölümdü — "Neden ARKVIUM?", "Dört adımda
 * kullanım" ve "Size ne sağlar?" — ve üçü de arka arkaya aynı dört beyaz
 * karttan oluşuyordu. Tekrar, sayfayı şablona benzetiyordu.
 *
 * Yerine tek bir anlatım kondu: üç adım, sırayla ve BÜYÜK görsellerle,
 * satırlar dönüşümlü hizalanarak (zikzak). Kart yok, ızgara yok.
 *
 * Faydalar akışın altında ince bir şerit olarak durur: bilgi korunur ama
 * dördüncü bir kart ızgarası üretmez.
 */

type Adim = {
  numara: string;
  baslik: string;
  metin: string;
  gorsel: GorselAnahtari;
};

const ADIMLAR: Adim[] = [
  {
    numara: "01",
    baslik: "Etiketi eşyana uygula",
    // Metin görselle uyumlu tutulur: fotoğrafta yalnızca sticker'lar var,
    // bu yüzden künye/anahtarlık burada sayılmaz — ürün çeşitleri "Ürün
    // ailesi" bölümünde kendi fotoğraflarıyla anlatılıyor.
    metin:
      "Yapıştır ya da tak, işlem bu kadar. Kurulum, uygulama indirme veya pil gerekmez.",
    gorsel: "sticker-seti",
  },
  {
    numara: "02",
    baslik: "Hesabına bağla",
    metin:
      "Etiketin üzerindeki aktivasyon kodunu ARKVIUM hesabına girersin ve etiketi eşyanla eşleştirirsin. Bir kez yapılır.",
    gorsel: "aktivasyon",
  },
  {
    numara: "03",
    baslik: "QR okutulduğunda güvenli mesaj al",
    metin:
      "Eşyanı bulan kişi QR'ı telefonuyla okutur ve sana mesaj bırakır. Bildirim sana ARKVIUM üzerinden ulaşır.",
    gorsel: "mesajlasma",
  },
];

const FAYDALAR = [
  {
    Ikon: IkonTarama,
    baslik: "Kurulum gerektirmez",
    metin: "QR tarayıcıda açılır; karşı taraf uygulama yüklemez.",
  },
  {
    Ikon: IkonKalkan,
    baslik: "Numaran açıkta durmaz",
    metin: "Etikette telefon numaran yazmaz.",
  },
  {
    Ikon: IkonTasima,
    baslik: "Etiketi taşıyabilirsin",
    metin: "Eşyan değişirse etiketi başka bir kayda bağlarsın.",
  },
  {
    Ikon: IkonPanel,
    baslik: "Tek panelden yönetirsin",
    metin: "Eşyalar, kayıp durumu ve bildirimler aynı yerde.",
  },
];

export default function AkisBolumu() {
  return (
    <section
      id="nasil"
      aria-labelledby="nasil-basligi"
      className="scroll-mt-24 border-b border-ark-line bg-ark-surface"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <BolumGecisi className="max-w-2xl">
          <p className="ark-etiket text-ark-accent">Nasıl çalışır</p>

          <h2 id="nasil-basligi" className="ark-baslik mt-3 text-ark-ink">
            Üç adım, sonra unut
          </h2>

          <p className="ark-giris mt-4 text-ark-ink-2">
            Etiketi bir kez kurarsın. Gerisi, eşyan kaybolduğu gün kendiliğinden
            çalışır.
          </p>
        </BolumGecisi>

        <ol className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
          {ADIMLAR.map((adim, sira) => {
            // Tek numaralı adımlarda görsel sağda, çiftlerde solda: satırlar
            // aynı ritmi tekrarlamaz. Mobilde her ikisi de metin-önce akar.
            const gorselSolda = sira % 2 === 1;

            return (
              <li key={adim.numara}>
                <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
                  <BolumGecisi
                    className={gorselSolda ? "md:order-2" : undefined}
                  >
                    <div className="flex items-baseline gap-4">
                      <span
                        aria-hidden="true"
                        className="text-5xl font-bold tracking-tight text-ark-accent/25 sm:text-6xl"
                      >
                        {adim.numara}
                      </span>

                      <span className="h-px flex-1 bg-ark-line" />
                    </div>

                    <h3 className="mt-6 text-2xl font-bold text-ark-ink sm:text-3xl">
                      {adim.baslik}
                    </h3>

                    <p className="ark-olcu mt-4 leading-relaxed text-ark-ink-2">
                      {adim.metin}
                    </p>
                  </BolumGecisi>

                  <BolumGecisi
                    gecikme={100}
                    className={gorselSolda ? "md:order-1" : undefined}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-ark-line bg-ark-surface-3 shadow-ark-2">
                      <Gorsel
                        anahtar={adim.gorsel}
                        sizes="(min-width: 768px) 48vw, 90vw"
                      />
                      <TemsiliRozet />
                    </div>
                  </BolumGecisi>
                </div>
              </li>
            );
          })}
        </ol>

        {/*
          Faydalar şeridi: kutu ve gölge yok, yalnızca ince ayırıcılar.
          Böylece yukarıdaki akışın devamı gibi okunur, ayrı bir kart
          ızgarası gibi değil.
        */}
        <BolumGecisi className="mt-20 border-t border-ark-line pt-12 sm:mt-28">
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FAYDALAR.map((oge) => (
              <div key={oge.baslik}>
                <span aria-hidden="true" className="text-ark-accent">
                  <oge.Ikon />
                </span>

                <dt className="mt-4 font-semibold text-ark-ink">
                  {oge.baslik}
                </dt>

                <dd className="mt-2 text-sm leading-relaxed text-ark-ink-3">
                  {oge.metin}
                </dd>
              </div>
            ))}
          </dl>
        </BolumGecisi>
      </div>
    </section>
  );
}
