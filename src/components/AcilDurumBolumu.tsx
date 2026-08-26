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

      <p className="mt-5 border-t border-red-400/20 pt-4 text-sm font-semibold text-red-100">
        {s.acilDurumGorunum.acilCagri}
      </p>
    </section>
  );
}
