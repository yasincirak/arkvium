import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import { GIZLI_SAYFA_ROBOTS } from "@/lib/seo";
import Topbar from "@/components/admin/Topbar";
import { yoneticiErisimi } from "@/lib/session";
import { YOL_BASLIGI } from "@/lib/yol-basligi";

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
 * istekte veritabanından okunur (bkz. yoneticiErisimi).
 *
 * Yetkisiz istek, alt sayfalar render edilmeden yönlendirme yanıtı alır;
 * yönetim verisi istemciye hiç gönderilmez.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const istekBasliklari = await headers();
  const yol = istekBasliklari.get(YOL_BASLIGI);

  // Giriş sayfası kapının dışındadır; aksi hâlde yönlendirme döngüsü olur.
  if (yol === "/admin/login") {
    return <>{children}</>;
  }

  const erisim = await yoneticiErisimi();

  if (!erisim) {
    /*
      Buraya ancak middleware geçerli bir oturum doğruladıktan sonra
      gelinir; yani kullanıcı giriş yapmış ama rolü ADMIN değil. Onu kendi
      hesabına gönderiyoruz. Başlık yoksa middleware çalışmamış demektir —
      o durumda güvenli taraf yönetici girişidir.
    */
    redirect(yol ? "/account" : "/admin/login");
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
