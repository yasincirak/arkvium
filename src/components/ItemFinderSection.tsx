"use client";

import { useState } from "react";
import FinderForm from "@/components/FinderForm";
import { whatsappBaglantisi } from "@/lib/telefon";

/**
 * Metinler PROP olarak gelir: bu bir istemci bileşenidir ve sunucudaki
 * sözlüğe doğrudan erişemez. Böylece dil çözümü tek yerde (sunucuda) kalır.
 */
export type BulanKisiMetinleri = {
  buldumDugmesi: string;
  whatsappIleIletisim: string;
  whatsappMesaji: string;
  form: {
    baslik: string;
    aciklama: string;
    adSoyad: string;
    telefon: string;
    konum: string;
    not: string;
    onay: string;
    gonder: string;
    gonderiliyor: string;
    eksikAlan: string;
    onayGerekli: string;
    gonderimHatasi: string;
    basariBaslik: string;
    basariMetin: string;
    basariNot: string;
  };
};

type ItemFinderSectionProps = {
  recordId: string;
  metinler: BulanKisiMetinleri;
};

export default function ItemFinderSection({
  recordId,
  metinler,
}: ItemFinderSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Destek numarası koda gömülmez; tanımlı değilse buton hiç gösterilmez.
  const whatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

  // Şablondaki {kayitNo} yer tutucusu doldurulur; metin sözlükten gelir.
  const whatsappMessage = metinler.whatsappMesaji.replace("{kayitNo}", recordId);

  // Adres merkezi yardımcıyla kurulur; numara çözülemezse null döner ve
  // buton gösterilmez.
  const whatsappUrl = whatsappBaglantisi(whatsappNumber, whatsappMessage);

  return (
    <div className="mt-10 space-y-4">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 font-semibold text-white transition hover:opacity-90"
        >
          {metinler.buldumDugmesi}
        </button>
      )}

      {isOpen && <FinderForm recordId={recordId} metinler={metinler.form} />}

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 py-3 font-semibold text-green-300 transition hover:bg-green-500/20"
        >
          {metinler.whatsappIleIletisim}
        </a>
      )}
    </div>
  );
}