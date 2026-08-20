import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fiyatBicimle } from "@/lib/siparis";
import { durumEtiketi, durumSinifi } from "@/lib/siparis-durumlari";

/**
 * Sipariş listesi (yönetim paneli).
 *
 * Yalnızca okur. Erişim `src/middleware.ts` içindeki yönetici oturumu
 * kontrolüyle korunur. Kart verisi, ödeme sağlayıcı token'ı ve siparişin
 * `publicToken` değeri LİSTELENMEZ.
 */

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const siparisler = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalKurus: true,
      fullName: true,
      createdAt: true,
      _count: { select: { items: true, tags: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Siparişler</h1>

        <p className="mt-2 text-sm text-white/50">
          Son 100 sipariş listelenir. Hazırlık ve kargo durumu sipariş
          detayından güncellenir.
        </p>
      </div>

      {siparisler.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
          Henüz sipariş oluşturulmadı.
        </div>
      ) : (
        <div className="space-y-4">
          {siparisler.map((siparis) => (
            <Link
              key={siparis.id}
              href={`/admin/orders/${siparis.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-mono text-lg font-semibold text-white">
                    {siparis.orderNumber}
                  </h2>

                  <p className="mt-1 text-sm text-white/50">
                    {siparis.fullName}
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    {siparis._count.items} kalem · {siparis._count.tags} etiket
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${durumSinifi(
                      siparis.status
                    )}`}
                  >
                    {durumEtiketi(siparis.status)}
                  </span>

                  <p className="mt-3 font-semibold text-white">
                    {fiyatBicimle(siparis.totalKurus)}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {siparis.createdAt.toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
