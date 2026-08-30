import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import { GIZLI_SAYFA_ROBOTS } from "@/lib/seo";
import Topbar from "@/components/admin/Topbar";
import { getUserSession } from "@/lib/session";
import { girisAdresi } from "@/lib/guvenli-yonlendirme";

export const metadata: Metadata = {
  title: "ARKVIUM | Yönetim Paneli",
  description: "ARKVIUM admin yönetim paneli.",
  // Yönetim paneli ve tüm alt sayfaları indekslenmez.
  robots: GIZLI_SAYFA_ROBOTS,
};

/**
 * Yönetim panelinin SUNUCU TARAFI yetki kapısı.
 *
 * Middleware yalnızca "geçerli imzalı oturum var mı" kontrolü yapabilir;
 * edge runtime veritabanına erişemez. Asıl karar burada verilir ve rol her
 * istekte veritabanından okunur.
 *
 * Yetkisiz kullanıcıya alt sayfalar RENDER EDİLMEZ: `children` yalnızca
 * rolü ADMIN olan kullanıcı için ağaca girer, bu yüzden yönetim verisi
 * istemciye hiç gönderilmez.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const oturum = await getUserSession();

  if (!oturum) {
    // Middleware normalde buraya gelmeden yönlendirir; bu ikinci kapı.
    redirect(girisAdresi("/admin"));
  }

  if (oturum.role !== "ADMIN") {
    /*
      DİKKAT: burada JSX DÖNDÜRÜLMEZ.

      Next.js layout ile page'i paralel render eder; layout'tan farklı bir
      ekran döndürmek alt sayfanın render edilmesini engellemez ve sayfanın
      çıktısı RSC yüküyle istemciye gider (ölçüldü: stok tablosu sızıyordu).
      `redirect()` render'ı iptal eder, istemciye yalnızca yönlendirme gider.
    */
    redirect("/yetkisiz");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Topbar />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
