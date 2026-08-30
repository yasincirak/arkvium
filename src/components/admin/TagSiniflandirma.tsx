"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * Ürün türü atama arayüzü.
 *
 * Tasarım kararları:
 * - Hiçbir etiket varsayılan olarak seçili DEĞİLDİR. "Hepsini seç" bilinçli
 *   bir tıklama gerektirir; yanlışlıkla toplu atama olmaz.
 * - Onay penceresinde kaç etiketin hangi ürüne bağlanacağı tekrar yazılır.
 * - Aktif etiketler ayrıca işaretlenir: bunlar müşteride çalışan etiketlerdir,
 *   yanlış tür ataması fiziksel ürünle kaydı uyuşmaz hâle getirir.
 */

type Satir = {
  id: string;
  kod: string;
  durum: string;
  durumAdi: string;
  urunAdi: string | null;
  siparisNo: string | null;
  uretim: string;
  aktivasyon: string | null;
};

type Urun = { kod: string; ad: string };

export default function TagSiniflandirma({
  etiketler,
  toplam,
  gosterilen,
  urunler,
}: {
  etiketler: Satir[];
  toplam: number;
  gosterilen: number;
  urunler: Urun[];
}) {
  const router = useRouter();

  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [urunKod, setUrunKod] = useState(urunler[0]?.kod ?? "");
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  const seciliAktifSayisi = useMemo(
    () =>
      etiketler.filter((e) => secili.has(e.id) && e.durum === "active").length,
    [etiketler, secili]
  );

  const urunAdi =
    urunler.find((u) => u.kod === urunKod)?.ad ?? "seçilen ürün";

  function tekiniDegistir(id: string) {
    setSecili((onceki) => {
      const yeni = new Set(onceki);

      if (yeni.has(id)) {
        yeni.delete(id);
      } else {
        yeni.add(id);
      }

      return yeni;
    });
  }

  function hepsiniDegistir() {
    setSecili((onceki) =>
      onceki.size === etiketler.length
        ? new Set()
        : new Set(etiketler.map((e) => e.id))
    );
  }

  async function uygula() {
    setHata("");
    setBilgi("");

    const onayMetni =
      `${secili.size} etiket "${urunAdi}" ürününe bağlanacak.` +
      (seciliAktifSayisi > 0
        ? `\n\nSeçilenlerden ${seciliAktifSayisi} tanesi AKTİF (müşteride kullanımda). ` +
          "Ürün türünü yanlış seçersen fiziksel ürünle kayıt uyuşmaz."
        : "") +
      "\n\nDevam edilsin mi?";

    if (!window.confirm(onayMetni)) {
      return;
    }

    setCalisiyor(true);

    try {
      const yanit = await fetch("/api/admin/tags/siniflandir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKod: urunKod,
          tagIds: Array.from(secili),
        }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.error || "Etiketler sınıflandırılamadı.");

        return;
      }

      setBilgi(
        `${veri.guncellenen} etiket "${veri.urun.ad}" ürününe bağlandı.` +
          (veri.atlanan > 0
            ? ` ${veri.atlanan} etiket atlandı (bu sırada başka bir tür atanmış olabilir).`
            : "")
      );

      setSecili(new Set());
      router.refresh();
    } catch {
      setHata("İşlem tamamlanamadı. Bağlantını kontrol et.");
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="hedef-urun"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Hangi ürüne bağlansın?
            </label>

            <select
              id="hedef-urun"
              value={urunKod}
              onChange={(e) => setUrunKod(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
            >
              {urunler.map((urun) => (
                <option key={urun.kod} value={urun.kod} className="bg-[#0a0a0f]">
                  {urun.ad}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={uygula}
              disabled={calisiyor || secili.size === 0}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calisiyor
                ? "Uygulanıyor..."
                : secili.size === 0
                  ? "Önce etiket seç"
                  : `${secili.size} etiketi bağla`}
            </button>
          </div>
        </div>

        {seciliAktifSayisi > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Seçilenlerden <strong>{seciliAktifSayisi} tanesi aktif</strong> —
            müşteride kullanımda. Türü değiştirmek etiketin çalışmasını
            etkilemez, ama yanlış ürün seçilirse kayıt fiziksel ürünle uyuşmaz.
          </div>
        )}

        {hata && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {hata}
          </div>
        )}

        {bilgi && (
          <div className="mt-4 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {bilgi}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/60">
            Türü olmayan {toplam} etiket
            {gosterilen < toplam && ` — ilk ${gosterilen} tanesi gösteriliyor`}
          </p>

          <button
            type="button"
            onClick={hepsiniDegistir}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {secili.size === etiketler.length
              ? "Seçimi temizle"
              : "Görünenlerin hepsini seç"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-white/40">
              <tr>
                <th className="w-10 border-b border-white/10 py-2" />
                <th className="border-b border-white/10 py-2 pr-4">
                  Etiket Kodu
                </th>
                <th className="border-b border-white/10 py-2 pr-4">Durum</th>
                <th className="border-b border-white/10 py-2 pr-4">
                  Bağlı Kayıt
                </th>
                <th className="border-b border-white/10 py-2 pr-4">Sipariş</th>
                <th className="border-b border-white/10 py-2">Üretim</th>
              </tr>
            </thead>

            <tbody className="text-white/80">
              {etiketler.map((etiket) => {
                const isaretli = secili.has(etiket.id);

                return (
                  <tr
                    key={etiket.id}
                    className={isaretli ? "bg-indigo-500/10" : undefined}
                  >
                    <td className="border-b border-white/5 py-2.5">
                      <input
                        type="checkbox"
                        checked={isaretli}
                        onChange={() => tekiniDegistir(etiket.id)}
                        aria-label={`${etiket.kod} etiketini seç`}
                        className="h-4 w-4 rounded border-white/20 bg-white/5"
                      />
                    </td>

                    <td className="border-b border-white/5 py-2.5 pr-4 font-mono">
                      {etiket.kod}
                    </td>

                    <td className="border-b border-white/5 py-2.5 pr-4">
                      <span
                        className={
                          etiket.durum === "active"
                            ? "rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-300"
                            : "rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/60"
                        }
                      >
                        {etiket.durumAdi}
                      </span>

                      {etiket.aktivasyon && (
                        <span className="ml-2 text-xs text-white/35">
                          {etiket.aktivasyon}
                        </span>
                      )}
                    </td>

                    <td className="border-b border-white/5 py-2.5 pr-4 text-white/60">
                      {etiket.urunAdi ?? "—"}
                    </td>

                    <td className="border-b border-white/5 py-2.5 pr-4 font-mono text-xs text-white/50">
                      {etiket.siparisNo ?? "—"}
                    </td>

                    <td className="border-b border-white/5 py-2.5 text-white/50">
                      {etiket.uretim}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
