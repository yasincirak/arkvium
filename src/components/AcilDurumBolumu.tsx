import {
  KAN_GRUBU_ETIKETLERI,
  type AcilDurumGorunumu,
} from "@/lib/acil-durum";

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
  return (
    <section
      aria-labelledby="acil-durum-basligi"
      className="mb-8 rounded-2xl border border-red-500/40 bg-red-950/40 p-6"
    >
      <h2
        id="acil-durum-basligi"
        className="text-lg font-bold text-red-100"
      >
        Acil Durum Bilgisi
      </h2>

      <p className="mt-2 text-sm leading-6 text-red-100/80">
        Bu bilgiler eşya sahibinin kendi beyanıdır ve sahibi tarafından
        paylaşılmak üzere yayınlanmıştır. Tıbbi kayıt değildir, doğrulanmamıştır.
      </p>

      <div className="mt-5 space-y-4">
        {gorunum.displayName && (
          <Satir baslik="Ad" deger={gorunum.displayName} />
        )}

        {gorunum.bloodType && (
          <Satir
            baslik="Beyan edilen kan grubu"
            deger={KAN_GRUBU_ETIKETLERI[gorunum.bloodType]}
          />
        )}

        {gorunum.allergies && (
          <Satir baslik="Alerjiler" deger={gorunum.allergies} />
        )}

        {gorunum.medications && (
          <Satir baslik="Kullanılan ilaçlar" deger={gorunum.medications} />
        )}

        {gorunum.medicalConditions && (
          <Satir
            baslik="Önemli sağlık durumları"
            deger={gorunum.medicalConditions}
          />
        )}

        {gorunum.emergencyNote && (
          <Satir baslik="Not" deger={gorunum.emergencyNote} />
        )}

        {gorunum.kisiler.length > 0 && (
          <div>
            <span className="text-xs uppercase tracking-wide text-red-200/70">
              Acil durumda aranacak kişiler
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
                      Ara
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-5 border-t border-red-400/20 pt-4 text-sm font-semibold text-red-100">
        Hayati tehlike varsa önce 112 Acil Çağrı Merkezi&apos;ni arayın.
      </p>
    </section>
  );
}
