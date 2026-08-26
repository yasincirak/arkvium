import { notFound, redirect } from "next/navigation";
import SayfaUstBari from "@/components/SayfaUstBari";
import { sozluk } from "@/lib/i18n";
import EditRecordForm from "@/components/account/EditRecordForm";
import { getUserSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    id: string;
  };
};

export default async function AccountEditRecordPage({ params }: Props) {
  const ceviri = sozluk();

  const session = await getUserSession();

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
    <main className="pt-20 min-h-screen bg-[#09090f] px-4 py-10 text-white">
      <SayfaUstBari ton="koyu" />

      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{ceviri.hesap.urunuDuzenle}</h1>

          <p className="mt-2 text-sm text-white/50">{ceviri.kalanlar.urunBilgileriniGuncelle}</p>
        </div>

        <EditRecordForm record={record} />
      </div>
    </main>
  );
}