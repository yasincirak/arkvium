"use client";

import Link from "next/link";
import SayfaUstBari from "@/components/SayfaUstBari";
import { FormEvent, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";
import { guvenliDonusAdresi } from "@/lib/guvenli-yonlendirme";

export default function LoginPage() {
  const s = useSozluk();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || s.kimlik.girisHatasi);
      setIsSubmitting(false);
      return;
    }

    /*
      Giriş sonrası dönülecek adres. `next` yeni ad; `returnTo` eski
      bağlantılar için korunuyor. Değer `guvenliDonusAdresi` ile
      doğrulanır — açık yönlendirme açığına kapalıdır.
    */
    const parametreler = new URLSearchParams(window.location.search);

    const hedef = parametreler.get("next") ?? parametreler.get("returnTo");

    window.location.href = guvenliDonusAdresi(hedef);
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

          <h1 className="mt-6 text-3xl font-bold">{s.kimlik.girisBaslik}</h1>

          <p className="mt-2 text-sm text-white/50">
            {s.kimlik.girisAltyazi}
          </p>
        </div>

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

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80"
              >{s.kalanlar.sifre}</label>

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                {s.kimlik.sifremiUnuttum}
              </Link>
            </div>

            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
              placeholder={s.kimlik.sifreniz}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? s.kimlik.girisYapiliyor : s.kimlik.girisDugme}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          {s.kimlik.hesabinYokMu}{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            {s.kimlik.hesapOlustur}
          </Link>
        </p>
      </div>
    </main>
  );
}