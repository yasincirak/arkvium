"use client";

import { useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";

export default function LogoutAllButton() {
  const ceviri = useSozluk();

  const [onayBekliyor, setOnayBekliyor] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");

  async function tumOturumlariKapat() {
    setCalisiyor(true);
    setHata("");

    try {
      const response = await fetch("/api/session/logout-all", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        setHata(data.error || ceviri.ortak.genelHata);
        setCalisiyor(false);
        return;
      }

      // Bu cihazın oturumu da kapandığı için giriş ekranına gidilir.
      window.location.href = "/login";
    } catch {
      setHata(ceviri.ortak.baglantiHatasi);
      setCalisiyor(false);
    }
  }

  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <h3 className="font-medium text-white/90">{ceviri.hesap.oturum.tumCihazlardanCik}</h3>

      <p className="mt-1 text-sm leading-6 text-white/50">{ceviri.kalanlar.oturumAciklama}</p>

      {!onayBekliyor ? (
        <button
          type="button"
          onClick={() => setOnayBekliyor(true)}
          className="mt-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >{ceviri.kalanlar.tumOturumlariKapat}</button>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="text-sm leading-6 text-amber-100">{ceviri.kalanlar.oturumOnayi}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={tumOturumlariKapat}
              disabled={calisiyor}
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calisiyor ? ceviri.hesap.oturum.kapatiliyor : ceviri.hesap.oturum.onayla}
            </button>

            <button
              type="button"
              onClick={() => setOnayBekliyor(false)}
              disabled={calisiyor}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >{ceviri.kalanlar.vazgec}</button>
          </div>
        </div>
      )}

      {hata && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {hata}
        </p>
      )}
    </div>
  );
}
