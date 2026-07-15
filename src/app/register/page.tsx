"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Kayıt oluşturulamadı.");
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/login";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-white"
          >
            ARKVIUM
          </Link>

          <h1 className="mt-6 text-3xl font-bold">Hesap Oluştur</h1>

          <p className="mt-2 text-sm text-white/50">
            Ürünlerini ve dijital sahiplik kayıtlarını yönet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Ad Soyad
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
              placeholder="Adınız ve soyadınız"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              E-posta
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Telefon
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
              placeholder="05xxxxxxxxx"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/80"
            >
              Şifre
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
              placeholder="En az 8 karakter"
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
            {isSubmitting ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Zaten hesabın var mı?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}