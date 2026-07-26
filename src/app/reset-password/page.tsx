import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Yeni Şifre Belirle",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
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

          <h1 className="mt-6 text-3xl font-bold">Yeni Şifre Belirle</h1>

          <p className="mt-2 text-sm text-white/50">
            Hesabın için yeni bir şifre oluştur.
          </p>
        </div>

        <Suspense
          fallback={
            <p className="text-center text-sm text-white/50">Yükleniyor...</p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
