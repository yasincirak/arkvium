import Link from "next/link";
import { notFound } from "next/navigation";
import SiparisDurumFormu from "@/components/admin/SiparisDurumFormu";
import { prisma } from "@/lib/prisma";
import { fiyatBicimle } from "@/lib/siparis";
import { durumEtiketi, durumSinifi } from "@/lib/siparis-durumlari";

/**
 * Sipariş detayı (yönetim paneli).
 *
 * Hazırlık için gereken her şeyi tek ekranda gösterir: teslimat bilgisi,
 * kalemler ve her kaleme rezerve edilmiş QR etiket KODLARI.
 *
 * GÖSTERİLMEZ: kart verisi, ödeme sağlayıcı token'ı, API anahtarı,
 * `Order.publicToken` ve `Tag.publicToken`. Etiketin basılan kodu (`Tag.code`)
 * gizli değildir; QR adresini üreten token ise bu ekrana hiç getirilmez.
 *
 * Erişim `src/middleware.ts` içindeki yönetici oturumu kontrolüyle korunur.
 */

export const dynamic = "force-dynamic";

function tarihBicimle(tarih: Date | null): string {
  return tarih ? tarih.toLocaleString("tr-TR") : "—";
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const siparis = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      fullName: true,
      email: true,
      phone: true,
      addressLine: true,
      district: true,
      city: true,
      postalCode: true,
      subtotalKurus: true,
      shippingKurus: true,
      totalKurus: true,
      createdAt: true,
      paidAt: true,
      shippedAt: true,
      items: {
        select: {
          id: true,
          productKod: true,
          productAdi: true,
          secenek: true,
          quantity: true,
          qrAdedi: true,
          unitPriceKurus: true,
          lineTotalKurus: true,
          orderTags: {
            select: { id: true, tag: { select: { code: true } } },
            orderBy: { reservedAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!siparis) {
    notFound();
  }

  const toplamEtiket = siparis.items.reduce(
    (say, kalem) => say + kalem.orderTags.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="text-sm text-white/50 transition hover:text-white"
        >
          ← Siparişlere Dön
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-mono text-3xl font-bold text-white">
              {siparis.orderNumber}
            </h1>

            <p className="mt-2 text-sm text-white/50">
              {siparis.items.length} kalem · {toplamEtiket} rezerve etiket
            </p>
          </div>

          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs ${durumSinifi(
              siparis.status
            )}`}
          >
            {durumEtiketi(siparis.status)}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Teslimat Bilgileri</h2>

        <div className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-white/40">Ad soyad</p>
            <p className="mt-1 text-white">{siparis.fullName}</p>
          </div>

          <div>
            <p className="text-white/40">Telefon</p>
            <p className="mt-1 text-white">{siparis.phone}</p>
          </div>

          <div>
            <p className="text-white/40">E-posta</p>
            <p className="mt-1 break-all text-white">{siparis.email}</p>
          </div>

          <div>
            <p className="text-white/40">İlçe / İl</p>
            <p className="mt-1 text-white">
              {siparis.district} / {siparis.city}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-white/40">Adres</p>
            <p className="mt-1 text-white">
              {siparis.addressLine}
              {siparis.postalCode ? ` (${siparis.postalCode})` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">
          Kalemler ve Rezerve Etiketler
        </h2>

        <p className="mt-2 text-sm text-white/50">
          Her kalemin altında o kaleme ayrılmış etiket kodları listelenir.
          Baskı ve paketleme bu kodlara göre yapılır.
        </p>

        <div className="mt-5 space-y-4">
          {siparis.items.map((kalem) => (
            <div
              key={kalem.id}
              className="rounded-xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {kalem.productAdi}
                    {kalem.secenek ? ` · ${kalem.secenek}` : ""}
                  </h3>

                  <p className="mt-1 text-sm text-white/50">
                    {kalem.quantity} adet · adet başına {kalem.qrAdedi} QR ·{" "}
                    {fiyatBicimle(kalem.unitPriceKurus)}
                  </p>
                </div>

                <p className="font-semibold text-white">
                  {fiyatBicimle(kalem.lineTotalKurus)}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-sm text-white/40">
                  Rezerve etiket kodları ({kalem.orderTags.length})
                </p>

                {kalem.orderTags.length === 0 ? (
                  <p className="mt-2 text-sm text-white/50">
                    Bu kalem için rezerve edilmiş etiket yok.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {kalem.orderTags.map((rezervasyon) => (
                      <span
                        key={rezervasyon.id}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/80"
                      >
                        {rezervasyon.tag.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-sm sm:max-w-xs">
          <div className="flex justify-between">
            <span className="text-white/40">Ara toplam</span>
            <span className="text-white">
              {fiyatBicimle(siparis.subtotalKurus)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/40">Kargo</span>
            <span className="text-white">
              {fiyatBicimle(siparis.shippingKurus)}
            </span>
          </div>

          <div className="flex justify-between font-semibold">
            <span className="text-white/60">Toplam</span>
            <span className="text-white">
              {fiyatBicimle(siparis.totalKurus)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">Durum</h2>

        <div className="mt-6 grid gap-5 text-sm sm:grid-cols-3">
          <div>
            <p className="text-white/40">Oluşturulma</p>
            <p className="mt-1 text-white">
              {tarihBicimle(siparis.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-white/40">Ödeme</p>
            <p className="mt-1 text-white">{tarihBicimle(siparis.paidAt)}</p>
          </div>

          <div>
            <p className="text-white/40">Kargo</p>
            <p className="mt-1 text-white">{tarihBicimle(siparis.shippedAt)}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <SiparisDurumFormu orderId={siparis.id} durum={siparis.status} />
        </div>
      </div>
    </div>
  );
}
