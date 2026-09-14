"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KARGO_FIRMALARI } from "@/lib/kargo";

/**
 * Sipariş hazırlık/kargo durumu güncelleme formu (yönetici).
 *
 * Yalnızca `paid → preparing` ve `preparing → shipped` geçişleri sunulur.
 * Buton görünse bile yetki ve geçiş kuralı sunucuda yeniden doğrulanır:
 * bu bileşen tek başına hiçbir şeyi güvence altına almaz.
 *
 * KARGO BİLGİSİ
 * `shipped` geçişinde firma ve takip numarası istenir. Burada serbest bir
 * ADRES alanı YOKTUR: müşteriye gösterilen takip bağlantısı sunucuda,
 * beyaz listedeki firma kalıbından üretilir (bkz. src/lib/kargo.ts).
 *
 * Alanlar isteğe bağlıdır; mevcut iş kuralı kargo bilgisi olmadan da
 * `shipped` geçişine izin veriyordu ve bu davranış değiştirilmedi.
 * Biri doldurulup diğeri boş bırakılırsa sunucu isteği reddeder
 * (yarım kargo bilgisi müşteriyi yanıltır).
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
  const [kargoFirmaKod, setKargoFirmaKod] = useState("");
  const [kargoTakipNo, setKargoTakipNo] = useState("");

  const adim = SONRAKI_ADIMLAR[durum];
  const kargoIstenir = adim?.hedef === "shipped";

  async function guncelle() {
    if (!adim) {
      return;
    }

    setHata("");
    setCalisiyor(true);

    try {
      const govde: Record<string, string> = { durum: adim.hedef };

      /*
        Kargo alanları YALNIZCA `shipped` geçişinde ve yalnızca
        doldurulmuşlarsa gönderilir. Boş metin göndermek, sunucuda
        "yarım kargo bilgisi" hatasına yol açardı.
      */
      if (kargoIstenir && (kargoFirmaKod.trim() || kargoTakipNo.trim())) {
        govde.kargoFirmaKod = kargoFirmaKod.trim();
        govde.kargoTakipNo = kargoTakipNo.trim();
      }

      const yanit = await fetch(`/api/admin/orders/${orderId}/durum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
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

      {kargoIstenir && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-white/60">Kargo firması</span>
            <select
              value={kargoFirmaKod}
              onChange={(olay) => setKargoFirmaKod(olay.target.value)}
              disabled={calisiyor}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="">Seçilmedi</option>
              {KARGO_FIRMALARI.map((firma) => (
                <option key={firma.kod} value={firma.kod}>
                  {firma.ad}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-white/60">Takip numarası</span>
            <input
              type="text"
              value={kargoTakipNo}
              onChange={(olay) => setKargoTakipNo(olay.target.value)}
              disabled={calisiyor}
              maxLength={40}
              placeholder="Örn. 1234567890"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none focus:border-indigo-400"
            />
          </label>

          <p className="text-xs text-white/40 sm:col-span-2">
            Kargo bilgisi zorunlu değildir. Girilecekse firma ve takip
            numarasının ikisi de doldurulmalıdır. Takip bağlantısı sunucuda
            üretilir; elle adres girilmez.
          </p>
        </div>
      )}

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
