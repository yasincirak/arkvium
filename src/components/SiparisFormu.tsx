"use client";

import { FormEvent, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";
import { fiyatBicimle } from "@/lib/siparis";

/**
 * Sipariş formu (herkese açık).
 *
 * Akış: sipariş oluştur → `/api/payment/start` → iyzico Checkout Form.
 * Fiyat buradan GÖNDERİLMEZ; ekranda yalnızca gösterilir ve sipariş tutarı
 * sunucuda ürün kataloğundan yeniden hesaplanır.
 */

const BOS_FORM = {
  fullName: "",
  email: "",
  phone: "",
  addressLine: "",
  district: "",
  city: "",
  postalCode: "",
};

export default function SiparisFormu({
  urunKodu,
  urunAdi,
  fiyatKurus,
  kargoKurus,
}: {
  urunKodu: string;
  urunAdi: string;
  fiyatKurus: number;
  kargoKurus: number;
}) {
  const ceviri = useSozluk();

  const [alanlar, setAlanlar] = useState(BOS_FORM);
  // Sipariş gövdesinden AYRI: kimlik numarası siparişe yazılmaz, yalnızca
  // ödeme adımında sağlayıcıya iletilir.
  const [kimlikNo, setKimlikNo] = useState("");
  const [calisiyor, setCalisiyor] = useState(false);
  const [durum, setDurum] = useState("");
  const [hata, setHata] = useState("");

  function alanDegistir(ad: keyof typeof BOS_FORM, deger: string) {
    setAlanlar((oncekiler) => ({ ...oncekiler, [ad]: deger }));
  }

  async function gonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setHata("");
    setCalisiyor(true);

    try {
      setDurum(ceviri.siparis.hazirlaniyor);

      const siparisYanit = await fetch("/api/siparis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urunKodu, ...alanlar }),
      });

      const siparisVeri = await siparisYanit.json();

      if (!siparisYanit.ok) {
        setHata(siparisVeri.error || ceviri.siparis.olusturulamadi);

        return;
      }

      setDurum(ceviri.siparis.yonlendiriliyor);

      const odemeYanit = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: siparisVeri.orderId, kimlikNo }),
      });

      const odemeVeri = await odemeYanit.json();

      if (!odemeYanit.ok) {
        setHata(
          `${odemeVeri.error || ceviri.siparis.odemeBaslatilamadi} Sipariş numaranız: ${
            siparisVeri.orderNumber
          }`
        );

        return;
      }

      if (odemeVeri.paymentPageUrl) {
        window.location.assign(odemeVeri.paymentPageUrl);

        return;
      }

      setHata(
        `Ödeme sayfası açılamadı. Sipariş numaranız: ${siparisVeri.orderNumber}`
      );
    } catch {
      setHata(ceviri.siparis.baglantiHatasi);
    } finally {
      setCalisiyor(false);
      setDurum("");
    }
  }

  const girdiSinifi =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500";

  return (
    <form onSubmit={gonder} className="mt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{ceviri.siparis.teslimatBilgileri}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm text-slate-600">{ceviri.kalanlar.adSoyad}</label>
            <input
              id="fullName"
              required
              value={alanlar.fullName}
              onChange={(e) => alanDegistir("fullName", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm text-slate-600">{ceviri.kalanlar.telefon}</label>
            <input
              id="phone"
              required
              value={alanlar.phone}
              onChange={(e) => alanDegistir("phone", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="email" className="mb-2 block text-sm text-slate-600">{ceviri.kalanlar.eposta}</label>
            <input
              id="email"
              type="email"
              required
              value={alanlar.email}
              onChange={(e) => alanDegistir("email", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="addressLine"
              className="mb-2 block text-sm text-slate-600"
            >{ceviri.kalanlar.adres}</label>
            <input
              id="addressLine"
              required
              value={alanlar.addressLine}
              onChange={(e) => alanDegistir("addressLine", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div>
            <label htmlFor="district" className="mb-2 block text-sm text-slate-600">{ceviri.kalanlar.ilce}</label>
            <input
              id="district"
              required
              value={alanlar.district}
              onChange={(e) => alanDegistir("district", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-2 block text-sm text-slate-600">{ceviri.kalanlar.il}</label>
            <input
              id="city"
              required
              value={alanlar.city}
              onChange={(e) => alanDegistir("city", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div>
            <label
              htmlFor="postalCode"
              className="mb-2 block text-sm text-slate-600"
            >{ceviri.kalanlar.postaKodu}</label>
            <input
              id="postalCode"
              value={alanlar.postalCode}
              onChange={(e) => alanDegistir("postalCode", e.target.value)}
              className={girdiSinifi}
            />
          </div>

          <div>
            <label htmlFor="kimlikNo" className="mb-2 block text-sm text-slate-600">{ceviri.kalanlar.kimlikNumarasi}</label>
            <input
              id="kimlikNo"
              required
              inputMode="numeric"
              value={kimlikNo}
              onChange={(e) => setKimlikNo(e.target.value)}
              className={girdiSinifi}
            />
            <p className="mt-2 text-xs text-slate-500">{ceviri.kalanlar.kimlikAciklama}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{urunAdi}</span>
          <span>{fiyatBicimle(fiyatKurus)}</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-slate-600">{ceviri.kalanlar.kargo}</span>
          <span>{fiyatBicimle(kargoKurus)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 font-semibold">
          <span>{ceviri.siparis.toplam}</span>
          <span>{fiyatBicimle(fiyatKurus + kargoKurus)}</span>
        </div>

        <button
          type="submit"
          disabled={calisiyor}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {calisiyor ? durum || "İşleniyor..." : ceviri.siparis.odemeyeGec}
        </button>

        {hata && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {hata}
          </div>
        )}
      </div>
    </form>
  );
}
