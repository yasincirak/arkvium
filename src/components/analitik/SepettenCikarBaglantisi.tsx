"use client";

import Link from "next/link";
import { olayGonder } from "@/lib/analitik-istemci";

/**
 * "Vazgeç" bağlantısı — sepetten çıkarma olayını gönderir.
 *
 * NEDEN BURASI: sitede çok ürünlü bir sepet arayüzü yoktur; ziyaretçi
 * ürün kartından doğrudan tek ürünlük sipariş formuna gelir. Bu sayfadan
 * ürünü almadan ayrılmak, huninin "sepetten çıkarma" adımının GERÇEK
 * karşılığıdır.
 *
 * Tarayıcının geri düğmesiyle ayrılmayı ölçmeyiz: o davranış güvenilir
 * biçimde yakalanamaz ve ölçülemeyen bir olayı varmış gibi göstermek
 * raporu yanıltır. Yalnızca AÇIK vazgeçme sayılır.
 *
 * Olay `keepalive` ile gider; yönlendirme beklemez ve gecikme yaratmaz.
 */
export default function SepettenCikarBaglantisi({
  urunKodu,
  href,
  className,
  children,
}: {
  urunKodu: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => olayGonder({ tur: "cart_remove", urunKodu })}
    >
      {children}
    </Link>
  );
}
