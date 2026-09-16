import { type AcilDurumGorunumu } from "@/lib/acil-durum";
import { sozluk } from "@/lib/i18n";

/**
 * QR okutan kişiye gösterilen acil durum bilgisi bölümü.
 *
 * Sunucu bileşenidir; veriyi kendisi çekmez, yalnızca filtrelenmiş görünümü
 * çizer. `dangerouslySetInnerHTML` KULLANILMAZ — tüm metinler React tarafından
 * kaçış yapılarak basılır.
 *
 * Telefon numarası ekranda AÇIK YAZILMAZ; yalnızca arama bağlantısı sunulur.
 * Tek istisna 112'dir: kamuya açık acil çağrı numarasıdır, kişisel veri
 * değildir ve doğrudan aranabilir bir düğme olarak gösterilir.
 */

function Satir({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-red-200/70">
        {baslik}
      </span>
      <p className="mt-0.5 whitespace-pre-line leading-6 text-white">{deger}</p>
    </div>
  );
}

export default function AcilDurumBolumu({
  gorunum,
}: {
  gorunum: AcilDurumGorunumu;
}) {
  const s = sozluk();

  return (
    <section
      aria-labelledby="acil-durum-basligi"
      className="mb-8 rounded-2xl border border-red-500/40 bg-red-950/40 p-6"
    >
      <h2
        id="acil-durum-basligi"
        className="text-lg font-bold text-red-100"
      >
        {s.acilDurumGorunum.baslik}
      </h2>

      <p className="mt-2 text-sm leading-6 text-red-100/80">
        {s.acilDurumGorunum.beyan}
      </p>

      <div className="mt-5 space-y-4">
        {gorunum.displayName && (
          <Satir baslik={s.acilDurumGorunum.ad} deger={gorunum.displayName} />
        )}

        {gorunum.bloodType && (
          <Satir
            baslik={s.acilDurumGorunum.kanGrubu}
            deger={s.acilDurumGorunum.kanGruplari[gorunum.bloodType]}
          />
        )}

        {gorunum.allergies && (
          <Satir baslik={s.acilDurumGorunum.alerjiler} deger={gorunum.allergies} />
        )}

        {gorunum.medications && (
          <Satir baslik={s.acilDurumGorunum.ilaclar} deger={gorunum.medications} />
        )}

        {gorunum.medicalConditions && (
          <Satir
            baslik={s.acilDurumGorunum.saglikDurumlari}
            deger={gorunum.medicalConditions}
          />
        )}

        {gorunum.emergencyNote && (
          <Satir baslik={s.acilDurumGorunum.not} deger={gorunum.emergencyNote} />
        )}

        {gorunum.kisiler.length > 0 && (
          <div>
            <span className="text-xs uppercase tracking-wide text-red-200/70">
              {s.acilDurumGorunum.kisiler}
            </span>

            <ul className="mt-2 space-y-2">
              {gorunum.kisiler.map((kisi, sira) => (
                <li key={sira}>
                  <a
                    href={`tel:${kisi.phone}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-semibold text-white transition hover:bg-red-500/20"
                  >
                    <span>
                      {kisi.name}
                      {kisi.relationship && (
                        <span className="ml-2 text-sm font-normal text-red-100/70">
                          {kisi.relationship}
                        </span>
                      )}
                    </span>

                    <span className="text-sm font-semibold text-red-100">
                      {s.acilDurumGorunum.ara}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/*
        112 ACİL ÇAĞRI.

        Yalnızca bilgi cümlesi yeterli değildi: etiketi okutan kişi acil
        bir sahnede metni okuyup numarayı elle tuşlamak zorunda kalıyordu.
        Burada gerçek bir `tel:` bağlantısı sunulur; telefon uygulaması
        numarayı hazır açar, çevirme işlemini KULLANICI onaylar.

        112 sabit ve herkese açık bir acil çağrı numarasıdır; kişisel veri
        değildir ve gizlenmesi gerekmez. Gizli/maskeli arama, SMS veya
        başka bir kanal EKLENMEZ.
      */}
      <div className="mt-5 border-t border-red-400/20 pt-4">
        <a
          href="tel:112"
          aria-label={s.acilDurumGorunum.acilAraErisilebilirAd}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-bold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.31 1.85.53 2.81.66A2 2 0 0 1 22 16.92Z" />
          </svg>
          {s.acilDurumGorunum.acilAra}
        </a>

        <p className="mt-3 text-sm font-semibold text-red-100">
          {s.acilDurumGorunum.acilCagri}
        </p>
      </div>
    </section>
  );
}
