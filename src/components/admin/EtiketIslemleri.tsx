"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Etiket iptal ve yenileme işlemleri (yönetim paneli).
 *
 * İKİ AŞAMALI: düğmeye basmak işlemi ÇALIŞTIRMAZ; önce etkilerini
 * açıklayan onay ekranı açılır ve yöneticiden etiket kodunu yeniden
 * yazması istenir. Sunucu aynı kontrolü bağımsız olarak tekrarlar; bu
 * ekran atlansa bile yanlış etikette işlem yapılamaz.
 *
 * Yenilemede dönen aktivasyon kodu YALNIZCA BİR KEZ gösterilir ve
 * indirilebilir. Sayfa yenilenirse geri getirilemez; veritabanında
 * yalnızca SHA-256 özeti vardır.
 */

type Props = {
  tagId: string;
  kod: string;
  iptalEdilebilir: boolean;
  yenilenebilir: boolean;
  sebep: string | null;
};

type YeniEtiket = {
  id: string;
  kod: string;
  activationCode: string;
};

type Islem = "iptal" | "yenile";

const ACIKLAMA: Record<Islem, string[]> = {
  iptal: [
    "Etiket kalıcı olarak iptal edilir ve bir daha aktive EDİLEMEZ.",
    "Etiketin QR adresi artık sahibinin hiçbir bilgisini göstermez.",
    "Etiket bir ürün kaydına bağlıysa bu bağ koparılır; kayıt silinmez.",
    "Bu işlem geri alınamaz.",
  ],
  yenile: [
    "Mevcut etiket kalıcı olarak iptal edilir ve bir daha aktive EDİLEMEZ.",
    "Aynı ürün türünde YENİ bir etiket üretilir: yeni kod, yeni QR adresi ve yeni aktivasyon kodu.",
    "Yeni aktivasyon kodu yalnızca bu işlem tamamlandığında bir kez gösterilir; kaydedilmezse geri getirilemez.",
    "Bu işlem geri alınamaz.",
  ],
};

export default function EtiketIslemleri({
  tagId,
  kod,
  iptalEdilebilir,
  yenilenebilir,
  sebep,
}: Props) {
  const router = useRouter();

  const [acikIslem, setAcikIslem] = useState<Islem | null>(null);
  const [onayKodu, setOnayKodu] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [yeni, setYeni] = useState<YeniEtiket | null>(null);
  const [tamamlandi, setTamamlandi] = useState<Islem | null>(null);

  function kapat() {
    setAcikIslem(null);
    setOnayKodu("");
    setHata("");
  }

  async function calistir(islem: Islem) {
    setHata("");
    setCalisiyor(true);

    try {
      const yanit = await fetch(`/api/admin/tags/${tagId}/islem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islem, onayKodu }),
      });

      const veri = await yanit.json().catch(() => ({}));

      if (!yanit.ok) {
        setHata(veri.error || "İşlem tamamlanamadı.");

        return;
      }

      setYeni(veri.yeni ?? null);
      setTamamlandi(islem);
      kapat();

      // Detay ekranındaki durum ve geçmiş sunucudan tazelenir.
      router.refresh();
    } catch {
      setHata("İşlem tamamlanamadı. Bağlantınızı kontrol edin.");
    } finally {
      setCalisiyor(false);
    }
  }

  function aktivasyonIndir() {
    if (!yeni) {
      return;
    }

    const satirlar = [
      "Etiket Kodu;Aktivasyon Kodu",
      `${yeni.kod};${yeni.activationCode}`,
    ];

    const bag = document.createElement("a");

    bag.href = URL.createObjectURL(
      new Blob(["﻿" + satirlar.join("\n")], {
        type: "text/csv;charset=utf-8",
      })
    );

    bag.download = `arkvium-yeni-etiket-${yeni.kod}.csv`;
    bag.click();

    URL.revokeObjectURL(bag.href);
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">İptal ve Yenileme</h2>

      {tamamlandi && (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {tamamlandi === "iptal"
            ? "Etiket iptal edildi."
            : "Etiket yenilendi: eski etiket iptal edildi, yeni etiket üretildi."}
        </div>
      )}

      {yeni && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-100">
            Yeni aktivasyon kodu yalnızca bir kez gösterilir. Bu sayfadan
            ayrılmadan kaydedin; kod geri getirilemez.
          </p>

          <dl className="mt-3 space-y-1 font-mono text-sm text-white">
            <div className="flex flex-wrap gap-2">
              <dt className="text-white/50">Yeni etiket kodu:</dt>
              <dd>{yeni.kod}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-white/50">Aktivasyon kodu:</dt>
              <dd>{yeni.activationCode}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={aktivasyonIndir}
            className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
          >
            Aktivasyon kodunu indir
          </button>
        </div>
      )}

      {sebep && !acikIslem && (
        <p className="mt-3 text-sm text-white/50">{sebep}</p>
      )}

      {!acikIslem && (iptalEdilebilir || yenilenebilir) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {iptalEdilebilir && (
            <button
              type="button"
              onClick={() => setAcikIslem("iptal")}
              className="rounded-xl border border-red-400/40 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              Etiketi İptal Et
            </button>
          )}

          {yenilenebilir && (
            <button
              type="button"
              onClick={() => setAcikIslem("yenile")}
              className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
            >
              Etiketi Yenile
            </button>
          )}
        </div>
      )}

      {acikIslem && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h3 className="text-sm font-bold text-amber-100">
            {acikIslem === "iptal"
              ? "Etiketi iptal etmek üzeresiniz"
              : "Etiketi yenilemek üzeresiniz"}
          </h3>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-100/90">
            {ACIKLAMA[acikIslem].map((madde) => (
              <li key={madde}>{madde}</li>
            ))}
          </ul>

          <label
            htmlFor="onay-kodu"
            className="mt-4 block text-sm text-amber-100"
          >
            Onaylamak için etiket kodunu yazın:{" "}
            <span className="font-mono font-bold">{kod}</span>
          </label>

          <input
            id="onay-kodu"
            name="onay-kodu"
            value={onayKodu}
            onChange={(e) => setOnayKodu(e.target.value)}
            autoComplete="off"
            className="mt-2 w-full max-w-sm rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-white outline-none focus:border-amber-400"
          />

          {hata && (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {hata}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => calistir(acikIslem)}
              disabled={calisiyor || onayKodu.trim() === ""}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calisiyor
                ? "Uygulanıyor..."
                : acikIslem === "iptal"
                ? "İptali onayla"
                : "Yenilemeyi onayla"}
            </button>

            <button
              type="button"
              onClick={kapat}
              disabled={calisiyor}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
