"use client";

import { useRouter } from "next/navigation";

export default function NewRecordButton() {
  const router = useRouter();

  function handleClick() {
    router.push("/admin/new");
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
    >
      + Yeni Kayıt Oluştur
    </button>
  );
}