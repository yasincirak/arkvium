"use client";

import { FormEvent, useState } from "react";

const MIN_SIFRE_UZUNLUGU = 8;

export default function ChangePasswordForm() {
  const [acik, setAcik] = useState(false);
  const [error, setError] = useState("");
  const [basariMesaji, setBasariMesaji] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBasariMesaji("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword") || "");
    const newPasswordRepeat = String(formData.get("newPasswordRepeat") || "");

    if (newPassword !== newPasswordRepeat) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setKaydediliyor(true);

    try {
      const response = await fetch("/api/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Şifre değiştirilemedi.");
        return;
      }

      setBasariMesaji(data.message);
      form.reset();
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Şifre</h2>

          <p className="mt-1 text-sm text-white/50">
            Şifreni değiştirdiğinde diğer cihazlardaki oturumlar kapanır.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAcik((onceki) => !onceki);
            setError("");
            setBasariMesaji("");
          }}
          aria-expanded={acik}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          {acik ? "Vazgeç" : "Şifremi Değiştir"}
        </button>
      </div>

      {basariMesaji && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300"
        >
          {basariMesaji}
        </p>
      )}

      {acik && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="currentPassword"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Mevcut Şifre
            </label>

            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Yeni Şifre
            </label>

            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={MIN_SIFRE_UZUNLUGU}
              autoComplete="new-password"
              aria-describedby="yeni-sifre-yardim"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
            />

            <p id="yeni-sifre-yardim" className="mt-2 text-xs text-white/40">
              En az {MIN_SIFRE_UZUNLUGU} karakter olmalıdır.
            </p>
          </div>

          <div>
            <label
              htmlFor="newPasswordRepeat"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Yeni Şifre (Tekrar)
            </label>

            <input
              id="newPasswordRepeat"
              name="newPasswordRepeat"
              type="password"
              required
              minLength={MIN_SIFRE_UZUNLUGU}
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={kaydediliyor}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {kaydediliyor ? "Kaydediliyor..." : "Şifremi Güncelle"}
          </button>
        </form>
      )}
    </div>
  );
}
