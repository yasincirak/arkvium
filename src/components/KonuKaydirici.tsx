"use client";

import { useCallback, useId, useState } from "react";
import {
  Gorsel,
  TemsiliRozet,
  type GorselAnahtari,
} from "@/components/gorsel/UrunGorselleri";

/**
 * Konu kaydırıcı — ARKVIUM'un ne yaptığını başlık başlık anlatır.
 *
 * OTOMATİK DÖNMEZ. Bu bilinçli bir karardır: kendi kendine geçen bir
 * kaydırıcı, ziyaretçi tam okurken içeriği değiştirir ve klavye/ekran
 * okuyucu kullanıcısını cezalandırır. Geçişi HER ZAMAN kullanıcı başlatır:
 * ok düğmeleri, nokta göstergeleri ve sol/sağ ok tuşları.
 *
 * Yükseklik sabittir: tüm slaytlar aynı esnek satırda durduğu için kapsayıcı
 * en uzun slaytın yüksekliğini alır ve geçişte sayfa zıplamaz.
 *
 * Hareket azaltma tercihinde kayma animasyonu `globals.css` içindeki genel
 * kural tarafından kapatılır; slayt anında değişir.
 */

type Slayt = {
  kod: string;
  etiket: string;
  baslik: string;
  metin: string;
  maddeler: string[];
  gorsel: GorselAnahtari;
  /**
   * Yalnızca sağlık verisi taşıyan slaytta gösterilen beyan uyarısı.
   * Bu cümle kaldırılmamalıdır.
   */
  beyanUyarisi?: boolean;
};

const SLAYTLAR: Slayt[] = [
  {
    kod: "acil-durum",
    etiket: "Acil Durum Profili",
    baslik: "Araç ve motosiklette, kaza anında bilinmesi gerekenler",
    metin:
      "Etiketine, sana yardım etmeye çalışan kişinin görmesini istediğin bilgileri ekleyebilirsin. Her alan ayrı ayrı açılır; kapalı bıraktığın hiçbir bilgi QR sayfasında görünmez.",
    maddeler: [
      "Kan grubu, alerjiler, kullanılan ilaçlar",
      "Önemli sağlık durumları ve acil durum notu",
      "Acil durumda aranacak kişiler",
    ],
    gorsel: "arac",
    beyanUyarisi: true,
  },
  {
    kod: "kayip-esya",
    etiket: "Kayıp eşya",
    baslik: "Eşyan kaybolduğunda bulan kişi sana ulaşsın",
    metin:
      "Çanta, anahtar, valiz veya günlük eşyalarını etiketlersin. Bulan kişi QR'ı okutur ve sana mesaj bırakır.",
    maddeler: [
      "QR'ı okutan kişi uygulama indirmez",
      "Eşyanı kayıp işaretleyebilirsin",
      "Etiketi başka eşyaya taşıyabilirsin",
    ],
    gorsel: "hero",
  },
  {
    kod: "evcil-hayvan",
    etiket: "Evcil hayvan",
    baslik: "Künyeyi okutan kişi seninle güvenle iletişime geçsin",
    metin:
      "Tasmaya takılan QR künye, dostunu bulan kişinin sana ulaşmasını sağlar.",
    maddeler: [
      "Künyede telefon numaran yazmaz",
      "Bildirim sana ARKVIUM üzerinden gelir",
      "Bilgileri istediğin an güncellersin",
    ],
    gorsel: "evcil-hayvan",
  },
  {
    kod: "guvenli-iletisim",
    etiket: "Güvenli iletişim",
    baslik: "Numaran görünmeden mesaj al",
    metin:
      "Sana ulaşmak isteyen kişi mesajını ARKVIUM üzerinden gönderir; iletişim bilgilerin ona gösterilmez.",
    maddeler: [
      "Telefon numaran QR kodda yer almaz",
      "Kişisel iletişim bilgilerin doğrudan gösterilmez",
      "Mesaj ARKVIUM üzerinden iletilir",
    ],
    gorsel: "mesajlasma",
  },
];

