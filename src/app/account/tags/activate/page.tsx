import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ActivateTagForm from "./ActivateTagForm";
import { getUserSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Etiket Etkinleştir",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ActivateTagPageProps = {
  searchParams?: {
    /** QR sayfasından gelen etiket kodu; forma başlangıç değeri olur. */
    kod?: string;
  };
};

export default async function ActivateTagPage({
  searchParams,
}: ActivateTagPageProps) {
  const session = await getUserSession();

  const etiketKodu =
    typeof searchParams?.kod === "string" ? searchParams.kod.trim() : "";

  if (!session) {
    // Giriş sonrası kullanıcı aynı etiketle bu sayfaya geri döner.
    const donusAdresi = etiketKodu
      ? `/account/tags/activate?kod=${encodeURIComponent(etiketKodu)}`
      : "/account/tags/activate";

    redirect(`/login?returnTo=${encodeURIComponent(donusAdresi)}`);
  }

  // Yalnızca henüz etiketi olmayan ürünler seçilebilir.
  const etiketsizUrunler = await prisma.itemRecord.findMany({
    where: { userId: session.userId, tag: null },
    select: { id: true, assetName: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          ← Hesabıma Dön
        </Link>

        <div className="mb-8 mt-6">
          <h1 className="text-3xl font-bold">Etiket Etkinleştir</h1>

          <p className="mt-2 text-white/50">
            Elindeki ARKVIUM etiketini hesabına bağla ve bir ürünle eşleştir.
          </p>
        </div>

        <ActivateTagForm
          etiketsizUrunler={etiketsizUrunler}
          etiketKodu={etiketKodu}
        />
      </div>
    </main>
  );
}
