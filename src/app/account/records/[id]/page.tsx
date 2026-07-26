import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import TagPanel from "@/components/account/TagPanel";
import { getUserSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { etiketAdresi, etiketKoduBicimle } from "@/lib/tags";

export const dynamic = "force-dynamic";

type AccountRecordDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AccountRecordDetailPage({
  params,
}: AccountRecordDetailPageProps) {
  const session = await getUserSession();

  if (!session) {
    redirect("/login");
  }

  const record = await prisma.itemRecord.findFirst({
    where: {
      id: params.id,
      userId: session.userId,
    },
    include: { tag: true },
  });

  if (!record) {
    notFound();
  }

  // Etiketin taşınabileceği ürünler: kullanıcıya ait, henüz etiketi olmayanlar.
  const tasinabilirUrunler = record.tag
    ? await prisma.itemRecord.findMany({
        where: { userId: session.userId, tag: null },
        select: { id: true, assetName: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const tabanAdres = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          ← Hesabıma Dön
        </Link>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{record.assetName}</h1>

              <p className="mt-2 text-white/50">
                {record.category || "Kategori belirtilmedi"}
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              {record.status}
            </span>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-white/40">Sahip</p>
              <p className="mt-1">{record.ownerName}</p>
            </div>

            <div>
              <p className="text-sm text-white/40">Telefon</p>
              <p className="mt-1">{record.phone}</p>
            </div>

            <div>
              <p className="text-sm text-white/40">E-posta</p>
              <p className="mt-1">
                {record.email || "Belirtilmedi"}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/40">Oluşturulma Tarihi</p>
              <p className="mt-1">
                {record.createdAt.toLocaleDateString("tr-TR")}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-white/40">Açıklama</p>
            <p className="mt-2 text-white/80">
              {record.description || "Açıklama bulunmuyor."}
            </p>
          </div>

          {record.tag ? (
            <TagPanel
              tag={{
                id: record.tag.id,
                code: etiketKoduBicimle(record.tag.code),
                status: record.tag.status,
                publicToken: record.tag.publicToken,
              }}
              etiketAdresi={etiketAdresi(record.tag.publicToken, tabanAdres)}
              tasinabilirUrunler={tasinabilirUrunler}
            />
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Etiket</h2>

              <p className="mt-2 text-sm leading-6 text-white/50">
                Bu ürüne henüz bir etiket bağlı değil. Elindeki ARKVIUM
                etiketini hesabına bağlayarak bu ürünle eşleştirebilirsin.
              </p>

              <Link
                href="/account/tags/activate"
                className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Etiket Etkinleştir
              </Link>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/account/records/${record.id}/edit`}
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Ürünü Düzenle
            </Link>

            <Link
              href={`/item/${record.id}`}
              className="inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-500"
            >
              Ürün Sayfasını Aç
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}