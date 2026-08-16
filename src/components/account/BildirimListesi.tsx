import WhatsappBaglantisi from "@/components/WhatsappBaglantisi";
import type { FinderMessage } from "@/lib/types";

/**
 * Hesabımda bildirimler — bir ürüne gelen "eşyanı buldum" mesajları.
 *
 * Mesajlar sayfa tarafında `getFinderMessagesForOwner` ile çekilir; yalnızca
 * kaydın sahibi dolu bir liste alır. Bu bileşen yalnızca arayüzdür.
 */
type BildirimListesiProps = {
  mesajlar: FinderMessage[];
};

export default function BildirimListesi({ mesajlar }: BildirimListesiProps) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-xl font-semibold">
        Gelen Bildirimler ({mesajlar.length})
      </h2>

      {mesajlar.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-white/50">
          Bu ürün için henüz bildirim yok. Eşyanı bulan biri QR kodunu okutup
          mesaj bıraktığında burada görünecek.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {mesajlar.map((mesaj) => (
            <div
              key={mesaj.id}
              className="rounded-xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {mesaj.finderName}
                  </h3>

                  <p className="mt-1 text-sm text-white/50">
                    <WhatsappBaglantisi telefon={mesaj.finderPhone} />
                  </p>
                </div>

                <p className="text-xs text-white/40">
                  {new Date(mesaj.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-white/40">Konum:</span>{" "}
                  <span className="text-white/70">
                    {mesaj.location || "Belirtilmedi"}
                  </span>
                </div>

                <div>
                  <span className="text-white/40">E-posta:</span>{" "}
                  <span className="break-all text-white/70">
                    {mesaj.finderEmail || "Belirtilmedi"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-black/20 p-4 text-sm leading-6 text-white/70">
                {mesaj.message || "Mesaj bırakılmadı."}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
