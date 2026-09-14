"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  cerezOnayiOku,
  olayGonder,
  yolHaricTutuluyorMu,
} from "@/lib/analitik-istemci";
import { ONAY_DEGISTI_OLAYI } from "@/lib/cerez-onayi";

/**
 * Sayfa görüntüleme izleyicisi.
 *
 * Kök layout'a BİR KEZ eklenir. Yol değiştiğinde tek bir olay gönderir.
 *
 * YÖNETİM VE HESAP ALANI SAYILMAZ: `/admin` ve `/account` yolları burada
 * ve ayrıca sunucu ucunda elenir (iki kapı).
 *
 * ONAY BEKLEYEN GÖRÜNTÜLEME: ziyaretçi sayfayı açtığında henüz karar
 * vermemiş olabilir. Bu durumda olay gönderilmez ama KAYBEDİLMEZ de:
 * kullanıcı bannerdan "Kabul Et" derse o anki sayfa görüntülemesi
 * gönderilir. Reddederse hiçbir şey gönderilmez.
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

    function gonder() {
      if (!yol || cerezOnayiOku() !== "kabul") {
        return;
      }

      // Aynı yol için ikinci kez gönderilmez (React geliştirme modunda
      // efektler iki kez çalışır; sayaç şişmemelidir).
      if (sonGonderilen.current === yol) {
        return;
      }

      sonGonderilen.current = yol;

      olayGonder({ tur: "page_view", yol });
    }

    gonder();

    // Kullanıcı sonradan kabul ederse bu sayfanın görüntülemesi gönderilir.
    window.addEventListener(ONAY_DEGISTI_OLAYI, gonder);

    return () => window.removeEventListener(ONAY_DEGISTI_OLAYI, gonder);
  }, [yol]);

  return null;
}
