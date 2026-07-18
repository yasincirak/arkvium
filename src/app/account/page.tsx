import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/account/LogoutButton";
import { verifyUserSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("arkvium_user_session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await verifyUserSessionToken(sessionToken);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    include: {
      records: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hesabım</h1>

            <p className="mt-2 text-white/50">
              Hoş geldin {user.fullName || user.email}
            </p>
          </div>

          <LogoutButton />
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Hesap Bilgileri</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-white/40">Ad Soyad</p>
              <p className="mt-1">{user.fullName || "Belirtilmedi"}</p>
            </div>

            <div>
              <p className="text-sm text-white/40">E-posta</p>
              <p className="mt-1">{user.email}</p>
            </div>

            <div>
              <p className="text-sm text-white/40">Telefon</p>
              <p className="mt-1">{user.phone || "Belirtilmedi"}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Ürünlerim</h2>

          {user.records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/50">
              Henüz hesabına bağlı ürün bulunmuyor.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {user.records.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {record.assetName}
                      </h3>

                      <p className="mt-2 text-sm text-white/50">
                        {record.category || "Kategori belirtilmedi"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                      {record.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/account/records/${record.id}`}
                      className="inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Ürün Detayını Aç
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}