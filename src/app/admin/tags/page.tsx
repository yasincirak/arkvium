import { Suspense } from "react";
import BaskiKontrolListesi from "@/components/admin/BaskiKontrolListesi";
import TagGenerator from "@/components/admin/TagGenerator";
import TagStokOzeti from "@/components/admin/TagStokOzeti";
import { SIPARIS_URUNLERI } from "@/lib/siparis";

// Etiket üretimi ve stok sayıları her istekte taze çalışmalıdır.
export const dynamic = "force-dynamic";

export default function AdminTagsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Etiket Üretimi</h1>

        <p className="mt-2 text-sm text-white/50">
          Baskıya gidecek yeni etiketleri burada üretirsin. Her etiketin
          üzerinde bir etiket kodu, kazınarak açılan bölümde ise gizli
          aktivasyon kodu bulunur.
        </p>
      </div>

      {/* Stok sorgusu üretim formunu bekletmesin. */}
      <Suspense
        fallback={
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/40">
            Stok okunuyor…
          </div>
        }
      >
        <TagStokOzeti />
      </Suspense>

      <BaskiKontrolListesi />

      <TagGenerator
        urunler={SIPARIS_URUNLERI.map((urun) => ({
          kod: urun.kod,
          ad: urun.ad,
        }))}
      />
    </div>
  );
}
