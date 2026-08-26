"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";

/**
 * Acil Durum Profili yönetim paneli (yalnızca kayıt sahibi görür).
 *
 * TASARIM İLKELERİ:
 * - Özellik tamamen İSTEĞE BAĞLIDIR; hiçbir alan zorunlu değildir.
 * - Varsayılan olarak her şey KAPALIDIR; kullanıcı hangi alanın herkese açık
 *   olacağını tek tek seçer.
 * - Yayına almak İKİ AYRI açık onay ister; onaylar önceden işaretli gelmez.
 * - Veri POST gövdesiyle gönderilir; URL'ye veya konsola yazılmaz.
 */

export type AcilDurumPaneliVerisi = {
  enabled: boolean;
  displayName: string | null;
  bloodType: string | null;
  allergies: string | null;
  medications: string | null;
  medicalConditions: string | null;
  emergencyNote: string | null;
  displayNameGorunur: boolean;
  bloodTypeGorunur: boolean;
  allergiesGorunur: boolean;
  medicationsGorunur: boolean;
  medicalConditionsGorunur: boolean;
  emergencyNoteGorunur: boolean;
  contactsGorunur: boolean;
  kisiler: {
    name: string | null;
    relationship: string | null;
    phone: string | null;
  }[];
};

type Props = {
  itemRecordId: string;
  profil: AcilDurumPaneliVerisi | null;
  /** Şifreleme anahtarı yoksa panel yalnızca bilgi mesajı gösterir. */
  kullanilabilir: boolean;
};

const KUTU =
  "mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none";

function Gorunurluk({
  ad,
  varsayilan,
  etiketMetni,
}: {
  ad: string;
  varsayilan: boolean;
  etiketMetni: string;
}) {
  return (
    <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm text-white/60">
      <input
        type="checkbox"
        name={ad}
        defaultChecked={varsayilan}
        className="h-4 w-4 accent-indigo-500"
      />
      {etiketMetni}
    </label>
  );
}

