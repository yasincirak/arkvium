"use client";

import Link from "next/link";
import SayfaUstBari from "@/components/SayfaUstBari";
import { FormEvent, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";

export default function ForgotPasswordPage() {
  const s = useSozluk();

  const [error, setError] = useState("");
  const [basariMesaji, setBasariMesaji] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBasariMesaji("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || s.ortak.genelHata);
        return;
      }

      setBasariMesaji(data.message);
    } catch {
      setError(s.ortak.baglantiHatasi);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="pt-20 flex min-h-screen items-center justify-center bg-[#09090f] px-4 py-12 text-white">
      <SayfaUstBari ton="koyu" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-white"
          >
            ARKVIUM
          </Link>

          <h1 className="mt-6 text-3xl font-bold">{s.kimlik.unuttumBaslik}</h1>

          <p className="mt-2 text-sm text-white/50">{s.kimlik.unuttumAltyazi}</p>
        </div>

        {basariMesaji ? (
          <div
            role="status"
            className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-4 text-sm leading-6 text-green-200"
          >
            {basariMesaji}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                {s.kimlik.eposta}
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
                placeholder={s.kimlik.epostaOrnek}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Gönderiliyor..." : s.kimlik.unuttumDugme}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/50">
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            {s.kimlik.girisEkraninaDon}
          </Link>
        </p>
      </div>
    </main>
  );
}
