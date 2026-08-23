import type { Metadata } from "next";
import { GIZLI_SAYFA_ROBOTS } from "@/lib/seo";

/**
 * Bu bölüm indekslenmez.
 *
 * Sayfanın kendisi bir istemci bileşeni olduğu için `metadata` export
 * edemez; kural bu layout üzerinden verilir. Layout yalnızca metadata taşır,
 * görünümü değiştirmez.
 */
export const metadata: Metadata = {
  robots: GIZLI_SAYFA_ROBOTS,
};

export default function GirisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
