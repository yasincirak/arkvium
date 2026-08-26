import Image from "next/image";
import SayfaUstBari from "@/components/SayfaUstBari";
import { sozluk } from "@/lib/i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/account/LogoutButton";
import EmailVerificationNotice from "@/components/account/EmailVerificationNotice";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import { getUserSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const ceviri = sozluk();

  const session = await getUserSession();

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
    <main className="pt-20 min-h-screen bg-[#09090f] px-4 py-10 text-white">
      <SayfaUstBari ton="koyu" />

      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/arkvium.jpeg"
              alt="ARKVIUM"
              width={72}
              height={72}
              priority
              className="h-16 w-16 rounded-xl object-cover"
            />

            <div>
              <h1 className="text-3xl font-bold">{ceviri.hesap.baslik}</h1>

              <p className="mt-2 text-white/50">
                Hoş geldin {user.fullName || user.email}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>

        {!user.emailVerifiedAt && <EmailVerificationNotice />}

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">{ceviri.hesap.bilgiler}</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-white/40">{ceviri.hesap.adSoyad}</p>
              <p className="mt-1">{user.fullName || "Belirtilmedi"}</p>
            </div>

            <div>
              <p className="text-sm text-white/40">{ceviri.hesap.eposta}</p>

              <p className="mt-1 flex flex-wrap items-center gap-2">
                {user.email}

                {user.emailVerifiedAt ? (
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-300">
                    ✓ Doğrulandı
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                    ! Doğrulanmadı
                  </span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-white/40">{ceviri.hesap.telefon}</p>
              <p className="mt-1">{user.phone || "Belirtilmedi"}</p>
            </div>
          </div>
        </div>

        <ChangePasswordForm />

        <div className="mb-8 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{ceviri.hesap.etiketinVarMi}</h2>

              <p className="mt-1 text-sm leading-6 text-white/60">{ceviri.kalanlar.etiketBagliDegil}</p>
            </div>

            <Link
              href="/account/tags/activate"
              className="w-fit shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >{ceviri.kalanlar.etiketiEtkinlestirDugme}</Link>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">{ceviri.hesap.urunlerim}</h2>

          {user.records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/50">{ceviri.kalanlar.urunYok}</div>
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
                    >{ceviri.kalanlar.urunDetayiniAc}</Link>
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