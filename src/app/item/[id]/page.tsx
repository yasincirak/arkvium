import { getRecordById } from "@/lib/store";
import ItemFinderSection from "@/components/ItemFinderSection";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

export default function ItemPage({ params }: Props) {
  const record = getRecordById(params.id);

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
            <p>{record.status}</p>
          </div>

          <div>
            <span className="text-white/40">Açıklama</span>
            <p>{record.description}</p>
          </div>
        </div>

       <ItemFinderSection recordId={record.id} />
      </div>
    </main>
  );
}