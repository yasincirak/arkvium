import SatisBildirimAyari from "@/components/admin/SatisBildirimAyari";

/**
 * Yönetim paneli ayarları.
 *
 * Erişim `src/app/admin/layout.tsx` içindeki rol kapısıyla korunur;
 * buradaki uçlar ayrıca kendi yetkilerini doğrular.
 */

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Ayarlar</h1>

        <p className="mt-2 text-sm text-white/50">
          Bildirim tercihleri bu hesap için geçerlidir.
        </p>
      </div>

      <SatisBildirimAyari />
    </div>
  );
}
