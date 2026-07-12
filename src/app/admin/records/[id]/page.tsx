import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFinderMessagesByRecordId,
  getRecordById,
} from "@/lib/store";

type RecordDetailPageProps = {
  params: {
    id: string;
  };
};

export default function RecordDetailPage({
  params,
}: RecordDetailPageProps) {
  const record = getRecordById(params.id);

  if (!record) {
    notFound();
  }

  const messages = getFinderMessagesByRecordId(record.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/records"
          className="text-sm text-white/50 transition hover:text-white"
        >
          ← Kayıtlara Dön
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-white">
          {record.assetName}
        </h1>

        <p className="mt-2 text-sm text-white/50">
          Kayıt bilgileri ve bu eşya için gelen bildirimler.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Kayıt Bilgileri
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Kayıt No: {record.id}
            </p>
          </div>

          <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
            {record.status || "Aktif"}
          </span>
        </div>

        <div className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-white/40">Eşya sahibi</p>
            <p className="mt-1 text-white">{record.ownerName}</p>
          </div>

          <div>
            <p className="text-white/40">Kategori</p>
            <p className="mt-1 text-white">
              {record.category || "Belirtilmedi"}
            </p>
          </div>

          <div>
            <p className="text-white/40">Telefon</p>
            <p className="mt-1 text-white">{record.phone}</p>
          </div>

          <div>
            <p className="text-white/40">E-posta</p>
            <p className="mt-1 text-white">
              {record.email || "Belirtilmedi"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-white/40">Açıklama</p>
            <p className="mt-1 text-white">
              {record.description || "Belirtilmedi"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-white/40">Oluşturulma tarihi</p>
            <p className="mt-1 text-white">
              {new Date(record.createdAt).toLocaleString("tr-TR")}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={`/item/${record.id}`}
            className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Ürün Sayfasını Aç
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">
          Gelen Bildirimler ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">
            Bu kayıt için henüz bildirim bulunmuyor.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {messages
              .slice()
              .reverse()
              .map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {message.finderName}
                      </h3>

                      <p className="mt-1 text-sm text-white/50">
                        {message.finderPhone}
                      </p>
                    </div>

                    <p className="text-xs text-white/40">
                      {new Date(message.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-white/40">Konum:</span>{" "}
                      <span className="text-white/70">
                        {message.location || "Belirtilmedi"}
                      </span>
                    </div>

                    <div>
                      <span className="text-white/40">E-posta:</span>{" "}
                      <span className="text-white/70">
                        {message.finderEmail || "Belirtilmedi"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-black/20 p-4 text-sm text-white/70">
                    {message.message || "Mesaj bırakılmadı."}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}