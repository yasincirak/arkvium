"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";
import {
  devirDavetiGonder,
  devirDavetiIptalEt,
} from "@/lib/ownership-transfer-actions";

/**
 * Ürün sahipliği devri paneli.
 *
 * Bekleyen davet varsa yalnızca alıcı adresi ve son geçerlilik zamanı
 * gösterilir; davet tokenı hiçbir zaman istemciye gönderilmez.
 */
type AktifDavet = {
  id: string;
  toEmail: string;
  expiresAt: string;
};

type TransferPanelProps = {
  itemRecordId: string;
  aktifDavet: AktifDavet | null;
};

export default function TransferPanel({
  itemRecordId,
  aktifDavet,
}: TransferPanelProps) {
  const ceviri = useSozluk();

  const router = useRouter();

  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");

  async function davetGonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHata("");
    setBilgi("");
    setCalisiyor(true);

    const formData = new FormData(event.currentTarget);
    const eposta = String(formData.get("aliciEposta") || "");

    const sonuc = await devirDavetiGonder(itemRecordId, eposta);

    setCalisiyor(false);

    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setBilgi(sonuc.mesaj);
    router.refresh();
  }

  async function davetIptal() {
    if (!aktifDavet) {
      return;
    }

    setHata("");
    setBilgi("");
    setCalisiyor(true);

    const sonuc = await devirDavetiIptalEt(aktifDavet.id);

    setCalisiyor(false);

    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setBilgi(sonuc.mesaj);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-xl font-semibold">{ceviri.hesap.devir.baslik}</h2>

      {aktifDavet ? (
        <>
          <p className="mt-2 text-sm leading-6 text-white/50">{ceviri.kalanlar.devirBekleyen}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-white/40">{ceviri.hesap.devir.davetEdilen}</p>
              <p className="mt-1 break-all">{aktifDavet.toEmail}</p>
            </div>

            <div>
              <p className="text-sm text-white/40">{ceviri.hesap.devir.sonGecerlilik}</p>
              <p className="mt-1">
                {new Date(aktifDavet.expiresAt).toLocaleString("tr-TR")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={davetIptal}
            disabled={calisiyor}
            className="mt-4 inline-flex rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {calisiyor ? "İşleniyor..." : ceviri.hesap.devir.davetIptal}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-white/50">{ceviri.kalanlar.devirAciklama}</p>

          <form onSubmit={davetGonder} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="aliciEposta"
                className="mb-2 block text-sm font-medium text-white/80"
              >{ceviri.kalanlar.aliciEpostasi}</label>

              <input
                id="aliciEposta"
                name="aliciEposta"
                type="email"
                required
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder="ornek@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={calisiyor}
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calisiyor ? "Gönderiliyor..." : ceviri.hesap.devir.davetGonder}
            </button>
          </form>
        </>
      )}

      {hata && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {hata}
        </div>
      )}

      {bilgi && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {bilgi}
        </div>
      )}
    </div>
  );
}
