import { whatsappBaglantisi } from "@/lib/telefon";

/**
 * Telefon numarasını tıklanabilir WhatsApp bağlantısına çevirir.
 *
 * Numara çözülemezse (bkz. `whatsappNumarasi`) bağlantı üretilmez ve numara
 * düz metin olarak gösterilir; bozuk bir wa.me adresi asla oluşmaz.
 */
type WhatsappBaglantisiProps = {
  telefon: string;
  /** Sohbet kutusuna önceden yazılacak metin. */
  mesaj?: string;
};

export default function WhatsappBaglantisi({
  telefon,
  mesaj,
}: WhatsappBaglantisiProps) {
  const adres = whatsappBaglantisi(telefon, mesaj);

  if (!adres) {
    return <>{telefon}</>;
  }

  return (
    <a
      href={adres}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-emerald-300 underline-offset-2 transition hover:text-emerald-200 hover:underline"
    >
      {telefon}
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium">
        WhatsApp
      </span>
    </a>
  );
}
