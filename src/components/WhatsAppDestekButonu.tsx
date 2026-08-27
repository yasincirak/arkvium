"use client";

import { usePathname } from "next/navigation";
import { useSozluk } from "@/lib/i18n/istemci";

/**
 * Sağ alt köşede sabit duran WhatsApp destek butonu.
 *
 * NUMARA: Yalnızca `NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER` ortam değişkeninden
 * gelir; koda gömülmez. Değer ülke kodu dâhil SADECE rakam olmalıdır
 * (örn. 905XXXXXXXXX). Tanımsız, boş veya biçimi bozuk bir değerde buton
 * HİÇ gösterilmez ve bozuk bir bağlantı üretilmez.
 *
 * GİZLİLİK: Hazır mesaj sabittir. Kullanıcı adı, e-posta, telefon, adres,
 * sipariş bilgisi, QR tokenı, aktivasyon kodu veya sağlık bilgisi mesaja
 * EKLENMEZ. Sayfanın adresi, sorgu parametreleri, çerez ve localStorage
 * içeriği de aktarılmaz. Takip kodu yoktur.
 *
 * DAVRANIŞ: Yalnızca bir bağlantıdır — tıklanınca yeni sekmede WhatsApp
 * açılır ve mesaj yazma alanına HAZIRLANIR; otomatik gönderim yoktur.
 * Sayfanın adresini veya durumunu değiştirmez, form değerlerini silmez.
 *
 * ADMIN: Yönetim paneli ROTA üzerinden dışlanır (`/admin`), görsel bir
 * gizleme hilesi kullanılmaz.
 */

/** Ülke kodu dâhil rakam sınırları (E.164 üst sınırı 15'tir). */
const NUMARA_BICIMI = /^\d{10,15}$/;

function WhatsAppSimgesi() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="h-7 w-7"
    >
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.25 8.21z" />
    </svg>
  );
}

export default function WhatsAppDestekButonu() {
  const ceviri = useSozluk();
  const yol = usePathname();

  // Yönetim paneli ve alt sayfalarında gösterilmez.
  if (yol?.startsWith("/admin")) {
    return null;
  }

  const numara = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.trim();

  // Tanımsız veya biçimi bozuk numarada buton hiç basılmaz.
  if (!numara || !NUMARA_BICIMI.test(numara)) {
    return null;
  }

  const adres = `https://wa.me/${numara}?text=${encodeURIComponent(
    ceviri.whatsapp.mesaj
  )}`;

  return (
    <a
      href={adres}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ceviri.whatsapp.erisilebilirAd}
      /*
        Konum: masaüstünde sağdan/alttan 24px, mobilde sağdan 16px ve
        alttan güvenli alan kadar boşluk (iPhone ana sayfa çubuğu).

        z-10: sayfa içeriğinin üstünde, ancak sticky header (z-20) ve mobil
        menünün ALTINDA kalır; menüyü kapatmaz, modal/uyarıların üzerine
        çıkmaz.
      */
      className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_16px_rgb(16_26_61_/_0.18)] transition duration-200 hover:scale-105 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ark-accent motion-reduce:transform-none sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <WhatsAppSimgesi />
    </a>
  );
}
