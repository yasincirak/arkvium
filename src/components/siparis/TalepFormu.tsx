"use client";

import { useState } from "react";
import { GEREKCE_EN_AZ, type TalepTuru } from "@/lib/siparis-talebi-kurallari";

/**
 * Müşterinin iptal veya iade talebi oluşturduğu sade form.
 *
 * Sipariş, sayfanın adresindeki kriptografik `publicToken` ile
 * tanımlanır; sipariş kimliği tarayıcıya hiç verilmez ve gönderilmez.
 * Hangi talep türünün açılabileceğine SUNUCU karar verir — buradaki
 * seçenekler yalnızca kullanıcıya kolaylık sağlar.
 */

type Talep = {
  id: string;
  type: TalepTuru;
  status: "pending" | "approved" | "rejected";
  gerekce: string;
  yoneticiNotu: string | null;
  createdAt: string;
};

const TUR_ETIKETI: Record<TalepTuru, string> = {
  cancel: "Sipariş iptali",
  refund: "İade",
};

const DURUM_ETIKETI: Record<Talep["status"], string> = {
  pending: "Değerlendiriliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function TalepFormu({
  publicToken,
  onerilenTur,
  mevcutTalepler,
}: {
  publicToken: string;
  /** Sipariş durumuna göre sunucunun önerdiği tür. */
  onerilenTur: TalepTuru;
  mevcutTalepler: Talep[];
}) {
  const [acik, setAcik] = useState(false);
  const [tur, setTur] = useState<TalepTuru>(onerilenTur);
  const [gerekce, setGerekce] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [talepler, setTalepler] = useState<Talep[]>(mevcutTalepler);

  const bekleyenVar = talepler.some((talep) => talep.status === "pending");

  async function gonder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setHata("");
    setCalisiyor(true);

    try {
      const yanit = await fetch("/api/siparis/talep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, tur, gerekce }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri?.error || "Talep oluşturulamadı.");

        return;
      }

      setTalepler((onceki) => [veri.talep, ...onceki]);
      setGerekce("");
      setAcik(false);
    } catch {
      setHata("Bağlantı kurulamadı.");
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold text-white">
        İptal ve iade talepleri
      </h2>

      {talepler.length > 0 && (
        <ul className="mt-4 space-y-3">
          {talepler.map((talep) => (
            <li
              key={talep.id}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-white">
                  {TUR_ETIKETI[talep.type]}
                </span>

                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
                  {DURUM_ETIKETI[talep.status]}
                </span>
              </div>

              <p className="mt-2 text-sm text-white/60">{talep.gerekce}</p>

              {talep.yoneticiNotu && (
                <p className="mt-2 rounded-lg bg-white/5 p-3 text-sm text-white/70">
                  <span className="text-white/40">Yanıt:</span>{" "}
                  {talep.yoneticiNotu}
                </p>
              )}

              <p className="mt-2 text-xs text-white/40">
                {new Date(talep.createdAt).toLocaleString("tr-TR")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {bekleyenVar ? (
        <p className="mt-4 text-sm text-white/60">
          Bekleyen talebiniz değerlendiriliyor. Sonuçlanmadan yeni talep
          oluşturamazsınız.
        </p>
      ) : acik ? (
        <form onSubmit={gonder} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="talepTuru"
              className="mb-2 block text-sm text-white/60"
            >
              Talep türü
            </label>

            <select
              id="talepTuru"
              value={tur}
              onChange={(e) => setTur(e.target.value as TalepTuru)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
            >
              <option value="cancel">Sipariş iptali</option>
              <option value="refund">İade</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="gerekce"
              className="mb-2 block text-sm text-white/60"
            >
              Gerekçe (en az {GEREKCE_EN_AZ} karakter)
            </label>

            <textarea
              id="gerekce"
              required
              minLength={GEREKCE_EN_AZ}
              rows={4}
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
              placeholder="Talebinizin nedenini kısaca yazın."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={calisiyor}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {calisiyor ? "Gönderiliyor…" : "Talebi gönder"}
            </button>

            <button
              type="button"
              disabled={calisiyor}
              onClick={() => setAcik(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            >
              Vazgeç
            </button>
          </div>

          {hata && (
            <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
              {hata}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAcik(true)}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Talep oluştur
        </button>
      )}
    </div>
  );
}
