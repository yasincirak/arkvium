import Link from "next/link";
import TagSiniflandirma from "@/components/admin/TagSiniflandirma";
import { prisma } from "@/lib/prisma";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import { etiketKoduBicimle, TAG_DURUM_ETIKETLERI, type TagDurumu } from "@/lib/tags";

/**
 * Ürün türü olmayan etiketleri sınıflandırma ekranı.
 *
 * Yönetici işlemi onaylamadan önce her etiketin kodunu, durumunu, bağlı
 * ürün kaydını ve bir siparişe rezerve olup olmadığını görür. Karar bu
 * bilgilerle verilir; hiçbir şey otomatik atanmaz.
 */

export const dynamic = "force-dynamic";

/** Tek ekranda gösterilecek en fazla etiket. */
const SAYFA_BOYUTU = 200;

export default async function EtiketSiniflandirmaSayfasi() {
  const [etiketler, toplam] = await Promise.all([
    prisma.tag.findMany({
      where: { productKod: null },
      orderBy: { createdAt: "asc" },
      take: SAYFA_BOYUTU,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        activatedAt: true,
        itemRecord: { select: { assetName: true } },
        orderTag: {
          select: { order: { select: { orderNumber: true } } },
        },
      },
    }),
    prisma.tag.count({ where: { productKod: null } }),
  ]);

  const satirlar = etiketler.map((etiket) => ({
    id: etiket.id,
    kod: etiketKoduBicimle(etiket.code),
    durum: etiket.status,
    durumAdi:
      TAG_DURUM_ETIKETLERI[etiket.status as TagDurumu] ?? etiket.status,
    urunAdi: etiket.itemRecord?.assetName ?? null,
    siparisNo: etiket.orderTag?.order.orderNumber ?? null,
    uretim: etiket.createdAt.toLocaleDateString("tr-TR"),
    aktivasyon: etiket.activatedAt
      ? etiket.activatedAt.toLocaleDateString("tr-TR")
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tags"
          className="text-sm text-white/40 transition hover:text-white/70"
        >
          ← Etiket Üretimi
        </Link>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Ürün Türü Atama
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Ürün türü alanı eklenmeden önce üretilmiş etiketleri burada
          sınıflandırırsın. Tür atanana kadar bu etiketler hiçbir siparişe
          ayrılmaz. Atama yalnızca ürün türünü yazar; etiketin durumu,
          sahibi ve bağlı kaydı değişmez.
        </p>
      </div>

      {toplam === 0 ? (
        <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-6 text-sm text-green-200">
          Ürün türü olmayan etiket kalmadı.
        </div>
      ) : (
        <TagSiniflandirma
          etiketler={satirlar}
          toplam={toplam}
          gosterilen={satirlar.length}
          urunler={SIPARIS_URUNLERI.map((urun) => ({
            kod: urun.kod,
            ad: urun.ad,
          }))}
        />
      )}
    </div>
  );
}
