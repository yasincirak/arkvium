import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AcilDurumBolumu from "@/components/AcilDurumBolumu";
import ItemFinderSection from "@/components/ItemFinderSection";
import KayipUyarisi from "@/components/KayipUyarisi";
import { acilDurumGorunumu } from "@/lib/acil-durum";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { taramaBildirimiGonder } from "@/lib/tarama-bildirimi";
import { etiketKoduBicimle, type TagDurumu } from "@/lib/tags";
import { ITEM_DURUM_ETIKETLERI } from "@/lib/types";

/**
 * Etiket genel erişim sayfası (yeni akış).
 *
 * Adres kriptografik `publicToken` içerir; veritabanı ID'si geçmez.
 * Eski QR kodları /item/<kayıt-id> adresini kullanmaya devam eder
 * (bkz. src/app/item/[id]/page.tsx).
 */

type Props = {
  params: {
    token: string;
  };
};

export const metadata: Metadata = {
  title: "Bulunan Eşya",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

function BilgiKutusu({
  baslik,
  aciklama,
  ton,
  eylem,
}: {
  baslik: string;
  aciklama: string;
  ton: "notr" | "uyari";
  /** Açıklamanın altında gösterilecek bağlantı; yalnızca gereken durumlarda verilir. */
  eylem?: React.ReactNode;
}) {
  const sinif =
    ton === "uyari"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : "border-white/10 bg-white/5 text-white/70";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <div className={`w-full max-w-xl rounded-2xl border p-8 ${sinif}`}>
        <h1 className="text-2xl font-bold">{baslik}</h1>
        <p className="mt-4 leading-7">{aciklama}</p>

        {eylem && <div className="mt-6">{eylem}</div>}

        <p className="mt-8 text-sm opacity-70">
          ARKVIUM — Dijital Sahiplik Platformu
        </p>
      </div>
    </main>
  );
}

export default async function TagPage({ params }: Props) {
  const tag = await prisma.tag.findUnique({
    where: { publicToken: params.token },
    include: { itemRecord: true },
  });

  if (!tag) {
    notFound();
  }

  const durum = tag.status as TagDurumu;

  if (durum === "revoked") {
    return (
      <BilgiKutusu
        ton="uyari"
        baslik="Bu etiket iptal edilmiş"
        aciklama="Bu etiket artık kullanılmıyor. Bir eşya bulduysanız lütfen etiketin üzerindeki başka bir iletişim yolunu kullanın."
      />
    );
  }

  if (durum === "unused") {
    return (
      <BilgiKutusu
        ton="notr"
        baslik="Bu etiket henüz etkinleştirilmemiş"
        aciklama="Bu etiket bir ürüne bağlanmamış. Etiket sizin elinizdeyse ARKVIUM hesabınızdan etkinleştirebilirsiniz."
        eylem={
          <Link
            href={`/account/tags/activate?kod=${encodeURIComponent(
              etiketKoduBicimle(tag.code)
            )}`}
            className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
          >
            Bu etiketi etkinleştir
          </Link>
        }
      />
    );
  }

  if (durum === "inactive") {
    return (
      <BilgiKutusu
        ton="notr"
        baslik="Bu etiket şu anda pasif"
        aciklama="Etiket sahibi bu etiketi geçici olarak devre dışı bırakmış. Şu anda bildirim gönderilemiyor."
      />
    );
  }

  const record = tag.itemRecord;

  if (!record) {
    return (
      <BilgiKutusu
        ton="notr"
        baslik="Bu etikete bağlı ürün bulunamadı"
        aciklama="Etiket etkin ancak herhangi bir ürüne bağlı değil. Şu anda bildirim gönderilemiyor."
      />
    );
  }

  // Kayıp eşyalarda sahibine "etiketiniz okutuldu" bildirimi gider.
  const oturum = await getUserSession();

  await taramaBildirimiGonder(record, oturum?.userId ?? null);

  // Acil durum profili tamamen isteğe bağlıdır ve yalnızca sahibi yayına
  // aldıysa dolu döner. Buraya ancak etiket AKTİF ve kayda bağlıyken gelinir.
  const acilDurum = await acilDurumGorunumu(record.id);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8">
        {record.status === "lost" && <KayipUyarisi />}

        {acilDurum && <AcilDurumBolumu gorunum={acilDurum} />}

        <h1 className="text-3xl font-bold">{record.assetName}</h1>

        <p className="mt-3 text-white/60">
          Bu eşya ARKVIUM dijital sahiplik sistemine kayıtlıdır.
        </p>

        <div className="mt-8 space-y-3">
          {record.category && (
            <div>
              <span className="text-white/40">Kategori</span>
              <p>{record.category}</p>
            </div>
          )}

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
