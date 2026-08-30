import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Etiket stok özeti.
 *
 * Dört sayı gösterilir:
 *  - Stokta  : rezerve edilebilir, boşta bekleyen etiket (satılabilir stok)
 *  - Rezerve : bir siparişe ayrılmış ama henüz aktive edilmemiş
 *  - Aktif   : müşteri tarafından etkinleştirilmiş
 *  - Toplam  : o üründen basılmış tüm etiketler
 *
 * "Stokta" sayısı, sipariş akışındaki `stoktakiEtiketSayisi` ile AYNI
 * koşulları kullanır; ekrandaki sayı ile gerçekte ayrılabilecek sayı
 * birbirinden ayrışmaz.
 *
 * Ayrıca ürün türü olmayan (eski) etiketler ayrı bir satırda gösterilir.
 * Bu etiketler hiçbir siparişe ayrılamaz; görünmezlerse sessizce kaybolurlar.
 */

type Satir = {
  kod: string | null;
  ad: string;
  stokta: number;
  rezerve: number;
  aktif: number;
  toplam: number;
};

async function urunSatiri(kod: string | null, ad: string): Promise<Satir> {
  const urunKosulu = kod === null ? { productKod: null } : { productKod: kod };

  const [stokta, rezerve, aktif, toplam] = await Promise.all([
    prisma.tag.count({
      where: {
        ...urunKosulu,
        status: "unused",
        userId: null,
        itemRecordId: null,
        orderTag: { is: null },
      },
    }),
    prisma.tag.count({
      where: { ...urunKosulu, status: "unused", orderTag: { isNot: null } },
    }),
    prisma.tag.count({ where: { ...urunKosulu, status: "active" } }),
    prisma.tag.count({ where: urunKosulu }),
  ]);

  return { kod, ad, stokta, rezerve, aktif, toplam };
}

export default async function TagStokOzeti() {
  let satirlar: Satir[];

  try {
    satirlar = await Promise.all([
      ...SIPARIS_URUNLERI.map((urun) => urunSatiri(urun.kod, urun.ad)),
      urunSatiri(null, "Ürün türü atanmamış (eski stok)"),
    ]);
  } catch (hata) {
    console.error("Etiket stoğu okunamadı:", hata);

    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
        Stok bilgisi şu anda okunamıyor.
      </div>
    );
  }

  const turSuz = satirlar[satirlar.length - 1];
  const gorunecek = satirlar.filter((s) => s.kod !== null || s.toplam > 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Stok Durumu</h2>

      <p className="mt-1 text-sm text-white/50">
        &quot;Stokta&quot; sütunu, yeni siparişlere ayrılabilecek boş etiket
        sayısıdır. Ürün türü atanmamış etiketler ayrılamadığı için bu sütunda
        gösterilmez.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-white/40">
            <tr>
              <th className="border-b border-white/10 py-2 pr-4">Ürün</th>
              <th className="border-b border-white/10 py-2 pr-4 text-right">
                Stokta
              </th>
              <th className="border-b border-white/10 py-2 pr-4 text-right">
                Rezerve
              </th>
              <th className="border-b border-white/10 py-2 pr-4 text-right">
                Aktif
              </th>
              <th className="border-b border-white/10 py-2 text-right">
                Toplam
              </th>
            </tr>
          </thead>

          <tbody className="text-white/80">
            {gorunecek.map((satir) => (
              <tr key={satir.kod ?? "tursuz"}>
                <td className="border-b border-white/5 py-2.5 pr-4">
                  {satir.ad}
                </td>

                {/*
                  Türü olmayan etiketler hiçbir siparişe ayrılamaz. Buraya
                  sayı yazmak, altındaki uyarıyla çelişen bir "satılabilir
                  stok" izlenimi verirdi.
                */}
                <td
                  className={`border-b border-white/5 py-2.5 pr-4 text-right font-semibold tabular-nums ${
                    satir.kod === null
                      ? "text-white/30"
                      : satir.stokta === 0
                        ? "text-amber-300"
                        : "text-white"
                  }`}
                >
                  {satir.kod === null ? "—" : satir.stokta}
                </td>

                <td className="border-b border-white/5 py-2.5 pr-4 text-right tabular-nums text-white/60">
                  {satir.rezerve}
                </td>

                <td className="border-b border-white/5 py-2.5 pr-4 text-right tabular-nums text-white/60">
                  {satir.aktif}
                </td>

                <td className="border-b border-white/5 py-2.5 text-right tabular-nums text-white/60">
                  {satir.toplam}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {turSuz.toplam > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <strong>{turSuz.toplam} etiketin ürün türü yok.</strong> Bunlar ürün
          türü alanı eklenmeden önce üretilmiş. Hangi fiziksel ürüne
          basıldıkları bilinmediği için hiçbir siparişe ayrılmazlar; satılabilir
          stoğa dâhil değiller.

          <Link
            href="/admin/tags/siniflandir"
            className="mt-3 inline-flex min-h-[40px] items-center rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 font-semibold text-amber-100 transition hover:bg-amber-400/20"
          >
            Ürün türü ata
          </Link>
        </div>
      )}
    </div>
  );
}
