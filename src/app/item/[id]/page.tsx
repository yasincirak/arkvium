import type { Metadata } from "next";
import { getRecordById } from "@/lib/store";
import ItemFinderSection from "@/components/ItemFinderSection";
import KayipUyarisi from "@/components/KayipUyarisi";
import { getUserSession } from "@/lib/session";
import { taramaBildirimiGonder } from "@/lib/tarama-bildirimi";
import { ITEM_DURUM_ETIKETLERI } from "@/lib/types";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

/**
 * ESKİ (LEGACY) QR AKIŞI — kaldırılmamalıdır.
 *
 * Bu adres kaydın veritabanı ID'sini içerir ve etiket sistemi eklenmeden
 * önce üretilmiş QR kodları hâlâ buraya bakar. Bu kodlar fiziksel olarak
 * basılmış olabileceği için adres desteklenmeye devam eder.
 *
 * YENİ akış /t/<publicToken> adresini kullanır (src/app/t/[token]/page.tsx):
 * adres kriptografik token taşır, veritabanı ID'si içermez ve etiket
 * durumuna (unused/active/inactive/revoked) göre davranır.
 *
 * Eski kayıtlar yeni sisteme zorla dönüştürülmez; kullanıcı isterse
 * ürününe yeni bir etiket bağlayabilir.
 *
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

export default async function ItemPage({ params }: Props) {
  const record = await getRecordById(params.id);

  if (!record) {
    notFound();
  }

  // Kayıp eşyalarda sahibine "etiketiniz okutuldu" bildirimi gider.
  const oturum = await getUserSession();

  await taramaBildirimiGonder(
    { ...record, email: record.email ?? "" },
    oturum?.userId ?? null
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8">
        {record.status === "lost" && <KayipUyarisi />}

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
            <p>{ITEM_DURUM_ETIKETLERI[record.status] ?? "Aktif"}</p>
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