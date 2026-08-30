"use client";

import { FormEvent, useEffect, useState } from "react";
import TagPrintSheet from "./TagPrintSheet";

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

export type UrunSecenegi = { kod: string; ad: string };

/**
 * Baskıya giden QR adresinin tabanı.
 *
 * `NEXT_PUBLIC_APP_URL` önceliklidir: baskı yanlış adrese giderse binlerce
 * etiket çöp olur ve geri dönüşü yoktur. Değişken tanımlı değilse tarayıcının
 * adresine düşülür — bu geliştirme makinesinde localhost demektir, o yüzden
 * aşağıda üretim engellenir.
 */
function tabanAdresiCoz(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(
    /\/+$/,
    ""
  );
}

function yerelAdresMi(adres: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(adres);
}

export default function TagGenerator({ urunler }: { urunler: UrunSecenegi[] }) {
  const [adet, setAdet] = useState("10");
  const [urunKod, setUrunKod] = useState(urunler[0]?.kod ?? "");
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [etiketler, setEtiketler] = useState<UretilenEtiket[]>([]);
  const [uretilenUrunAdi, setUretilenUrunAdi] = useState("");
  const [tabanAdres, setTabanAdres] = useState("");

  useEffect(() => {
    setTabanAdres(tabanAdresiCoz());
  }, []);

  const adresYerel = tabanAdres !== "" && yerelAdresMi(tabanAdres);

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
        body: JSON.stringify({ adet: Number(adet), productKod: urunKod }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.error || "Etiketler üretilemedi.");
        setEtiketler([]);

        return;
      }

      setEtiketler(veri.etiketler ?? []);
      setUretilenUrunAdi(veri.urun?.ad ?? "");
    } catch {
      setHata("Etiketler üretilemedi. Bağlantınızı kontrol edin.");
    } finally {
      setCalisiyor(false);
    }
  }

  function csvIndir() {
    const taban = tabanAdresiCoz();

    const satirlar = [
      "Urun;Etiket Kodu;Aktivasyon Kodu;QR Adresi",
      ...etiketler.map(
        (e) =>
          `${uretilenUrunAdi};${e.code};${e.activationCode};${taban}/t/${e.publicToken}`
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="urun"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Hangi ürüne basılacak?
            </label>

            <select
              id="urun"
              name="urun"
              required
              value={urunKod}
              onChange={(e) => setUrunKod(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
            >
              {urunler.map((urun) => (
                <option
                  key={urun.kod}
                  value={urun.kod}
                  className="bg-[#0a0a0f]"
                >
                  {urun.ad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="adet"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Kaç adet? (1–500)
            </label>

            <input
              id="adet"
              name="adet"
              type="number"
              min={1}
              max={500}
              required
              value={adet}
              onChange={(e) => setAdet(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-white/40">
          Etiketler seçtiğin ürünün stoğuna eklenir ve yalnızca o ürünün
          siparişlerinde kullanılır.
        </p>

        {adresYerel && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <strong>Üretim durduruldu.</strong> QR adresi şu an{" "}
            <span className="font-mono">{tabanAdres}</span> olarak kurulacaktı.
            Bu adrese basılan etiketler hiçbir telefonda açılmaz.{" "}
            <span className="font-mono">NEXT_PUBLIC_APP_URL</span> değerini
            canlı alan adına ayarlayıp sayfayı yenileyin.
          </div>
        )}

        <div className="mt-4">
          <button
            type="submit"
            disabled={calisiyor || adresYerel || tabanAdres === ""}
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
              <span className="font-semibold text-white">
                {uretilenUrunAdi}
              </span>{" "}
              için {etiketler.length} etiket üretildi.
            </p>

            <button
              type="button"
              onClick={csvIndir}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              CSV olarak indir
            </button>
          </div>

          <div className="mt-4">
            <TagPrintSheet etiketler={etiketler} urunAdi={uretilenUrunAdi} />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-white/40">
                <tr>
                  <th className="border-b border-white/10 py-2 pr-4">Ürün</th>
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
                    <td className="border-b border-white/5 py-2 pr-4 text-white/60">
                      {uretilenUrunAdi}
                    </td>
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
