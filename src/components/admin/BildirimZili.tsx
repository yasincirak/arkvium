"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Yönetim panelindeki bildirim zili.
 *
 * - Okunmamış bildirim sayısını rozette gösterir.
 * - Listeyi düzenli aralıkla tazeler ("anlık" davranış). Sunucudan
 *   itilen bir bağlantı (SSE/WebSocket) yerine kısa aralıklı sorgu
 *   kullanılır: Vercel'de sunucusuz işlevlerle uzun süreli bağlantı
 *   güvenilir değildir, sorgu ise her ortamda çalışır.
 * - Bildirime basınca okundu işaretlenir ve sipariş detayı açılır.
 *
 * Sekme arka plandayken sorgu YAPILMAZ: gereksiz istek üretmez.
 */

type Kalem = { ad: string; adet: number };

type Bildirim = {
  id: string;
  orderId: string;
  baslik: string;
  metin: string;
  okundu: boolean;
  createdAt: string;
  orderNumber: string | null;
  musteriAdi: string | null;
  eposta: string | null;
  telefon: string | null;
  totalKurus: number | null;
  siparisTarihi: string | null;
  odemeTarihi: string | null;
  kalemler: Kalem[];
};

/** Kuruş tutarını görünen metne çevirir (fiyatBicimle ile aynı biçim). */
function tutarBicimle(kurus: number): string {
  return `${Math.trunc(kurus / 100)},${String(Math.abs(kurus % 100)).padStart(
    2,
    "0"
  )} TL`;
}

function tarihBicimle(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleString("tr-TR");
}

const TAZELEME_ARALIGI_MS = 20000;

export default function BildirimZili() {
  const router = useRouter();

  const [acik, setAcik] = useState(false);
  const [okunmamis, setOkunmamis] = useState(0);
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const getir = useCallback(async () => {
    try {
      const yanit = await fetch("/api/admin/bildirimler", {
        cache: "no-store",
      });

      if (!yanit.ok) {
        return;
      }

      const veri = await yanit.json();

      setOkunmamis(Number(veri?.okunmamis ?? 0));
      setBildirimler(Array.isArray(veri?.bildirimler) ? veri.bildirimler : []);
    } catch {
      // Ağ hatası sessiz geçilir; bir sonraki turda tekrar denenir.
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void getir();

    const zamanlayici = setInterval(() => {
      if (document.visibilityState === "visible") {
        void getir();
      }
    }, TAZELEME_ARALIGI_MS);

    return () => clearInterval(zamanlayici);
  }, [getir]);

  async function bildirimeGit(bildirim: Bildirim) {
    setAcik(false);

    try {
      await fetch("/api/admin/bildirimler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bildirim.id }),
      });
    } catch {
      // Okundu işaretlenemese bile sipariş detayı açılmalıdır.
    }

    router.push(`/admin/orders/${bildirim.orderId}`);
  }

  async function hepsiniOkunduYap() {
    try {
      await fetch("/api/admin/bildirimler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hepsi: true }),
      });

      await getir();
    } catch {
      // Sessiz.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAcik((onceki) => !onceki)}
        aria-label="Bildirimler"
        aria-expanded={acik}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base transition hover:bg-white/10"
      >
        <span aria-hidden>🔔</span>

        {okunmamis > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {okunmamis > 99 ? "99+" : okunmamis}
          </span>
        )}
      </button>

      {acik && (
        <div className="absolute right-0 z-30 mt-2 w-96 overflow-hidden rounded-xl border border-white/10 bg-[#12121a] shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-semibold text-white">
              Satış bildirimleri
            </span>

            {okunmamis > 0 && (
              <button
                type="button"
                onClick={hepsiniOkunduYap}
                className="text-xs text-indigo-300 transition hover:text-indigo-200"
              >
                Tümünü okundu yap
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {yukleniyor ? (
              <p className="px-4 py-6 text-sm text-white/50">Yükleniyor…</p>
            ) : bildirimler.length === 0 ? (
              <p className="px-4 py-6 text-sm text-white/50">
                Henüz satış bildirimi yok.
              </p>
            ) : (
              bildirimler.map((bildirim) => (
                <button
                  key={bildirim.id}
                  type="button"
                  onClick={() => bildirimeGit(bildirim)}
                  className={`flex w-full flex-col items-start gap-1 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 ${
                    bildirim.okundu ? "opacity-60" : ""
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white">
                      {bildirim.baslik}
                      {bildirim.orderNumber ? (
                        <span className="ml-2 font-mono text-xs text-white/60">
                          {bildirim.orderNumber}
                        </span>
                      ) : null}
                    </span>

                    {!bildirim.okundu && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                    )}
                  </span>

                  {/* Satın alınan ürünler */}
                  {bildirim.kalemler.length > 0 && (
                    <span className="text-sm text-white/70">
                      {bildirim.kalemler
                        .map((kalem) => `${kalem.ad} ×${kalem.adet}`)
                        .join(", ")}
                    </span>
                  )}

                  {/* Toplam tutar */}
                  <span className="text-sm font-semibold text-emerald-300">
                    {bildirim.totalKurus === null
                      ? bildirim.metin
                      : tutarBicimle(bildirim.totalKurus)}
                  </span>

                  {/*
                    Müşteri bilgileri siparişten CANLI okunur; bildirim
                    satırına kopyalanmaz (bkz. src/lib/bildirim.ts).
                  */}
                  {bildirim.musteriAdi && (
                    <span className="text-xs text-white/60">
                      {bildirim.musteriAdi}
                    </span>
                  )}

                  {(bildirim.telefon || bildirim.eposta) && (
                    <span className="text-xs text-white/50">
                      {[bildirim.telefon, bildirim.eposta]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}

                  <span className="text-xs text-white/40">
                    Ödeme: {tarihBicimle(bildirim.odemeTarihi ?? bildirim.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
