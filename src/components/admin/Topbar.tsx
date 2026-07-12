export default function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        <p className="text-xs text-gray-500">Genel Bakış</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Yönetici</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}