"use client";

import { useState } from "react";

type Durum =
  | { tip: "bekliyor" }
  | { tip: "gonderiliyor" }
  | { tip: "basarili"; mesaj: string }
  | { tip: "hata"; mesaj: string };

export default function EmailVerificationNotice() {
  const [durum, setDurum] = useState<Durum>({ tip: "bekliyor" });

  async function tekrarGonder() {
    setDurum({ tip: "gonderiliyor" });

    try {
      const response = await fetch("/api/email/verify/resend", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setDurum({
          tip: "hata",
          mesaj: data.error || "E-posta gönderilemedi.",
        });
        return;
      }

      setDurum({ tip: "basarili", mesaj: data.message });
    } catch {
      setDurum({
        tip: "hata",
        mesaj: "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
      });
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-amber-200">
            E-posta adresin doğrulanmadı
          </h2>

          <p className="mt-1 text-sm leading-6 text-amber-100/70">
            Eşyan bulunduğunda bildirimlerin sana ulaşabilmesi için e-posta
            adresini doğrulaman gerekiyor.
          </p>
        </div>

        {durum.tip !== "basarili" && (
          <button
            type="button"
            onClick={tekrarGonder}
            disabled={durum.tip === "gonderiliyor"}
            className="w-fit shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/15 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {durum.tip === "gonderiliyor"
              ? "Gönderiliyor..."
              : "Doğrulama e-postası gönder"}
          </button>
        )}
      </div>

      {durum.tip === "basarili" && (
        <p role="status" className="mt-4 text-sm text-green-300">
          {durum.mesaj}
        </p>
      )}

      {durum.tip === "hata" && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {durum.mesaj}
        </p>
      )}
    </div>
  );
}
