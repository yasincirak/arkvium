"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Urun = {
  id: string;
  assetName: string;
};

type Props = {
  etiketsizUrunler: Urun[];
};

type Sonuc = {
  mesaj: string;
  itemRecordId: string;
};

export default function ActivateTagForm({ etiketsizUrunler }: Props) {
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
        setHata(data.error || "Etiket etkinleştirilemedi.");
        return;
      }

      setSonuc({ mesaj: data.message, itemRecordId: data.itemRecordId });
    } catch {
      setHata("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
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

        <p className="mt-2">
          Etiket artık ürününe bağlı. QR kodu okutulduğunda bulan kişi güvenli
          iletişim sayfasına ulaşacak.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/account/records/${sonuc.itemRecordId}`}
            className="rounded-lg bg-green-500/20 px-4 py-2 font-medium text-green-100 transition hover:bg-green-500/30"
          >
            Ürünü Aç
          </Link>

          <Link
            href="/account"
            className="rounded-lg border border-green-500/30 px-4 py-2 font-medium text-green-100 transition hover:bg-green-500/10"
          >
            Hesabıma Dön
          </Link>
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
        >
          Etiket Kodu
        </label>

        <input
          id="tagCode"
          name="tagCode"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="ARK-XXXX-XXXX"
          aria-describedby="tagCode-yardim"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono tracking-wider text-white outline-none transition focus:border-indigo-500"
        />

        <p id="tagCode-yardim" className="mt-2 text-xs text-white/40">
          Etiketin üzerinde yazan koddur. Büyük/küçük harf ve tire farkı
          önemli değildir.
        </p>
      </div>

      <div>
        <label
          htmlFor="activationCode"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Aktivasyon Kodu
        </label>

        <input
          id="activationCode"
          name="activationCode"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX"
          aria-describedby="activationCode-yardim"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono tracking-wider text-white outline-none transition focus:border-indigo-500"
        />

        <p id="activationCode-yardim" className="mt-2 text-xs text-white/40">
          Etiketin arkasındaki kazınarak açılan gizli koddur. Bu kodu kimseyle
          paylaşmayın.
        </p>
      </div>

      <fieldset className="rounded-xl border border-white/10 p-4">
        <legend className="px-2 text-sm font-medium text-white/80">
          Etiket hangi ürüne bağlansın?
        </legend>

        {etiketsizUrunler.length > 0 && (
          <label className="mt-2 flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="hedef"
              checked={hedef === "mevcut"}
              onChange={() => setHedef("mevcut")}
              className="mt-1 h-4 w-4"
            />

            <span className="text-sm text-white/70">Mevcut bir ürünüme</span>
          </label>
        )}

        {hedef === "mevcut" && etiketsizUrunler.length > 0 && (
          <select
            name="itemRecordId"
            required
            aria-label="Ürün seçin"
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

          <span className="text-sm text-white/70">Yeni bir ürüne</span>
        </label>

        {hedef === "yeni" && (
          <input
            name="assetName"
            required
            maxLength={100}
            placeholder="Örn. Laptop çantası"
            aria-label="Yeni ürün adı"
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
        {gonderiliyor ? "Etkinleştiriliyor..." : "Etiketi Etkinleştir"}
      </button>
    </form>
  );
}
