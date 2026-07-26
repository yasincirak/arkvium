"use client";

import { useState } from "react";

export default function LogoutAllButton() {
  const [onayBekliyor, setOnayBekliyor] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");

  async function tumOturumlariKapat() {
    setCalisiyor(true);
    setHata("");

    try {
      const response = await fetch("/api/session/logout-all", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        setHata(data.error || "İşlem tamamlanamadı.");
        setCalisiyor(false);
        return;
      }

      // Bu cihazın oturumu da kapandığı için giriş ekranına gidilir.
      window.location.href = "/login";
    } catch {
      setHata("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
      setCalisiyor(false);
    }
  }

  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <h3 className="font-medium text-white/90">Tüm cihazlardan çık</h3>

      <p className="mt-1 text-sm leading-6 text-white/50">
        Hesabına başka bir cihazdan izinsiz erişildiğini düşünüyorsan tüm
        oturumları kapat. Bu cihazdan da çıkış yapılır.
      </p>

      {!onayBekliyor ? (
        <button
          type="button"
          onClick={() => setOnayBekliyor(true)}
          className="mt-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Tüm Oturumları Kapat
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <p className="text-sm leading-6 text-amber-100">
            Tüm cihazlardaki oturumlar kapatılacak ve yeniden giriş yapman
            gerekecek. Devam edilsin mi?
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={tumOturumlariKapat}
              disabled={calisiyor}
              className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calisiyor ? "Kapatılıyor..." : "Evet, tümünü kapat"}
            </button>

            <button
              type="button"
              onClick={() => setOnayBekliyor(false)}
              disabled={calisiyor}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {hata && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {hata}
        </p>
      )}
    </div>
  );
}
