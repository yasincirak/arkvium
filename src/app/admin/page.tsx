import StatCard from "@/components/admin/StatCard";
import NewRecordButton from "@/components/admin/NewRecordButton";
import { getRecords, getFinderMessages } from "@/lib/store";

export default async function AdminDashboardPage() {
  const records = await getRecords();
  const messages = await getFinderMessages();

  const activeRecords = records.filter(
    (record) => record.status === "active"
  ).length;

  const newMessages = messages.filter(
    (message) => message.status === "new"
  ).length;

  const completedMessages = messages.filter(
    (message) => message.status === "completed"
  ).length;

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
          value={activeRecords.toString()}
        />

        <StatCard
          icon="🔔"
          label="Yeni Bildirim"
          value={newMessages.toString()}
        />

        <StatCard
          icon="✅"
          label="Tamamlanan"
          value={completedMessages.toString()}
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