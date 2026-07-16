import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import EditRecordForm from "@/components/account/EditRecordForm";
import { verifyUserSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    id: string;
  };
};

export default async function AccountEditRecordPage({ params }: Props) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ürünü Düzenle</h1>

          <p className="mt-2 text-sm text-white/50">
            Ürün bilgilerini güncelleyebilirsin.
          </p>
        </div>

        <EditRecordForm record={record} />
      </div>
    </main>
  );
}