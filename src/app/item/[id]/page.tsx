import type { Metadata } from "next";
import { getRecordById } from "@/lib/store";
import ItemFinderSection from "@/components/ItemFinderSection";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

/**
 * Bu sayfa belirli bir kişinin eşyasına ait genel erişim sayfasıdır ve
 * arama motorlarına kapalı tutulur.
 */
export const metadata: Metadata = {
  title: "Bulunan Eşya",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

const durumEtiketleri: Record<string, string> = {
  active: "Aktif",
  lost: "Kayıp",
  found: "Bulundu",
  inactive: "Pasif",
};

export default async function ItemPage({ params }: Props) {
  const record = await getRecordById(params.id);

  if (!record) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-bold">{record.assetName}</h1>

        <p className="mt-3 text-white/60">
          Bu eşya ARKVIUM dijital sahiplik sistemine kayıtlıdır.
        </p>

        <div className="mt-8 space-y-3">
          <div>
            <span className="text-white/40">Kategori</span>
            <p>{record.category}</p>
          </div>

          <div>
            <span className="text-white/40">Durum</span>
            <p>{durumEtiketleri[record.status] ?? "Aktif"}</p>
          </div>

          {record.description && (
            <div>
              <span className="text-white/40">Açıklama</span>
              <p>{record.description}</p>
            </div>
          )}
        </div>

        <ItemFinderSection recordId={record.id} />
      </div>
    </main>
  );
}