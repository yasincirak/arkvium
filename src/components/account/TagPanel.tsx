"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";
import { QRCodeSVG } from "qrcode.react";

type Urun = {
  id: string;
  assetName: string;
};

type Props = {
  tag: {
    id: string;
    code: string;
    status: string;
    publicToken: string;
  };
  etiketAdresi: string;
  tasinabilirUrunler: Urun[];
};

const DURUM_RENKLERI: Record<string, string> = {
  active: "border-green-500/30 bg-green-500/10 text-green-300",
  inactive: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  revoked: "border-red-500/30 bg-red-500/10 text-red-300",
  unused: "border-white/15 bg-white/5 text-white/60",
};

export default function TagPanel({
  tag,
  etiketAdresi,
  tasinabilirUrunler,
}: Props) {
  const ceviri = useSozluk();

  const router = useRouter();

  const [durum, setDurum] = useState(tag.status);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");
  const [iptalOnayi, setIptalOnayi] = useState(false);
  const [tasimaAcik, setTasimaAcik] = useState(false);

  async function islemYap(govde: Record<string, unknown>) {
    setCalisiyor(true);
    setHata("");
    setBilgi("");

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });

      const data = await response.json();

      if (!response.ok) {
        setHata(data.error || ceviri.ortak.genelHata);
        return;
      }

      if (typeof data.status === "string") {
        setDurum(data.status);
      }

      setBilgi(data.message);
      setIptalOnayi(false);
      setTasimaAcik(false);
      router.refresh();
    } catch {
      setHata(ceviri.ortak.baglantiHatasi);
    } finally {
      setCalisiyor(false);
    }
  }

  const iptalEdilmis = durum === "revoked";

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{ceviri.hesap.etiket}</h2>

          <p className="mt-1 font-mono text-sm tracking-wider text-white/60">
            {tag.code}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            DURUM_RENKLERI[durum] ?? DURUM_RENKLERI.unused
          }`}
        >
          {ceviri.hesap.etiketPaneli.etiketDurumlari[durum as keyof typeof ceviri.hesap.etiketPaneli.etiketDurumlari] ?? durum}
        </span>
      </div>

      {durum === "active" && (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-fit rounded-xl bg-white p-3">
            <QRCodeSVG value={etiketAdresi} size={140} />
          </div>

          <div className="min-w-0">
            <p className="text-sm text-white/40">{ceviri.kalanlar.qrAdresi}</p>
            <p className="mt-1 break-all text-sm text-white/70">
              {etiketAdresi}
            </p>
          </div>
        </div>
      )}

      {bilgi && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300"
        >
          {bilgi}
        </p>
      )}

      {hata && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {hata}
        </p>
      )}

      {iptalEdilmis ? (
        <p className="mt-6 text-sm leading-6 text-white/50">{ceviri.kalanlar.etiketIptalEdildi}</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          {durum === "active" ? (
            <button
              type="button"
              onClick={() => islemYap({ islem: "pasiflestir" })}
              disabled={calisiyor}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >{ceviri.kalanlar.pasifeAl}</button>
          ) : (
            <button
              type="button"
              onClick={() => islemYap({ islem: "etkinlestir" })}
              disabled={calisiyor}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >{ceviri.kalanlar.yenidenEtkinlestir}</button>
          )}

          {tasinabilirUrunler.length > 0 && (
            <button
              type="button"
              onClick={() => setTasimaAcik((onceki) => !onceki)}
              disabled={calisiyor}
              aria-expanded={tasimaAcik}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >{ceviri.kalanlar.baskaUruneTasi}</button>
          )}

          <button
            type="button"
            onClick={() => setIptalOnayi(true)}
            disabled={calisiyor}
            className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
          >{ceviri.kalanlar.etiketiIptalEt}</button>
        </div>
      )}

      {tasimaAcik && !iptalEdilmis && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            islemYap({
              islem: "tasi",
              itemRecordId: formData.get("itemRecordId"),
            });
          }}
          className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"
        >
          <label
            htmlFor="itemRecordId"
            className="mb-2 block text-sm font-medium text-white/80"
          >{ceviri.kalanlar.hangiUruneTasinsin}</label>

          <select
            id="itemRecordId"
            name="itemRecordId"
            required
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-indigo-500"
          >
            {tasinabilirUrunler.map((urun) => (
              <option key={urun.id} value={urun.id}>
                {urun.assetName}
              </option>
            ))}
          </select>

          <p className="mt-3 text-xs leading-5 text-white/40">{ceviri.kalanlar.tasimaYardim}</p>

          <button
            type="submit"
            disabled={calisiyor}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {calisiyor ? ceviri.hesap.etiketPaneli.tasiniyor : "Taşı"}
          </button>
        </form>
      )}

      {iptalOnayi && !iptalEdilmis && (
        <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
          <p className="text-sm leading-6 text-red-100">{ceviri.kalanlar.etiketiIptalEtmek}<strong>geri alınamaz</strong>. QR kodu bir daha
            çalışmaz ve bu etiket yeniden etkinleştirilemez. Devam edilsin mi?
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => islemYap({ islem: "iptal" })}
              disabled={calisiyor}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {calisiyor ? "İptal ediliyor..." : ceviri.hesap.etiketPaneli.iptalOnayi}
            </button>

            <button
              type="button"
              onClick={() => setIptalOnayi(false)}
              disabled={calisiyor}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >{ceviri.kalanlar.vazgec}</button>
          </div>
        </div>
      )}
    </div>
  );
}
