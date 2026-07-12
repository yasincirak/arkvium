import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-white/[0.02] md:block">
      <div className="px-6 py-6">
        <span className="text-xl font-bold tracking-tight text-white">
          ARKVIUM
        </span>
        <p className="mt-1 text-xs text-gray-500">Yönetim Paneli</p>
      </div>

      <nav className="mt-4 px-3">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300"
        >
          <span>📊</span>
          <span>Dashboard</span>
        </Link>

        <Link
          href="/admin/records"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5"
        >
          <span>📁</span>
          <span>Kayıtlar</span>
        </Link>

        <Link
          href="/admin/notifications"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5"
        >
          <span>🔔</span>
          <span>Bildirimler</span>
        </Link>

        <Link
          href="/admin/settings"
          className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5"
        >
          <span>⚙️</span>
          <span>Ayarlar</span>
        </Link>
      </nav>
    </aside>
  );
}