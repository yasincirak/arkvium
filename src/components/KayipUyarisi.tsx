/**
 * Kayıp eşya uyarısı.
 *
 * Ürünün sahibi eşyayı "kayıp" olarak işaretlediğinde, QR kodunu okutan
 * kişinin gördüğü ilk şey bu olur. Amaç: bulan kişi sayfayı kapatmadan
 * önce eşyanın gerçekten arandığını anlasın.
 *
 * Sunucu bileşenidir; hem yeni (/t/<token>) hem eski (/item/<id>) genel
 * erişim sayfasında kullanılır.
 */
import { sozluk } from "@/lib/i18n";

export default function KayipUyarisi() {
  const s = sozluk();

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
      <p className="text-lg font-bold text-amber-200">
        {s.qr.kayipUyarisi.baslik}
      </p>

      <p className="mt-2 text-sm leading-6 text-amber-100/80">
        {s.qr.kayipUyarisi.metin}
      </p>
    </div>
  );
}
