import type { Metadata } from "next";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

export const metadata: Metadata = {
  title: "ARKVIUM | Yönetim Paneli",
  description: "ARKVIUM admin yönetim paneli.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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