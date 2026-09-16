"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

/**
 * Etiket kodu arama kutusu (yönetim paneli).
 *
 * Tam kod (ARK-1A2B-3C4D) ve kısmi kod (1A2B) aranabilir; büyük/küçük
 * harf, tire ve boşluk farkı sonucu değiştirmez — normalleştirme sunucuda
 * `aramaTerimiCoz` ile yapılır.
 *
 * Sonuç satırlarında GİZLİ DEĞER GÖSTERİLMEZ: uç zaten `publicToken` ve
 * `activationCodeHash` alanlarını hiç okumaz.
 *
 * Üç durum da açıkça gösterilir: yükleniyor, hata, sonuç yok.
 */

type Satir = {
  id: string;
  kod: string;
  urunAdi: string | null;
  durum: string;
  durumAdi: string;
  uretim: string;
  aktivasyon: string | null;
  kayitAdi: string | null;
  siparisNo: string | null;
  rezerveMi: boolean;
};

const DURUM_RENGI: Record<string, string> = {
  unused: "bg-white/10 text-white/70",
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-amber-500/15 text-amber-200",
  revoked: "bg-red-500/15 text-red-300",
};

function tarih(deger: string | null): string {
  if (!deger) {
    return "—";
  }

  return new Date(deger).toLocaleDateString("tr-TR");
}

export default function EtiketArama() {
  const [kod, setKod] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sonuclar, setSonuclar] = useState<Satir[] | null>(null);

  async function ara(olay: FormEvent<HTMLFormElement>) {
    olay.preventDefault();

    setHata("");
    setCalisiyor(true);

    try {
      const yanit = await fetch(
        `/api/admin/tags/ara?kod=${encodeURIComponent(kod)}`,
        { headers: { Accept: "application/json" } }
      );

      const veri = await yanit.json().catch(() => ({}));

      if (!yanit.ok) {
        setHata(veri.error || "Arama yapılamadı.");
        setSonuclar(null);

        return;
      }

      setSonuclar(veri.sonuclar ?? []);
    } catch {
      setHata("Arama yapılamadı. Bağlantınızı kontrol edin.");
      setSonuclar(null);
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold text-white">Etiket Ara</h2>

      <p className="mt-1 text-sm text-white/50">
        Etiketin üzerindeki kodu tam veya kısmi olarak yazın. Büyük/küçük
        harf ve tire farkı önemli değildir.
      </p>

      <form onSubmit={ara} className="mt-4 flex flex-wrap gap-3">
        <label htmlFor="etiket-kodu" className="sr-only">
          Etiket kodu
        </label>

        <input
          id="etiket-kodu"
          name="etiket-kodu"
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          placeholder="ARK-1A2B-3C4D veya 1A2B"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white outline-none transition placeholder:font-sans placeholder:text-white/30 focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={calisiyor}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {calisiyor ? "Aranıyor..." : "Ara"}
        </button>
      </form>

      {hata && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {hata}
        </div>
      )}

      {calisiyor && (
        <p className="mt-4 text-sm text-white/40">Etiketler aranıyor…</p>
      )}

      {!calisiyor && !hata && sonuclar !== null && sonuclar.length === 0 && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
          Bu koda uyan etiket bulunamadı.
        </p>
      )}

      {!calisiyor && sonuclar !== null && sonuclar.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-white/40">
              <tr>
                <th className="border-b border-white/10 py-2 pr-4">Kod</th>
                <th className="border-b border-white/10 py-2 pr-4">Ürün</th>
                <th className="border-b border-white/10 py-2 pr-4">Durum</th>
                <th className="border-b border-white/10 py-2 pr-4">Üretim</th>
                <th className="border-b border-white/10 py-2 pr-4">Kayıt</th>
                <th className="border-b border-white/10 py-2 pr-4">Sipariş</th>
                <th className="border-b border-white/10 py-2" />
              </tr>
            </thead>

            <tbody className="text-white/80">
              {sonuclar.map((satir) => (
                <tr key={satir.id}>
                  <td className="border-b border-white/5 py-2 pr-4 font-mono">
                    {satir.kod}
                  </td>

                  <td className="border-b border-white/5 py-2 pr-4 text-white/60">
                    {satir.urunAdi ?? "Tür atanmamış"}
                  </td>

                  <td className="border-b border-white/5 py-2 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        DURUM_RENGI[satir.durum] ?? "bg-white/10 text-white/70"
                      }`}
                    >
                      {satir.durumAdi}
                    </span>
                    {satir.rezerveMi && (
                      <span className="ml-2 text-xs text-amber-200">
                        rezerve
                      </span>
                    )}
                  </td>

                  <td className="border-b border-white/5 py-2 pr-4 text-white/60">
                    {tarih(satir.uretim)}
                  </td>

                  <td className="border-b border-white/5 py-2 pr-4 text-white/60">
                    {satir.kayitAdi ?? "—"}
                  </td>

                  <td className="border-b border-white/5 py-2 pr-4 text-white/60">
                    {satir.siparisNo ?? "—"}
                  </td>

                  <td className="border-b border-white/5 py-2">
                    <Link
                      href={`/admin/tags/${satir.id}`}
                      className="font-medium text-indigo-400 transition hover:text-indigo-300"
                    >
                      Detayı Gör
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
