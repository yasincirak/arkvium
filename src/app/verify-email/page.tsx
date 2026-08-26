import type { Metadata } from "next";
import SayfaUstBari from "@/components/SayfaUstBari";
import { sozluk } from "@/lib/i18n";
import Link from "next/link";
import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export function generateMetadata(): Metadata {
  return {
    title: sozluk().kimlik.sayfaEpostaDogrulama,
    robots: { index: false, follow: false },
  };
}

export default function VerifyEmailPage() {
  const ceviri = sozluk();

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

          <h1 className="mt-6 text-3xl font-bold">{ceviri.kimlik.sayfaEpostaDogrulama}</h1>
        </div>

        <Suspense
          fallback={
            <p className="text-center text-sm text-white/50">{ceviri.ortak.yukleniyor}</p>
          }
        >
          <VerifyEmailClient />
        </Suspense>
      </div>
    </main>
  );
}
