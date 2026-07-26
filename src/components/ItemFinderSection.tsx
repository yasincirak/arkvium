"use client";

import { useState } from "react";
import FinderForm from "@/components/FinderForm";

type ItemFinderSectionProps = {
  recordId: string;
};

export default function ItemFinderSection({
  recordId,
}: ItemFinderSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Destek numarası koda gömülmez; tanımlı değilse buton hiç gösterilmez.
  const whatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

  const whatsappMessage = `Merhaba, ARKVIUM sistemine kayıtlı bir eşyayı buldum.

Kayıt No: ${recordId}

Eşya hakkında bilgi vermek istiyorum.`;

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        whatsappMessage
      )}`
    : null;

  return (
    <div className="mt-10 space-y-4">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Bu eşyayı buldum
        </button>
      )}

      {isOpen && <FinderForm recordId={recordId} />}

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-xl border border-green-500/30 bg-green-500/10 py-3 font-semibold text-green-300 transition hover:bg-green-500/20"
        >
          WhatsApp ile iletişime geç
        </a>
      )}
    </div>
  );
}