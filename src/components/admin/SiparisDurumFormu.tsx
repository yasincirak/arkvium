"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Sipariş hazırlık/kargo durumu güncelleme formu (yönetici).
 *
 * Yalnızca `paid → preparing` ve `preparing → shipped` geçişleri sunulur.
 * Buton görünse bile yetki ve geçiş kuralı sunucuda yeniden doğrulanır:
 * bu bileşen tek başına hiçbir şeyi güvence altına almaz.
 */

type SonrakiAdim = {
  hedef: string;
  etiket: string;
  aciklama: string;
};

const SONRAKI_ADIMLAR: Record<string, SonrakiAdim> = {
  paid: {
    hedef: "preparing",
    etiket: "Hazırlanıyor olarak işaretle",
    aciklama: "Ödeme alındı. Etiket baskısı ve paketleme başlatılabilir.",
  },
  preparing: {
    hedef: "shipped",
    etiket: "Kargolandı olarak işaretle",
    aciklama: "Paket hazırlanıyor. Kargoya verildiğinde işaretleyin.",
  },
};

export default function SiparisDurumFormu({
  orderId,
  durum,
}: {
  orderId: string;
  durum: string;
}) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");

  const adim = SONRAKI_ADIMLAR[durum];

  async function guncelle() {
    if (!adim) {
      return;
    }

    setHata("");
    setCalisiyor(true);

    try {
      const yanit = await fetch(`/api/admin/orders/${orderId}/durum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durum: adim.hedef }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.error || "Sipariş durumu güncellenemedi.");

        return;
      }

      router.refresh();
    } catch {
      setHata("Sipariş durumu güncellenemedi. Bağlantınızı kontrol edin.");
    } finally {
      setCalisiyor(false);
    }
  }

  if (!adim) {
    return (
      <p className="text-sm text-white/50">
        Bu sipariş için yapılabilecek bir durum güncellemesi yok.
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-white/50">{adim.aciklama}</p>

      <button
        type="button"
        onClick={guncelle}
        disabled={calisiyor}
        className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {calisiyor ? "Güncelleniyor..." : adim.etiket}
      </button>

      {hata && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {hata}
        </div>
      )}
    </div>
  );
}
