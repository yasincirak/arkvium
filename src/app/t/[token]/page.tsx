import type { Metadata } from "next";
import SayfaUstBari from "@/components/SayfaUstBari";
import Link from "next/link";
import { notFound } from "next/navigation";
import AcilDurumBolumu from "@/components/AcilDurumBolumu";
import ItemFinderSection from "@/components/ItemFinderSection";
import KayipUyarisi from "@/components/KayipUyarisi";
import { acilDurumGorunumu } from "@/lib/acil-durum";
import { sozluk } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/session";
import { taramaBildirimiGonder } from "@/lib/tarama-bildirimi";
import { etiketKoduBicimle, type TagDurumu } from "@/lib/tags";

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

export const dynamic = "force-dynamic";

function BilgiKutusu({
  baslik,
  aciklama,
  ton,
  eylem,
  markaAlt,
}: {
  baslik: string;
  aciklama: string;
  ton: "notr" | "uyari";
  /** Açıklamanın altında gösterilecek bağlantı; yalnızca gereken durumlarda verilir. */
  eylem?: React.ReactNode;
  markaAlt: string;
}) {
  const sinif =
    ton === "uyari"
      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
      : "border-white/10 bg-white/5 text-white/70";

  return (
    <main className="pt-20 flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <SayfaUstBari ton="koyu" />

      <div className={`w-full max-w-xl rounded-2xl border p-8 ${sinif}`}>
        <h1 className="text-2xl font-bold">{baslik}</h1>
        <p className="mt-4 leading-7">{aciklama}</p>

        {eylem && <div className="mt-6">{eylem}</div>}

        <p className="mt-8 text-sm opacity-70">{markaAlt}</p>
      </div>
    </main>
  );
}

export default async function TagPage({ params }: Props) {
  const s = sozluk();

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
        markaAlt={s.qr.markaAlt}
        ton="uyari"
        baslik={s.qr.iptalEdilmis.baslik}
        aciklama={s.qr.iptalEdilmis.metin}
      />
    );
  }

  if (durum === "unused") {
    return (
      <BilgiKutusu
        markaAlt={s.qr.markaAlt}
        ton="notr"
        baslik={s.qr.etkinlestirilmemis.baslik}
        aciklama={s.qr.etkinlestirilmemis.metin}
        eylem={
          <Link
            href={`/account/tags/activate?kod=${encodeURIComponent(
              etiketKoduBicimle(tag.code)
            )}`}
            className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
          >
            {s.qr.etkinlestirilmemis.dugme}
          </Link>
        }
      />
    );
  }

  if (durum === "inactive") {
    return (
      <BilgiKutusu
        markaAlt={s.qr.markaAlt}
        ton="notr"
        baslik={s.qr.pasif.baslik}
        aciklama={s.qr.pasif.metin}
      />
    );
  }

  const record = tag.itemRecord;

  if (!record) {
    return (
      <BilgiKutusu
        markaAlt={s.qr.markaAlt}
        ton="notr"
        baslik={s.qr.urunYok.baslik}
        aciklama={s.qr.urunYok.metin}
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
    <main className="pt-20 flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 text-white">
      <SayfaUstBari ton="koyu" />
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8">
        {record.status === "lost" && <KayipUyarisi />}

        {acilDurum && <AcilDurumBolumu gorunum={acilDurum} />}

        <h1 className="text-3xl font-bold">{record.assetName}</h1>

        <p className="mt-3 text-white/60">
          {s.qr.altYazi}
        </p>

        <div className="mt-8 space-y-3">
          {record.category && (
            <div>
              <span className="text-white/40">{s.qr.kategori}</span>
              <p>{record.category}</p>
            </div>
          )}

          <div>
            <span className="text-white/40">{s.qr.durum}</span>
            <p>
              {s.qr.durumlar[
                record.status as keyof typeof s.qr.durumlar
              ] ?? s.qr.durumlar.active}
            </p>
          </div>

          {record.description && (
            <div>
              <span className="text-white/40">{s.qr.aciklama}</span>
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
