import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyUserSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AccountRecordDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AccountRecordDetailPage({
  params,
}: AccountRecordDetailPageProps) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("arkvium_user_session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await verifyUserSessionToken(sessionToken);

  if (!session) {
    redirect("/login");
  }

  const record = await prisma.itemRecord.findFirst({
    where: {
      id: params.id,
      userId: session.userId,
    },
  });

  if (!record) {
    notFound();
  }

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

          <div className="mt-8">
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