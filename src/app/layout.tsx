import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CANLI_ADRES, PAYLASIM_GORSELI } from "@/lib/seo";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  title: {
    default: "ARKVIUM — Dijital Sahiplik Platformu",
    template: "%s | ARKVIUM",
  },
  description:
    "ARKVIUM, eşyalarına QR kodlu dijital kimlik kazandırır. Bulan kişi QR kodu okutur, kişisel bilgilerin korunurken sana güvenli şekilde ulaşır.",
  applicationName: "ARKVIUM",
  openGraph: {
    title: "ARKVIUM — Dijital Sahiplik Platformu",
    description:
      "Eşyaların kaybolsa bile sana geri dönsün. QR kodlu dijital sahiplik ve güvenli iletişim.",
    siteName: "ARKVIUM",
    locale: "tr_TR",
    type: "website",
    url: CANLI_ADRES,
    images: [PAYLASIM_GORSELI],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARKVIUM — Dijital Sahiplik Platformu",
    description:
      "Eşyaların kaybolsa bile sana geri dönsün. QR kodlu dijital sahiplik ve güvenli iletişim.",
    images: [PAYLASIM_GORSELI],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
