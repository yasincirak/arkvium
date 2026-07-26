"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const MIN_SIFRE_UZUNLUGU = 8;

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [error, setError] = useState("");
  const [basariMesaji, setBasariMesaji] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const passwordRepeat = String(formData.get("passwordRepeat") || "");

    if (password !== passwordRepeat) {
      setError("Şifreler eşleşmiyor.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "İşlem tamamlanamadı.");
        return;
      }

      setBasariMesaji(data.message);
    } catch {
      setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-200"
      >
        <p>Bu bağlantı geçersiz görünüyor.</p>

        <Link
          href="/forgot-password"
          className="mt-3 inline-block font-medium text-amber-100 underline"
        >
          Yeni sıfırlama bağlantısı iste
        </Link>
      </div>
    );
  }

  if (basariMesaji) {
    return (
      <div
        role="status"
        className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-4 text-sm leading-6 text-green-200"
      >
        <p>{basariMesaji}</p>

        <Link
          href="/login"
          className="mt-3 inline-block font-medium text-green-100 underline"
        >
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Yeni Şifre
        </label>

        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_SIFRE_UZUNLUGU}
          autoComplete="new-password"
          aria-describedby="password-yardim"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
          placeholder={`En az ${MIN_SIFRE_UZUNLUGU} karakter`}
        />

        <p id="password-yardim" className="mt-2 text-xs text-white/40">
          Şifreniz en az {MIN_SIFRE_UZUNLUGU} karakter olmalıdır.
        </p>
      </div>

      <div>
        <label
          htmlFor="passwordRepeat"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Yeni Şifre (Tekrar)
        </label>

        <input
          id="passwordRepeat"
          name="passwordRepeat"
          type="password"
          required
          minLength={MIN_SIFRE_UZUNLUGU}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
          placeholder="Şifrenizi tekrar girin"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Kaydediliyor..." : "Şifremi Güncelle"}
      </button>
    </form>
  );
}
