"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";

type Urun = {
  id: string;
  assetName: string;
};

type Props = {
  etiketsizUrunler: Urun[];
  /** QR sayfasından gelen etiket kodu. Boşsa alan boş açılır. */
  etiketKodu?: string;
};

type Sonuc = {
  mesaj: string;
  itemRecordId: string;
};

export default function ActivateTagForm({
  etiketsizUrunler,
  etiketKodu = "",
}: Props) {
  const ceviri = useSozluk();

  const [hedef, setHedef] = useState<"yeni" | "mevcut">(
    etiketsizUrunler.length > 0 ? "mevcut" : "yeni"
  );
  const [hata, setHata] = useState("");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHata("");
    setGonderiliyor(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/tags/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagCode: formData.get("tagCode"),
          activationCode: formData.get("activationCode"),
          itemRecordId: hedef === "mevcut" ? formData.get("itemRecordId") : "",
          assetName: hedef === "yeni" ? formData.get("assetName") : "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setHata(data.error || ceviri.hesap.aktivasyon.hata);
        return;
      }

      setSonuc({ mesaj: data.message, itemRecordId: data.itemRecordId });
    } catch {
      setHata(ceviri.ortak.baglantiHatasi);
    } finally {
      setGonderiliyor(false);
    }
  }

  if (sonuc) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-sm leading-7 text-green-200"
      >
        <p className="text-lg font-semibold text-green-100">{sonuc.mesaj}</p>

        <p className="mt-2">{ceviri.kalanlar.aktivasyonBasarili}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/account/records/${sonuc.itemRecordId}`}
            className="rounded-lg bg-green-500/20 px-4 py-2 font-medium text-green-100 transition hover:bg-green-500/30"
          >{ceviri.kalanlar.urunuAc}</Link>

          <Link
            href="/account"
            className="rounded-lg border border-green-500/30 px-4 py-2 font-medium text-green-100 transition hover:bg-green-500/10"
          >{ceviri.kalanlar.hesabimaDon}</Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div>
        <label
          htmlFor="tagCode"
          className="mb-2 block text-sm font-medium text-white/80"
        >{ceviri.kalanlar.etiketKodu}</label>

        <input
          id="tagCode"
          name="tagCode"
          defaultValue={etiketKodu}
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={ceviri.hesap.aktivasyon.etiketKodu}
          aria-describedby="tagCode-yardim"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono tracking-wider text-white outline-none transition focus:border-indigo-500"
        />

        <p id="tagCode-yardim" className="mt-2 text-xs text-white/40">{ceviri.kalanlar.etiketKoduYardim}</p>
      </div>

      <div>
        <label
          htmlFor="activationCode"
          className="mb-2 block text-sm font-medium text-white/80"
        >{ceviri.kalanlar.aktivasyonKodu}</label>

        <input
          id="activationCode"
          name="activationCode"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={ceviri.hesap.aktivasyon.aktivasyonKodu}
          aria-describedby="activationCode-yardim"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono tracking-wider text-white outline-none transition focus:border-indigo-500"
        />

        <p id="activationCode-yardim" className="mt-2 text-xs text-white/40">{ceviri.kalanlar.aktivasyonKoduYardim}</p>
      </div>

      <fieldset className="rounded-xl border border-white/10 p-4">
        <legend className="px-2 text-sm font-medium text-white/80">{ceviri.kalanlar.hangiUruneBaglansin}</legend>

        {etiketsizUrunler.length > 0 && (
          <label className="mt-2 flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="hedef"
              checked={hedef === "mevcut"}
              onChange={() => setHedef("mevcut")}
              className="mt-1 h-4 w-4"
            />

            <span className="text-sm text-white/70">{ceviri.hesap.aktivasyon.mevcutUrune}</span>
          </label>
        )}

        {hedef === "mevcut" && etiketsizUrunler.length > 0 && (
          <select
            name="itemRecordId"
            required
            aria-label={ceviri.hesap.aktivasyon.urunSecin}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-500"
          >
            {etiketsizUrunler.map((urun) => (
              <option key={urun.id} value={urun.id}>
                {urun.assetName}
              </option>
            ))}
          </select>
        )}

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="radio"
            name="hedef"
            checked={hedef === "yeni"}
            onChange={() => setHedef("yeni")}
            className="mt-1 h-4 w-4"
          />

          <span className="text-sm text-white/70">{ceviri.hesap.aktivasyon.yeniUrune}</span>
        </label>

        {hedef === "yeni" && (
          <input
            name="assetName"
            required
            maxLength={100}
            placeholder={ceviri.hesap.aktivasyon.yeniUrunOrnek}
            aria-label={ceviri.hesap.aktivasyon.yeniUrunAdi}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />
        )}
      </fieldset>

      {hata && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
        >
          {hata}
        </p>
      )}

      <button
        type="submit"
        disabled={gonderiliyor}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {gonderiliyor ? ceviri.hesap.aktivasyon.etkinlestiriliyor : ceviri.hesap.aktivasyon.etkinlestir}
      </button>
    </form>
  );
}
