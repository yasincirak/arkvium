"use client";

import { useMemo, useState } from "react";

/**
 * Stoktaki araç QR'ları için baskıcı paketi.
 *
 * NEDEN `publicToken` DEĞİL, ETİKET KODU?
 * Bu ekran daha önce üretilmiş etiketleri listeler. `publicToken` QR
 * adresinin tamamını verir; yönetim ekranlarında bilinçli olarak
 * gösterilmiyor. Bu yüzden seçim, etiketin ÜZERİNE BASILAN kodu
 * (ARK-XXXX-XXXX) ile yapılır ve tokenı sunucu kendisi bulur.
 *
 * Paket üretimi SALT OKUNURDUR: hiçbir etiket, aktivasyon kodu veya stok
 * durumu değişmez.
 */

export type StokEtiketi = {
  /** Basılan, gizli olmayan etiket kodu. */
  kod: string;
  durum: string;
  olusturulma: string;
};

const DURUM_ETIKETLERI: Record<string, string> = {
  unused: "Kullanılmamış",
  active: "Aktif",
  inactive: "Pasif",
  revoked: "İptal",
};

export default function AracBaskiciPaketi({
  urunKod,
  urunAdi,
  etiketler,
}: {
  urunKod: string;
  urunAdi: string;
  etiketler: StokEtiketi[];
}) {
  const [secili, setSecili] = useState<string[]>([]);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");

  const tumuSecili = useMemo(
    () => etiketler.length > 0 && secili.length === etiketler.length,
    [etiketler.length, secili.length]
  );

  function degistir(kod: string) {
    setSecili((onceki) =>
      onceki.includes(kod)
        ? onceki.filter((deger) => deger !== kod)
        : [...onceki, kod]
    );
  }

  function tumunuDegistir() {
    setSecili(tumuSecili ? [] : etiketler.map((etiket) => etiket.kod));
  }

  async function indir() {
    if (secili.length === 0) {
      setHata("Önce en az bir etiket seçin.");

      return;
    }

    setHata("");
    setCalisiyor(true);

    try {
      const yanit = await fetch("/api/admin/tags/baskici-paketi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKod: urunKod, tagKodlari: secili }),
      });

      if (!yanit.ok) {
        const veri = await yanit.json().catch(() => ({}));

        setHata(veri.error || "Baskı paketi oluşturulamadı.");

        return;
      }

      const blob = await yanit.blob();
      const adres = URL.createObjectURL(blob);

      const bag = document.createElement("a");
      bag.href = adres;
      bag.download =
        yanit.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "arkvium-baskici.zip";
      bag.click();

      URL.revokeObjectURL(adres);
    } catch {
      setHata("Baskı paketi indirilemedi. Bağlantını kontrol et.");
    } finally {
      setCalisiyor(false);
    }
  }

  if (etiketler.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        {urunAdi} için stokta etiket bulunmuyor. Önce Etiket Üretimi
        sayfasından üretin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={indir}
          disabled={calisiyor || secili.length === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {calisiyor
            ? "Paket hazırlanıyor..."
            : `Seçilen ${secili.length} etiket için paketi indir`}
        </button>

        <button
          type="button"
          onClick={tumunuDegistir}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {tumuSecili ? "Seçimi temizle" : "Tümünü seç"}
        </button>

        <span className="text-sm text-white/50">
          Aktivasyon kodu ve kişisel veri içermez.
        </span>
      </div>

      {hata && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {hata}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-white/40">
            <tr>
              <th className="border-b border-white/10 p-3"></th>
              <th className="border-b border-white/10 p-3">Etiket Kodu</th>
              <th className="border-b border-white/10 p-3">Durum</th>
              <th className="border-b border-white/10 p-3">Üretim</th>
            </tr>
          </thead>

          <tbody className="text-white/80">
            {etiketler.map((etiket) => (
              <tr key={etiket.kod}>
                <td className="border-b border-white/5 p-3">
                  <input
                    type="checkbox"
                    checked={secili.includes(etiket.kod)}
                    onChange={() => degistir(etiket.kod)}
                    aria-label={`${etiket.kod} seç`}
                    className="h-4 w-4 rounded border-white/20 bg-white/5"
                  />
                </td>

                <td className="border-b border-white/5 p-3 font-mono">
                  {etiket.kod}
                </td>

                <td className="border-b border-white/5 p-3 text-white/60">
                  {DURUM_ETIKETLERI[etiket.durum] ?? etiket.durum}
                </td>

                <td className="border-b border-white/5 p-3 text-white/50">
                  {etiket.olusturulma}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
