"use client";

import Link from "next/link";
import { olayGonder } from "@/lib/analitik-istemci";

/**
 * "Satın Al" bağlantısı — sepete ekleme olayını da gönderir.
 *
 * NEDEN BURASI: sitede çok ürünlü bir sepet arayüzü yoktur; ziyaretçi
 * ürün kartındaki düğmeye basıp doğrudan tek ürünlük sipariş formuna
 * gider. Bu tıklama, huninin "sepete ekleme" adımının GERÇEK karşılığıdır.
 *
 * Bağlantının davranışı DEĞİŞMEZ: `next/link` yönlendirmesi olduğu gibi
 * çalışır, olay `keepalive` ile arka planda gider ve gecikme yaratmaz.
 * Analitik başarısız olsa bile kullanıcı sipariş sayfasına gider.
 */
export default function SepeteEkleBaglantisi({
  urunKodu,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  urunKodu: string;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link
      href={`/siparis?urun=${urunKodu}`}
      className={className}
      aria-label={ariaLabel}
      onClick={() => olayGonder({ tur: "cart_add", urunKodu })}
    >
      {children}
    </Link>
  );
}
