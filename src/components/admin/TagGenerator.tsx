"use client";

import { FormEvent, useState } from "react";

/**
 * Etiket üretim formu.
 *
 * Aktivasyon kodları sunucudan yalnızca bir kez döner ve veritabanında
 * saklanmaz. Bu yüzden liste ekranda gösterilir ve CSV olarak indirilebilir;
 * sayfa yenilenirse kodlar geri getirilemez.
 */

type UretilenEtiket = {
  code: string;
  activationCode: string;
  publicToken: string;
};

export default function TagGenerator() {
  const [adet, setAdet] = useState("10");
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [etiketler, setEtiketler] = useState<UretilenEtiket[]>([]);

  async function uret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (etiketler.length > 0) {
      const devam = window.confirm(
        "Ekrandaki aktivasyon kodları kaybolacak. Kaydettiyseniz devam edin."
      );

      if (!devam) {
        return;
      }
    }

    setHata("");
    setCalisiyor(true);

    try {
      const yanit = await fetch("/api/admin/tags/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adet: Number(adet) }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.error || "Etiketler üretilemedi.");
        setEtiketler([]);

        return;
      }

      setEtiketler(veri.etiketler ?? []);
    } catch {
      setHata("Etiketler üretilemedi. Bağlantınızı kontrol edin.");
    } finally {
      setCalisiyor(false);
    }
  }

  function csvIndir() {
    const satirlar = [
      "Etiket Kodu;Aktivasyon Kodu;QR Adresi",
      ...etiketler.map(
        (e) =>
          `${e.code};${e.activationCode};${window.location.origin}/t/${e.publicToken}`
      ),
    ];

    const bag = document.createElement("a");
    bag.href = URL.createObjectURL(
      new Blob(["﻿" + satirlar.join("\n")], {
        type: "text/csv;charset=utf-8",
      })
    );
    bag.download = `arkvium-etiketler-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    bag.click();
    URL.revokeObjectURL(bag.href);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={uret}
        className="rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <label
          htmlFor="adet"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Kaç adet etiket üretilsin? (1–500)
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <input
            id="adet"
            name="adet"
            type="number"
            min={1}
            max={500}
            required
            value={adet}
            onChange={(e) => setAdet(e.target.value)}
            className="w-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={calisiyor}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {calisiyor ? "Üretiliyor..." : "Etiket Üret"}
          </button>
        </div>

        {hata && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {hata}
          </div>
        )}
      </form>

      {etiketler.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <strong>Aktivasyon kodları yalnızca bir kez gösterilir.</strong> Bu
            listeyi kaydetmeden sayfadan ayrılmayın; kodlar geri getirilemez.
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/60">
              {etiketler.length} etiket üretildi.
            </p>

            <button
              type="button"
              onClick={csvIndir}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              CSV olarak indir
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-white/40">
                <tr>
                  <th className="border-b border-white/10 py-2 pr-4">
                    Etiket Kodu
                  </th>
                  <th className="border-b border-white/10 py-2 pr-4">
                    Aktivasyon Kodu
                  </th>
                  <th className="border-b border-white/10 py-2">QR Adresi</th>
                </tr>
              </thead>

              <tbody className="text-white/80">
                {etiketler.map((etiket) => (
                  <tr key={etiket.publicToken}>
                    <td className="border-b border-white/5 py-2 pr-4 font-mono">
                      {etiket.code}
                    </td>
                    <td className="border-b border-white/5 py-2 pr-4 font-mono">
                      {etiket.activationCode}
                    </td>
                    <td className="border-b border-white/5 py-2 font-mono text-white/50">
                      /t/{etiket.publicToken.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
