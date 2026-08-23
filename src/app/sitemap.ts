import type { MetadataRoute } from "next";
import { CANLI_ADRES } from "@/lib/seo";

/**
 * Sitemap YALNIZCA herkese açık, indekslenmesi gereken tanıtım sayfalarını
 * içerir.
 *
 * Bilerek DIŞARIDA bırakılanlar: admin, hesap, giriş/kayıt, sipariş ve ödeme
 * sonucu sayfaları, QR erişim adresleri (`/t/...`, `/item/...`) ve kullanıcıya
 * özel dinamik sayfalar. Bunlar robots.txt ile de engellenir.
 *
 * Adres ortam değişkeninden değil `CANLI_ADRES` sabitinden gelir; böylece
 * önizleme dağıtımları sitemap'e önizleme adresi yazamaz.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const guncellemeTarihi = new Date();

  return [
    {
      url: CANLI_ADRES,
      lastModified: guncellemeTarihi,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${CANLI_ADRES}/urun/arac-stickeri`,
      lastModified: guncellemeTarihi,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
