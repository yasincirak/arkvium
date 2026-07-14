import Link from "next/link";
import { getRecords } from "@/lib/store";

export default async function RecordsPage() {
  const records = await getRecords();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Kayıtlar</h1>

        <p className="mt-2 text-sm text-white/50">
          Oluşturulan tüm ARKVIUM kayıtları burada listelenir.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
          Henüz kayıt oluşturulmadı.
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {record.assetName}
                  </h2>

                  <p className="mt-1 text-sm text-white/50">
                    Sahip: {record.ownerName}
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    Kategori: {record.category || "Belirtilmedi"}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
                    {record.status || "Aktif"}
                  </span>

                  <p className="mt-3 text-xs text-white/40">
                    {new Date(record.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <span className="text-white/40">Telefon:</span>{" "}
                  {record.phone}
                </div>

                <div>
                  <span className="text-white/40">E-posta:</span>{" "}
                  {record.email || "Belirtilmedi"}
                </div>

                <div className="sm:col-span-2">
                  <span className="text-white/40">Açıklama:</span>{" "}
                  {record.description || "Belirtilmedi"}
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/admin/records/${record.id}`}
                  className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  Detayları Gör
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}