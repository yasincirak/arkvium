"use client";

import Link from "next/link";
import { useState } from "react";
import { devirDavetiKabul } from "@/lib/ownership-transfer-actions";

/**
 * Kabul butonu.
 * Token yalnızca action'a parametre olarak geçer; ekranda gösterilmez.
 */
export default function AcceptForm({ token }: { token: string }) {
  const [durum, setDurum] = useState<"bekliyor" | "gonderiliyor" | "tamam">(
    "bekliyor"
  );
  const [hata, setHata] = useState("");

  async function kabulEt() {
    setHata("");
    setDurum("gonderiliyor");

    const sonuc = await devirDavetiKabul(token);

    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      setDurum("bekliyor");
      return;
    }

    setDurum("tamam");
  }

  if (durum === "tamam") {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Devir tamamlandı. Ürün artık hesabınıza bağlı.
        </div>

        <Link
          href="/account"
          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-indigo-500"
        >
          Hesabıma Git
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hata && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {hata}
        </div>
      )}

      <button
        type="button"
        onClick={kabulEt}
        disabled={durum === "gonderiliyor"}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {durum === "gonderiliyor" ? "Devir tamamlanıyor..." : "Sahipliği Kabul Et"}
      </button>

      <Link
        href="/account"
        className="block text-center text-sm font-medium text-white/50 hover:text-white/70"
      >
        Vazgeç
      </Link>
    </div>
  );
}
