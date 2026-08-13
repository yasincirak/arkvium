import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/session";
import AcceptForm from "./accept-form";

/**
 * Sahiplik devri davetinin kabul ekranı.
 *
 * Token yalnızca adres satırındaki `?token=` değerinden okunur ve kabul
 * action'ına iletilir; ekranda veya hata metninde gösterilmez.
 */
export const dynamic = "force-dynamic";

export default async function OwnershipTransferAcceptPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = (searchParams.token ?? "").trim();
  const session = await getUserSession();

  if (!session) {
    // Girişten sonra kullanıcı aynı davet bağlantısına geri döner.
    const donusAdresi = token
      ? `/ownership-transfer/accept?token=${encodeURIComponent(token)}`
      : "/ownership-transfer/accept";

    redirect(`/login?returnTo=${encodeURIComponent(donusAdresi)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-white"
          >
            ARKVIUM
          </Link>

          <h1 className="mt-6 text-3xl font-bold">Sahiplik Devri</h1>

          <p className="mt-2 text-sm text-white/50">
            {token
              ? "Bu ürünün sahipliği size devredilmek isteniyor. Kabul ederseniz ürün hesabınıza bağlanır."
              : "Davet bağlantısı eksik."}
          </p>
        </div>

        {token ? (
          <AcceptForm token={token} />
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Davet geçersiz veya süresi dolmuş. Lütfen size gönderilen
              e-postadaki bağlantıyı kullanın.
            </div>

            <Link
              href="/account"
              className="block w-full rounded-xl bg-white/10 px-4 py-3 text-center font-semibold text-white transition hover:bg-white/15"
            >
              Hesabıma Git
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
