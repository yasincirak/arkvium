"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";

type Durum =
  | { tip: "yukleniyor" }
  | { tip: "basarili"; mesaj: string }
  | { tip: "hata"; mesaj: string };

export default function VerifyEmailClient() {
  const s = useSozluk();

  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [durum, setDurum] = useState<Durum>({ tip: "yukleniyor" });

  // React 18 geliştirme modunda effect iki kez çalışır; token tek kullanımlık
  // olduğu için ikinci istek "kullanılmış" hatası döndürürdü.
  const istekGonderildi = useRef(false);

  useEffect(() => {
    if (istekGonderildi.current) {
      return;
    }

    istekGonderildi.current = true;

    if (!token) {
      setDurum({
        tip: "hata",
        mesaj: s.kimlik.dogrulamaGecersiz,
      });
      return;
    }

    async function dogrula() {
      try {
        const response = await fetch("/api/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setDurum({
            tip: "hata",
            mesaj: data.error || s.kimlik.dogrulamaHatasi,
          });
          return;
        }

        setDurum({ tip: "basarili", mesaj: data.message });
      } catch {
        setDurum({
          tip: "hata",
          mesaj: s.ortak.baglantiHatasi,
        });
      }
    }

    dogrula();
  }, [token, s]);

  if (durum.tip === "yukleniyor") {
    return (
      <p role="status" className="text-center text-sm text-white/60">
        {s.kimlik.dogrulaniyor}
      </p>
    );
  }

  if (durum.tip === "basarili") {
    return (
      <div
        role="status"
        className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-4 text-sm leading-6 text-green-200"
      >
        <p>{durum.mesaj}</p>

        <Link
          href="/account"
          className="mt-3 inline-block font-medium text-green-100 underline"
        >
          {s.kimlik.hesabimaGit}
        </Link>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm leading-6 text-red-300"
    >
      <p>{durum.mesaj}</p>

      <Link
        href="/account"
        className="mt-3 inline-block font-medium text-red-100 underline"
      >
        {s.kimlik.hesabimaGit}
      </Link>
    </div>
  );
}
