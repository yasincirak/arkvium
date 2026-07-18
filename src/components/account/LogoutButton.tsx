"use client";

import { useTransition } from "react";
import { logoutUser } from "@/lib/logout-action";

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      logoutUser();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Çıkış yapılıyor..." : "Çıkış Yap"}
    </button>
  );
}