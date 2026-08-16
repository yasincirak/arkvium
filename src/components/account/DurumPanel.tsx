"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeRecordStatus } from "@/lib/actions";
import type { ItemRecordStatus } from "@/lib/types";

/**
 * Kayıp modu paneli.
 *
 * Sahibi eşyayı kayıp olarak işaretlediğinde, QR kodu okutulduğunda genel
 * erişim sayfasında belirgin bir uyarı çıkar (bkz. KayipUyarisi).
 *
 * Yetki kontrolü Server Action tarafında yapılır (`requireRecordAccess`);
 * bu bileşen yalnızca arayüzdür.
 */
type DurumPanelProps = {
  itemRecordId: string;
  durum: string;
};

export default function DurumPanel({ itemRecordId, durum }: DurumPanelProps) {
  const router = useRouter();

  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState("");

  const kayipMi = durum === "lost";

  async function durumDegistir(yeniDurum: ItemRecordStatus) {
    setHata("");
    setCalisiyor(true);

    try {
      await changeRecordStatus(itemRecordId, yeniDurum);
      router.refresh();
    } catch {
      setHata("Durum değiştirilemedi. Lütfen tekrar deneyin.");
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div
      className={`mt-6 rounded-2xl border p-6 ${
        kayipMi
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <h2 className="text-xl font-semibold">
        {kayipMi ? "Bu eşya kayıp olarak işaretli" : "Kayıp Bildirimi"}
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/60">
        {kayipMi
          ? "QR kodunu okutan kişi, eşyanın arandığını belirten bir uyarı görüyor. Eşyaya kavuştuğunda bu işareti kaldır."
          : "Eşyanı kaybettiysen burada işaretle. QR kodunu okutan kişi eşyanın arandığını görür ve sana daha kolay ulaşır."}
      </p>

      {hata && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {hata}
        </div>
      )}

      <button
        type="button"
        disabled={calisiyor}
        onClick={() => durumDegistir(kayipMi ? "active" : "lost")}
        className={`mt-4 inline-flex rounded-xl px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          kayipMi
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-amber-600 hover:bg-amber-500"
        }`}
      >
        {calisiyor
          ? "Kaydediliyor..."
          : kayipMi
            ? "Eşyamı buldum"
            : "Bu eşyayı kaybettim"}
      </button>
    </div>
  );
}