export default function KonuKaydirici() {
  const [etkin, setEtkin] = useState(0);
  const bolgeId = useId();

  const git = useCallback((hedef: number) => {
    // Baştan sona ve sondan başa döner; kullanıcı çıkmaza girmez.
    setEtkin((hedef + SLAYTLAR.length) % SLAYTLAR.length);
  }, []);

  return (
    <section
      id="acil-durum"
      aria-labelledby={`${bolgeId}-baslik`}
      className="scroll-mt-24 border-b border-ark-line bg-ark-surface"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="ark-etiket text-ark-accent">ARKVIUM ne yapar?</p>

            <h2
              id={`${bolgeId}-baslik`}
              className="ark-baslik mt-3 text-ark-ink"
            >
              Tek etiket, dört ayrı işe yarar
            </h2>
          </div>

          {/* Yön düğmeleri: başlığın hizasında, kaydırıcının üstünde durur. */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => git(etkin - 1)}
              aria-label="Önceki konu"
              aria-controls={`${bolgeId}-icerik`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ark-line-strong bg-ark-surface text-ark-ink transition duration-200 hover:bg-ark-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ‹
              </span>
            </button>

            <button
              type="button"
              onClick={() => git(etkin + 1)}
              aria-label="Sonraki konu"
              aria-controls={`${bolgeId}-icerik`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-ark-line-strong bg-ark-surface text-ark-ink transition duration-200 hover:bg-ark-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ›
              </span>
            </button>
          </div>
        </div>

        {/* Konu başlıkları: hangi slaytta olduğunu gösterir ve doğrudan geçiş sağlar. */}
        <div
          role="tablist"
          aria-label="Konu başlıkları"
          className="mt-8 flex flex-wrap gap-2"
        >
          {SLAYTLAR.map((slayt, sira) => (
            <button
              key={slayt.kod}
              type="button"
              role="tab"
              aria-selected={sira === etkin}
              aria-controls={`${bolgeId}-icerik`}
              onClick={() => git(sira)}
              className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent ${
                sira === etkin
                  ? "bg-ark-ink text-white"
                  : "border border-ark-line-strong bg-ark-surface text-ark-ink-2 hover:bg-ark-surface-2 hover:text-ark-ink"
              }`}
            >
              {slayt.etiket}
            </button>
          ))}
        </div>

        {/*
          Kaydırma alanı. Sol/sağ ok tuşları burada çalışır; `tabIndex` ile
          klavyeyle odaklanabilir ve rolü ekran okuyucuya bildirilir.
        */}
        <div
          id={`${bolgeId}-icerik`}
          role="tabpanel"
          tabIndex={0}
          onKeyDown={(olay) => {
            if (olay.key === "ArrowLeft") {
              olay.preventDefault();
              git(etkin - 1);
            }
            if (olay.key === "ArrowRight") {
              olay.preventDefault();
              git(etkin + 1);
            }
          }}
          className="mt-8 overflow-hidden rounded-3xl border border-ark-line bg-ark-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${etkin * 100}%)` }}
          >
            {SLAYTLAR.map((slayt, sira) => (
              <div
                key={slayt.kod}
                aria-hidden={sira !== etkin}
                className="w-full shrink-0"
              >
                <div className="grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
                  {/* Metin önce: mobilde tek sütuna inince başlık üstte kalır. */}
                  <div>
                    <p className="ark-etiket text-ark-accent">
                      {slayt.etiket}
                    </p>

                    <h3 className="mt-3 text-2xl font-bold text-balance text-ark-ink sm:text-3xl">
                      {slayt.baslik}
                    </h3>

                    <p className="ark-olcu mt-4 leading-relaxed text-ark-ink-2">
                      {slayt.metin}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {slayt.maddeler.map((madde) => (
                        <li key={madde} className="flex gap-3">
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ark-accent"
                          />
                          <span className="leading-relaxed text-ark-ink-2">
                            {madde}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {slayt.beyanUyarisi && (
                      <p className="mt-6 rounded-2xl bg-ark-accent-soft p-4 text-sm leading-relaxed text-ark-ink-2">
                        Bu bilgiler{" "}
                        <strong className="text-ark-ink">senin beyanındır</strong>
                        ; doğrulanmış tıbbi kayıt değildir. Özellik tamamen
                        isteğe bağlıdır ve varsayılan olarak kapalıdır.
                      </p>
                    )}
                  </div>

                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ark-line bg-ark-surface-3 shadow-ark-2">
                    <Gorsel
                      anahtar={slayt.gorsel}
                      sizes="(min-width: 1024px) 512px, 90vw"
                    />
                    <TemsiliRozet />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nokta göstergeleri */}
        <div className="mt-6 flex justify-center gap-2">
          {SLAYTLAR.map((slayt, sira) => (
            <button
              key={slayt.kod}
              type="button"
              onClick={() => git(sira)}
              aria-label={`${slayt.etiket} konusunu göster`}
              aria-current={sira === etkin}
              className="inline-flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent"
            >
              <span
                aria-hidden="true"
                className={`block h-2 rounded-full transition-all duration-200 ${
                  sira === etkin
                    ? "w-6 bg-ark-ink"
                    : "w-2 bg-ark-line-strong"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
