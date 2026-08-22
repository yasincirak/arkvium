"use client";

import { FormEvent, useState } from "react";
import { fiyatBicimle } from "@/lib/siparis";

/**
 * Sandbox ödeme testi formu (yalnızca yönetim paneli).
 *
 * Akış: sipariş oluştur → `/api/payment/start` → iyzico Checkout Form.
 * Fiyat bu bileşenden GÖNDERİLMEZ; ekranda yalnızca gösterim amaçlıdır ve
 * sipariş tutarı sunucuda kataloğa göre yeniden hesaplanır.
 */

export type TestUrunu = {
  kod: string;
  ad: string;
  fiyatKurus: number;
  qrAdedi: number;
};

const BOS_FORM = {
  fullName: "",
  email: "",
  phone: "",
  addressLine: "",
  district: "",
  city: "",
  postalCode: "",
};

export default function OdemeTestiFormu({ urunler }: { urunler: TestUrunu[] }) {
  const [urunKodu, setUrunKodu] = useState(urunler[0]?.kod ?? "");
  const [alanlar, setAlanlar] = useState(BOS_FORM);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [durum, setDurum] = useState("");

  const secili = urunler.find((u) => u.kod === urunKodu);

  function alanDegistir(ad: keyof typeof BOS_FORM, deger: string) {
    setAlanlar((oncekiler) => ({ ...oncekiler, [ad]: deger }));
  }

  async function gonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setHata("");
    setCalisiyor(true);

    try {
      // 1) Sipariş oluştur. Gövdede fiyat YOK; yalnızca ürün kodu gider.
      setDurum("Sipariş oluşturuluyor...");

      const siparisYanit = await fetch("/api/admin/odeme-testi/siparis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urunKodu, ...alanlar }),
      });

      const siparisVeri = await siparisYanit.json();

      if (!siparisYanit.ok) {
        setHata(siparisVeri.error || "Sipariş oluşturulamadı.");

        return;
      }

      // 2) Mevcut ödeme başlatma ucu: yalnızca orderId gönderilir.
      setDurum("Ödeme oturumu başlatılıyor...");

      const odemeYanit = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: siparisVeri.orderId }),
      });

      const odemeVeri = await odemeYanit.json();

      if (!odemeYanit.ok) {
        setHata(
          `${odemeVeri.error || "Ödeme başlatılamadı."} (Sipariş ${
            siparisVeri.orderNumber
          } oluşturuldu ve ödenmemiş durumda kaldı.)`
        );

        return;
      }

      // 3) iyzico Checkout Form'a yönlendir.
      if (odemeVeri.paymentPageUrl) {
        setDurum("iyzico ödeme sayfasına yönlendiriliyorsunuz...");
        window.location.assign(odemeVeri.paymentPageUrl);

        return;
      }

      // Sağlayıcı yalnızca gömülü form içeriği döndürdüyse yönlendirme adresi
      // yoktur. Script enjekte edilmez; durum açıkça bildirilir.
      setHata(
        `Sağlayıcı yönlendirme adresi (paymentPageUrl) döndürmedi. Sipariş ${siparisVeri.orderNumber} oluşturuldu ve ödenmemiş durumda kaldı.`
      );
    } catch {
      setHata("İşlem tamamlanamadı. Bağlantınızı kontrol edin.");
    } finally {
      setCalisiyor(false);
      setDurum("");
    }
  }

  const girdiSinifi =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-500";

  return (
    <form
      onSubmit={gonder}
      className="rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="urun" className="mb-2 block text-sm text-white/60">
            Ürün (adet 1)
          </label>

          <select
            id="urun"
            value={urunKodu}
            onChange={(e) => setUrunKodu(e.target.value)}
            className={girdiSinifi}
          >
            {urunler.map((urun) => (
              <option key={urun.kod} value={urun.kod} className="bg-[#0a0a0f]">
                {urun.ad} — {fiyatBicimle(urun.fiyatKurus)} ({urun.qrAdedi} QR)
              </option>
            ))}
          </select>

          {secili && (
            <p className="mt-2 text-xs text-white/40">
              Gösterilen fiyat bilgi amaçlıdır. Sipariş tutarı sunucudaki ürün
              kataloğundan yeniden hesaplanır.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="fullName" className="mb-2 block text-sm text-white/60">
            Ad soyad
          </label>
          <input
            id="fullName"
            required
            value={alanlar.fullName}
            onChange={(e) => alanDegistir("fullName", e.target.value)}
            className={girdiSinifi}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-2 block text-sm text-white/60">
            Telefon
          </label>
          <input
            id="phone"
            required
            value={alanlar.phone}
            onChange={(e) => alanDegistir("phone", e.target.value)}
            className={girdiSinifi}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="email" className="mb-2 block text-sm text-white/60">
            E-posta
          </label>
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
            className="mb-2 block text-sm text-white/60"
          >
            Adres
          </label>
          <input
            id="addressLine"
            required
            value={alanlar.addressLine}
            onChange={(e) => alanDegistir("addressLine", e.target.value)}
            className={girdiSinifi}
          />
        </div>

        <div>
          <label htmlFor="district" className="mb-2 block text-sm text-white/60">
            İlçe
          </label>
          <input
            id="district"
            required
            value={alanlar.district}
            onChange={(e) => alanDegistir("district", e.target.value)}
            className={girdiSinifi}
          />
        </div>

        <div>
          <label htmlFor="city" className="mb-2 block text-sm text-white/60">
            İl
          </label>
          <input
            id="city"
            required
            value={alanlar.city}
            onChange={(e) => alanDegistir("city", e.target.value)}
            className={girdiSinifi}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="postalCode"
            className="mb-2 block text-sm text-white/60"
          >
            Posta kodu (isteğe bağlı)
          </label>
          <input
            id="postalCode"
            value={alanlar.postalCode}
            onChange={(e) => alanDegistir("postalCode", e.target.value)}
            className={girdiSinifi}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={calisiyor || urunler.length === 0}
        className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {calisiyor ? durum || "İşleniyor..." : "Sandbox ödemesini başlat"}
      </button>

      {hata && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {hata}
        </div>
      )}
    </form>
  );
}
