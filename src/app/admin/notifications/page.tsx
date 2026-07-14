import { changeFinderMessageStatus } from "@/lib/actions";
import { getFinderMessages, getRecordById } from "@/lib/store";

export default async function NotificationsPage() {
  const messages = await getFinderMessages();

  const messagesWithRecords = await Promise.all(
    messages.map(async (message) => ({
      message,
      record: await getRecordById(message.recordId),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Gelen Bildirimler</h1>

        <p className="mt-2 text-sm text-white/50">
          QR kodu okutan kişilerden gelen mesajlar burada listelenir.
        </p>
      </div>

      {messagesWithRecords.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
          Henüz gelen bildirim yok.
        </div>
      ) : (
        <div className="space-y-4">
          {messagesWithRecords.map(({ message, record }) => {
            const statusLabel =
              message.status === "completed"
                ? "Tamamlandı"
                : message.status === "read"
                  ? "Okundu"
                  : "Yeni";

            const emailDeliveryStatusLabel =
              message.emailDeliveryStatus === "sent"
                ? "Gönderildi"
                : message.emailDeliveryStatus === "failed"
                  ? "Başarısız"
                  : "Bekliyor";

            return (
              <div
                key={message.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-white">
                        {record?.assetName ?? "Kayıt bulunamadı"}
                      </h2>

                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                        {statusLabel}
                      </span>

                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-white/70">
                        E-posta: {emailDeliveryStatusLabel}
                      </span>
                    </div>

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

                {message.status !== "completed" && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {message.status === "new" && (
                      <form
                        action={async () => {
                          "use server";
                          await changeFinderMessageStatus(message.id, "read");
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                        >
                          Okundu Olarak İşaretle
                        </button>
                      </form>
                    )}

                    <form
                      action={async () => {
                        "use server";
                        await changeFinderMessageStatus(
                          message.id,
                          "completed"
                        );
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
                      >
                        Tamamlandı
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}