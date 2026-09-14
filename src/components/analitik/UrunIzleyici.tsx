"use client";

import { useEffect, useRef } from "react";
import { olayGonder } from "@/lib/analitik-istemci";

/**
 * Ürün görüntüleme izleyicisi.
 *
 * Ürün detay ve sipariş sayfalarına eklenir; sayfa açıldığında o ürün
 * için tek bir `product_view` olayı gönderir.
 *
 * Ürün kodu sunucu bileşeninden gelir ve uçta katalogla yeniden
 * doğrulanır; tarayıcıdan uydurma kod gönderilse bile kaydedilmez.
 */
export default function UrunIzleyici({ urunKodu }: { urunKodu: string }) {
  const gonderildi = useRef(false);

  useEffect(() => {
    if (gonderildi.current) {
      return;
    }

    gonderildi.current = true;

    olayGonder({ tur: "product_view", urunKodu });
  }, [urunKodu]);

  return null;
}
