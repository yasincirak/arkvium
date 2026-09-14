import TalepYonetimi from "@/components/admin/TalepYonetimi";

/**
 * İptal ve iade talepleri (yönetim).
 *
 * Erişim `src/app/admin/layout.tsx` içindeki rol kapısıyla korunur;
 * kullanılan uçlar ayrıca kendi yetkilerini doğrular.
 */

export const dynamic = "force-dynamic";

export default function AdminTaleplerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">İptal ve iade talepleri</h1>

        <p className="mt-2 text-sm text-white/50">
          Müşterilerin sipariş takip sayfasından oluşturduğu talepler.
        </p>
      </div>

      <TalepYonetimi />
    </div>
  );
}
