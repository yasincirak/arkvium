"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Yönetim panelinde iptal/iade taleplerinin listesi ve kararı.
 *
 * KARAR SİPARİŞİ DEĞİŞTİRMEZ: onaylamak siparişi iptal etmez ve para
 * iadesi yapmaz. Onaydan sonra iptal ve geri ödeme işlemleri ayrıca
 * yürütülür; bu ayrım ekranda da açıkça yazılır.
 */

type Talep = {
  id: string;
  orderId: string;
  orderNumber: string;
  type: "cancel" | "refund";
  status: "pending" | "approved" | "rejected";
  gerekce: string;
  yoneticiNotu: string | null;
  createdAt: string;
  siparisDurumu: string;
  musteriAdi: string;
  eposta: string;
  telefon: string;
  totalKurus: number;
};

const TUR_ETIKETI = { cancel: "Sipariş iptali", refund: "İade" } as const;

const DURUM_ETIKETI = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
} as const;

function tutarBicimle(kurus: number): string {
  return `${Math.trunc(kurus / 100)},${String(Math.abs(kurus % 100)).padStart(
    2,
    "0"
  )} TL`;
}

export default function TalepYonetimi() {
  const router = useRouter();

  const [talepler, setTalepler] = useState<Talep[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [notlar, setNotlar] = useState<Record<string, string>>({});
  const [calisan, setCalisan] = useState<string | null>(null);
  const [hata, setHata] = useState("");

  const getir = useCallback(async () => {
    try {
      const yanit = await fetch("/api/admin/talepler", { cache: "no-store" });

      if (!yanit.ok) {
        return;
      }

      const veri = await yanit.json();

      setTalepler(Array.isArray(veri?.talepler) ? veri.talepler : []);
    } catch {
      // Sessiz: bir sonraki açılışta tekrar denenir.
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void getir();
  }, [getir]);

  async function karar(talep: Talep, secim: "approved" | "rejected") {
    setHata("");
    setCalisan(talep.id);

    try {
      const yanit = await fetch(`/api/admin/talepler/${talep.id}/karar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          karar: secim,
          yoneticiNotu: notlar[talep.id] ?? "",
        }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri?.error || "İşlem tamamlanamadı.");

        return;
      }

      await getir();
    } catch {
      setHata("Bağlantı kurulamadı.");
    } finally {
      setCalisan(null);
    }
  }

  if (yukleniyor) {
    return <p className="text-sm text-white/50">Yükleniyor…</p>;
  }

  if (talepler.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
        Henüz iptal veya iade talebi yok.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hata && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          {hata}
        </p>
      )}

      {talepler.map((talep) => (
        <div
          key={talep.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-mono text-lg font-semibold text-white">
                {talep.orderNumber}
              </h2>

              <p className="mt-1 text-sm text-white/50">
                {TUR_ETIKETI[talep.type]} · sipariş durumu:{" "}
                {talep.siparisDurumu}
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
              {DURUM_ETIKETI[talep.status]}
            </span>
          </div>

          <p className="mt-4 rounded-xl bg-black/20 p-4 text-sm text-white/80">
            {talep.gerekce}
          </p>

          <div className="mt-3 grid gap-1 text-sm text-white/50 sm:grid-cols-2">
            <span>{talep.musteriAdi}</span>
            <span>{tutarBicimle(talep.totalKurus)}</span>
            <span>{talep.telefon}</span>
            <span>{talep.eposta}</span>
          </div>

          {talep.status === "pending" ? (
            <div className="mt-5 space-y-3">
              <textarea
                rows={2}
                value={notlar[talep.id] ?? ""}
                onChange={(e) =>
                  setNotlar((onceki) => ({
                    ...onceki,
                    [talep.id]: e.target.value,
                  }))
                }
                placeholder="Müşteriye gösterilecek not (reddetmek için zorunlu)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={calisan === talep.id}
                  onClick={() => karar(talep, "approved")}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500/15 px-5 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  Onayla
                </button>

                <button
                  type="button"
                  disabled={calisan === talep.id}
                  onClick={() => karar(talep, "rejected")}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-rose-500/15 px-5 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
                >
                  Reddet
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/admin/orders/${talep.orderId}`)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Siparişi aç
                </button>
              </div>

              <p className="text-xs text-white/40">
                Onaylamak siparişi iptal etmez ve para iadesi yapmaz.
                İptal ve geri ödeme işlemlerini sipariş detayından ayrıca
                yürütün.
              </p>
            </div>
          ) : (
            talep.yoneticiNotu && (
              <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-white/70">
                <span className="text-white/40">Yanıt:</span>{" "}
                {talep.yoneticiNotu}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
}
