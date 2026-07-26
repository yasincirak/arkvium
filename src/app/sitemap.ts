import type { MetadataRoute } from "next";

/**
 * Sitemap yalnızca herkese açık tanıtım sayfalarını içerir.
 * Eşya erişim sayfaları (/item/...) ve hesap sayfaları bilinçli olarak
 * dışarıda bırakılmıştır.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return [];
  }

  const guncellemeTarihi = new Date();

  return [
    {
      url: appUrl,
      lastModified: guncellemeTarihi,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${appUrl}/register`,
      lastModified: guncellemeTarihi,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${appUrl}/login`,
      lastModified: guncellemeTarihi,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