export default function AcilDurumPaneli({
  itemRecordId,
  profil,
  kullanilabilir,
}: Props) {
  const ceviri = useSozluk();

  const KAN_GRUBU_SECENEKLERI = [
    { deger: "", etiket: ceviri.acilDurumPaneli.belirtmekIstemiyorum },
    { deger: "A_RH_POZITIF", etiket: ceviri.acilDurumGorunum.kanGruplari.A_RH_POZITIF },
    { deger: "A_RH_NEGATIF", etiket: ceviri.acilDurumGorunum.kanGruplari.A_RH_NEGATIF },
    { deger: "B_RH_POZITIF", etiket: ceviri.acilDurumGorunum.kanGruplari.B_RH_POZITIF },
    { deger: "B_RH_NEGATIF", etiket: ceviri.acilDurumGorunum.kanGruplari.B_RH_NEGATIF },
    { deger: "AB_RH_POZITIF", etiket: ceviri.acilDurumGorunum.kanGruplari.AB_RH_POZITIF },
    { deger: "AB_RH_NEGATIF", etiket: ceviri.acilDurumGorunum.kanGruplari.AB_RH_NEGATIF },
    { deger: "SIFIR_RH_POZITIF", etiket: ceviri.acilDurumGorunum.kanGruplari.SIFIR_RH_POZITIF },
    { deger: "SIFIR_RH_NEGATIF", etiket: ceviri.acilDurumGorunum.kanGruplari.SIFIR_RH_NEGATIF },
    { deger: "BILINMIYOR", etiket: ceviri.acilDurumGorunum.kanGruplari.BILINMIYOR },
  ] as const;

  const router = useRouter();

  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  async function istekGonder(govde: Record<string, unknown>) {
    setHata("");
    setBilgi("");
    setCalisiyor(true);

    try {
      const yanit = await fetch(`/api/acil-durum/${itemRecordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });

      const sonuc = await yanit.json().catch(() => ({}));

      if (!yanit.ok) {
        setHata(sonuc.error || ceviri.ortak.genelHata);

        return;
      }

      setBilgi(sonuc.message || ceviri.acilDurumPaneli.islemTamamlandi);
      router.refresh();
    } catch {
      setHata(ceviri.ortak.baglantiHatasi);
    } finally {
      setCalisiyor(false);
    }
  }

  async function kaydet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const metin = (ad: string) => String(form.get(ad) || "").trim();
    const isaretli = (ad: string) => form.get(ad) === "on";

    const kisiler = [1, 2]
      .map((sira) => ({
        name: metin(`kisi${sira}Ad`),
        relationship: metin(`kisi${sira}Yakinlik`),
        phone: metin(`kisi${sira}Telefon`),
      }))
      .filter((kisi) => kisi.name || kisi.phone);

    await istekGonder({
      islem: "kaydet",
      displayName: metin("displayName"),
      bloodType: metin("bloodType"),
      allergies: metin("allergies"),
      medications: metin("medications"),
      medicalConditions: metin("medicalConditions"),
      emergencyNote: metin("emergencyNote"),
      displayNameGorunur: isaretli("displayNameGorunur"),
      bloodTypeGorunur: isaretli("bloodTypeGorunur"),
      allergiesGorunur: isaretli("allergiesGorunur"),
      medicationsGorunur: isaretli("medicationsGorunur"),
      medicalConditionsGorunur: isaretli("medicalConditionsGorunur"),
      emergencyNoteGorunur: isaretli("emergencyNoteGorunur"),
      contactsGorunur: isaretli("contactsGorunur"),
      kisiler,
    });
  }

  async function yayinaAl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    await istekGonder({
      islem: "etkinlestir",
      saglikVerisiOnayi: form.get("saglikVerisiOnayi") === "on",
      yakinBeyani: form.get("yakinBeyani") === "on",
    });
  }

  if (!kullanilabilir) {
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold">{ceviri.acilDurumPaneli.baslik}</h2>

        <p className="mt-2 text-sm leading-6 text-white/50">
          {ceviri.acilDurumPaneli.kullanimaKapali}
        </p>
      </section>
    );
  }

  const kisi1 = profil?.kisiler?.[0];
  const kisi2 = profil?.kisiler?.[1];

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{ceviri.acilDurumPaneli.baslik}</h2>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            profil?.enabled
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/10 text-white/50"
          }`}
        >
          {profil?.enabled ? ceviri.acilDurumPaneli.yayinda : ceviri.acilDurumPaneli.yayindaDegil}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/50">
        Tamamen isteğe bağlıdır. Doldurduğun bilgilerden yalnızca{" "}
        <strong className="text-white/70">herkese göster</strong> olarak
        işaretlediklerin, profili yayına aldığında QR kodu okutan kişiye
        görünür. Sağlık bilgisi özel nitelikli kişisel veridir; istediğin an
        rızanı geri çekebilir veya profili silebilirsin.
      </p>

      <p className="mt-3 text-sm leading-6 text-white/50">
        <strong className="text-white/70">{ceviri.kalanlar.onemli}</strong>{ceviri.acilDurumPaneli.kapsamUyarisi}</p>

      <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        <strong>{ceviri.acilDurumPaneli.taslakUyarisi}</strong>{" "}
        {ceviri.acilDurumPaneli.taslakMetin}</div>

      {hata && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {hata}
        </p>
      )}

      {bilgi && (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {bilgi}
        </p>
      )}

      <form onSubmit={kaydet} className="mt-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-white/70">
            {ceviri.acilDurumPaneli.gosterilecekAd}
            <input
              name="displayName"
              maxLength={80}
              defaultValue={profil?.displayName ?? ""}
              placeholder={ceviri.acilDurumPaneli.gosterilecekAdOrnek}
              className={KUTU}
            />
          </label>
          <Gorunurluk
            ad="displayNameGorunur"
            varsayilan={profil?.displayNameGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white/70">
            {ceviri.acilDurumPaneli.kanGrubu}
            <select
              name="bloodType"
              defaultValue={profil?.bloodType ?? ""}
              className={KUTU}
            >
              {KAN_GRUBU_SECENEKLERI.map((secenek) => (
                <option
                  key={secenek.deger || "bos"}
                  value={secenek.deger}
                  className="bg-[#0a0a0f]"
                >
                  {secenek.etiket}
                </option>
              ))}
            </select>
          </label>
          <Gorunurluk
            ad="bloodTypeGorunur"
            varsayilan={profil?.bloodTypeGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white/70">{ceviri.acilDurumPaneli.alerjiler}<textarea
              name="allergies"
              rows={2}
              maxLength={500}
              defaultValue={profil?.allergies ?? ""}
              className={KUTU}
            />
          </label>
          <Gorunurluk
            ad="allergiesGorunur"
            varsayilan={profil?.allergiesGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white/70">
            {ceviri.acilDurumPaneli.ilaclar}
            <textarea
              name="medications"
              rows={2}
              maxLength={500}
              defaultValue={profil?.medications ?? ""}
              className={KUTU}
            />
          </label>
          <Gorunurluk
            ad="medicationsGorunur"
            varsayilan={profil?.medicationsGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white/70">
            {ceviri.acilDurumPaneli.saglikDurumlari}
            <textarea
              name="medicalConditions"
              rows={2}
              maxLength={500}
              defaultValue={profil?.medicalConditions ?? ""}
              className={KUTU}
            />
          </label>
          <Gorunurluk
            ad="medicalConditionsGorunur"
            varsayilan={profil?.medicalConditionsGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white/70">
            {ceviri.acilDurumPaneli.acilNot}
            <textarea
              name="emergencyNote"
              rows={3}
              maxLength={750}
              defaultValue={profil?.emergencyNote ?? ""}
              className={KUTU}
            />
          </label>
          <Gorunurluk
            ad="emergencyNoteGorunur"
            varsayilan={profil?.emergencyNoteGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-white/80">
            {ceviri.acilDurumPaneli.kisiler}
          </h3>

          {[
            { sira: 1, veri: kisi1 },
            { sira: 2, veri: kisi2 },
          ].map(({ sira, veri }) => (
            <div key={sira} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                name={`kisi${sira}Ad`}
                maxLength={80}
                defaultValue={veri?.name ?? ""}
                placeholder={`${sira}. kişi adı`}
                className={KUTU}
              />
              <input
                name={`kisi${sira}Yakinlik`}
                maxLength={60}
                defaultValue={veri?.relationship ?? ""}
                placeholder={ceviri.acilDurumPaneli.yakinlik}
                className={KUTU}
              />
              <input
                name={`kisi${sira}Telefon`}
                type="tel"
                inputMode="tel"
                defaultValue={veri?.phone ?? ""}
                placeholder={ceviri.acilDurumPaneli.telefon}
                className={KUTU}
              />
            </div>
          ))}

          <Gorunurluk
            ad="contactsGorunur"
            varsayilan={profil?.contactsGorunur ?? false}
          etiketMetni={ceviri.acilDurumPaneli.gorunurlukEtiketi}
          />
        </div>

        <button
          type="submit"
          disabled={calisiyor}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {calisiyor ? ceviri.acilDurumPaneli.kaydediliyor : ceviri.acilDurumPaneli.kaydet}
        </button>
      </form>

      {!profil?.enabled ? (
        <form
          onSubmit={yayinaAl}
          className="mt-8 space-y-3 border-t border-white/10 pt-6"
        >
          <h3 className="text-sm font-semibold text-white/80">
            {ceviri.acilDurumPaneli.onaylarBaslik}
          </h3>

          <label className="flex items-start gap-3 text-sm leading-6 text-white/60">
            <input
              type="checkbox"
              name="saglikVerisiOnayi"
              className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
            />
            <span>
              <strong className="text-white/80">
                {ceviri.acilDurumPaneli.taslakUyarisi}
              </strong>{" "}
              {ceviri.acilDurumPaneli.onay1}
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-6 text-white/60">
            <input
              type="checkbox"
              name="yakinBeyani"
              className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
            />
            <span>
              <strong className="text-white/80">
                {ceviri.acilDurumPaneli.taslakUyarisi}
              </strong>{" "}
              {ceviri.acilDurumPaneli.onay2}
            </span>
          </label>

          <button
            type="submit"
            disabled={calisiyor}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {ceviri.acilDurumPaneli.yayinaAl}
          </button>
        </form>
      ) : (
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-sm leading-6 text-white/50">
            {ceviri.acilDurumPaneli.yayindaMetin}
          </p>

          <button
            type="button"
            disabled={calisiyor}
            onClick={() => istekGonder({ islem: "rizayi-geri-cek" })}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {ceviri.acilDurumPaneli.rizayiGeriCek}
          </button>
        </div>
      )}

      {profil && (
        <button
          type="button"
          disabled={calisiyor}
          onClick={() => {
            if (
              window.confirm(
                ceviri.acilDurumPaneli.silmeOnayi
              )
            ) {
              void istekGonder({ islem: "sil" });
            }
          }}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {ceviri.acilDurumPaneli.kaliciSil}
        </button>
      )}
    </section>
  );
}
