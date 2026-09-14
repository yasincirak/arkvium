"use client";

import { useSozluk } from "@/lib/i18n/istemci";
import { CEREZ_PANELI_AC } from "@/components/CerezOnayi";

/**
 * Footer'daki "Çerez Tercihleri" bağlantısı.
 *
 * Kullanıcının kararını SONRADAN değiştirebilmesi mevzuatın gereğidir:
 * onayı vermek kadar geri almak da kolay olmalıdır. Bağlantı, kök
 * layout'ta zaten duran çerez panelini açar; ayrı bir sayfa açmaz,
 * böylece kullanıcı bulunduğu sayfadan ayrılmaz.
 */
export default function CerezTercihleriBaglantisi({
  className,
}: {
  className?: string;
}) {
  const s = useSozluk();

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(CEREZ_PANELI_AC))}
      className={className}
    >
      {s.footer.cerezTercihleri}
    </button>
  );
}
