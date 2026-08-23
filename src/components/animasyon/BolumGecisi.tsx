import type { ElementType, ReactNode } from "react";

/**
 * Bölüm giriş geçişi.
 *
 * GÖRÜNÜRLÜK HER KOŞULDA GARANTİDİR. Geçiş tamamen CSS ile yapılır
 * (bkz. globals.css `arkvium-belir`): animasyon sayfa yüklenince çalışır ve
 * `both` dolgu kipiyle görünür durumda biter. JavaScript çalışmasa,
 * hidratasyon gecikse veya kaydırma olayları hiç gelmese bile içerik
 * görünür kalır — bu bileşen istemci JavaScript'i GEREKTİRMEZ.
 *
 * Hareket azaltma tercihinde `globals.css` hiçbir animasyon tanımlamaz.
 */

export default function BolumGecisi({
  children,
  gecikme = 0,
  as: Etiket = "div",
  className,
  id,
}: {
  children: ReactNode;
  /** Sıralı görünme için gecikme (ms). Adım ve kart listelerinde kullanılır. */
  gecikme?: number;
  as?: ElementType;
  className?: string;
  id?: string;
}) {
  return (
    <Etiket
      id={id}
      className={className}
      data-gecis=""
      style={gecikme ? { animationDelay: `${gecikme}ms` } : undefined}
    >
      {children}
    </Etiket>
  );
}
