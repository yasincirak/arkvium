import type { Metadata } from "next";
import SayfaUstBari from "@/components/SayfaUstBari";
import { getRecordById } from "@/lib/store";
import ItemFinderSection from "@/components/ItemFinderSection";
import KayipUyarisi from "@/components/KayipUyarisi";
import { sozluk } from "@/lib/i18n";
import { getUserSession } from "@/lib/session";
import { taramaBildirimiGonder } from "@/lib/tarama-bildirimi";
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
export function generateMetadata(): Metadata {
  return {
    title: sozluk().qr.baslik,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
  };
}

export default async function ItemPage({ params }: Props) {
  const s = sozluk();

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
    <main className="pt-20 flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <SayfaUstBari ton="koyu" />

      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8">
        {record.status === "lost" && <KayipUyarisi />}

        <h1 className="text-3xl font-bold">{record.assetName}</h1>

        <p className="mt-3 text-white/60">
          {s.qr.altYazi}
        </p>

        <div className="mt-8 space-y-3">
          <div>
            <span className="text-white/40">{s.kalanlar.kategori}</span>
            <p>{record.category}</p>
          </div>

          <div>
            <span className="text-white/40">{s.kalanlar.durum}</span>
            <p>{s.qr.durumlar[record.status as keyof typeof s.qr.durumlar] ??
              s.qr.durumlar.active}</p>
          </div>

          {record.description && (
            <div>
              <span className="text-white/40">{s.kalanlar.aciklama}</span>
              <p>{record.description}</p>
            </div>
          )}
        </div>

        <ItemFinderSection
          recordId={record.id}
          metinler={{
            buldumDugmesi: s.qr.buEsyayiBuldum,
            whatsappIleIletisim: s.qr.whatsappIleIletisim,
            whatsappMesaji: s.qr.whatsappMesaji,
            form: s.bulanKisi,
          }}
        />
      </div>
    </main>
  );
}