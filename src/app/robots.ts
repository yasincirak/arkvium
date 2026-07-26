import type { MetadataRoute } from "next";

/**
 * Kişiye özel sayfalar (hesap, yönetim, eşya erişim sayfaları) arama
 * motorlarına kapalıdır. Yalnızca tanıtım sayfaları indekslenebilir.
 */
export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/item", "/t", "/api"],
    },
    ...(appUrl ? { sitemap: `${appUrl}/sitemap.xml` } : {}),
  };
}
