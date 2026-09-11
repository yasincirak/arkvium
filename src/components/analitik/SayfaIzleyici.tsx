"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { olayGonder, yolHaricTutuluyorMu } from "@/lib/analitik-istemci";

/**
 * Sayfa görüntüleme izleyicisi.
 *
 * Kök layout'a BİR KEZ eklenir. Yol değiştiğinde tek bir olay gönderir.
 *
 * YÖNETİM VE HESAP ALANI SAYILMAZ: `/admin` ve `/account` yolları burada
 * ve ayrıca sunucu ucunda elenir (iki kapı).
 *
 * Görünür hiçbir şey üretmez ve sayfa içeriğini etkilemez.
 */
export default function SayfaIzleyici() {
  const yol = usePathname();
  const sonGonderilen = useRef<string | null>(null);

  useEffect(() => {
    if (!yol || yolHaricTutuluyorMu(yol)) {
      return;
    }

    // Aynı yol için ikinci kez gönderilmez (React geliştirme modunda
    // efektler iki kez çalışır; sayaç şişmemelidir).
    if (sonGonderilen.current === yol) {
      return;
    }

    sonGonderilen.current = yol;

    olayGonder({ tur: "page_view", yol });
  }, [yol]);

  return null;
}
