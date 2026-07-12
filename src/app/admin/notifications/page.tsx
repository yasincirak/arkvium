import { getFinderMessages, getRecordById } from "@/lib/store";

export default function NotificationsPage() {
  const messages = getFinderMessages();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Gelen Bildirimler</h1>
        <p className="mt-2 text-sm text-white/50">
          QR kodu okutan kişilerden gelen mesajlar burada listelenir.
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
          Henüz gelen bildirim yok.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const record = getRecordById(message.recordId);

            return (
              <div
                key={message.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {record?.assetName ?? "Kayıt bulunamadı"}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">
                      Gönderen: {message.finderName}
                    </p>
                  </div>

                  <span className="text-sm text-white/40">
                    {new Date(message.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                  <div>
                    <span className="text-white/40">Telefon:</span>{" "}
                    {message.finderPhone}
                  </div>

                  <div>
                    <span className="text-white/40">E-posta:</span>{" "}
                    {message.finderEmail || "Belirtilmedi"}
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-white/40">Konum:</span>{" "}
                    {message.location || "Belirtilmedi"}
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-white/40">Mesaj:</span>
                    <p className="mt-2 rounded-xl bg-black/20 p-4 text-white/80">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}