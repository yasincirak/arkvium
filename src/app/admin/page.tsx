import StatCard from "@/components/admin/StatCard";
import NewRecordButton from "@/components/admin/NewRecordButton";
import { getRecords, getFinderMessages } from "@/lib/store";

export default function AdminDashboardPage() {
  const records = getRecords();
  const messages = getFinderMessages();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Genel Bakış</h2>
          <p className="mt-1 text-sm text-gray-400">
            ARKVIUM yönetim paneline hoş geldiniz.
          </p>
        </div>

        <NewRecordButton />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="📁"
          label="Toplam Kayıt"
          value={records.length.toString()}
        />

        <StatCard
          icon="🔗"
          label="Aktif Bağlantı"
          value={records.length.toString()}
        />

        <StatCard
          icon="🔔"
          label="Yeni Bildirim"
          value={messages.length.toString()}
        />

        <StatCard
          icon="✅"
          label="Tamamlanan"
          value="0"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white">Son Kayıtlar</h3>

        {records.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            Henüz kayıt bulunmuyor.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-lg border border-white/10 p-4"
              >
                <p className="font-semibold">{record.assetName}</p>
                <p className="text-sm text-gray-400">
                  {record.ownerName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}