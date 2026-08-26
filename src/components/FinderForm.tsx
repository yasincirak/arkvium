"use client";

import { useRef, useState } from "react";
import { createFinderMessage } from "@/lib/actions";

type FinderFormProps = {
  recordId: string;
  /** Metinler sunucudaki sözlükten prop olarak gelir. */
  metinler: {
    baslik: string;
    aciklama: string;
    adSoyad: string;
    telefon: string;
    konum: string;
    not: string;
    onay: string;
    gonder: string;
    gonderiliyor: string;
    eksikAlan: string;
    onayGerekli: string;
    gonderimHatasi: string;
    basariBaslik: string;
    basariMetin: string;
    basariNot: string;
  };
};

export default function FinderForm({ recordId, metinler }: FinderFormProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleSubmit() {
    if (!fullName || !phone || !location) {
      alert(metinler.eksikAlan);
      return;
    }

    if (!consent) {
      alert(
        metinler.onayGerekli
      );
      return;
    }

    if (isSubmittingRef.current || isSending) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSending(true);

    try {
      await createFinderMessage({
        recordId,
        finderName: fullName,
        finderPhone: phone,
        location,
        message: note,
      });

      setIsSent(true);
    } catch {
      alert(metinler.gonderimHatasi);
    } finally {
      isSubmittingRef.current = false;
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center">
        <h2 className="text-lg font-semibold text-green-300">
          {metinler.basariBaslik}
        </h2>

        <p className="mt-2 text-sm text-green-100/70">
          {metinler.basariMetin}
        </p>

        <p className="mt-3 text-xs text-green-100/50">
          {metinler.basariNot}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold text-white">
        {metinler.baslik}
      </h2>

      <p className="mt-2 text-sm text-white/50">
        {metinler.aciklama}
      </p>

      <input
        className="mt-5 w-full rounded-lg border border-white/10 bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500/50"
        placeholder={metinler.adSoyad}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <input
        type="tel"
        className="mt-4 w-full rounded-lg border border-white/10 bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500/50"
        placeholder={metinler.telefon}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <input
        className="mt-4 w-full rounded-lg border border-white/10 bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500/50"
        placeholder={metinler.konum}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      <textarea
        className="mt-4 w-full rounded-lg border border-white/10 bg-[#0a0a0f] px-4 py-2.5 text-sm text-white outline-none transition focus:border-indigo-500/50"
        placeholder={metinler.not}
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4"
        />

        <span className="text-sm leading-6 text-white/60">
          {metinler.onay}
        </span>
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSending}
        className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? metinler.gonderiliyor : metinler.gonder}
      </button>
    </div>
  );
}