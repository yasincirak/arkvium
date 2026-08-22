import OdemeTestiFormu from "@/components/admin/OdemeTestiFormu";
import { SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Sandbox ödeme testi (yönetim paneli).
 *
 * AMACI teknik doğrulamadır: sipariş oluşturma → ödeme başlatma → iyzico
 * Checkout Form zincirinin uçtan uca çalıştığını görmek. GERÇEK SATIŞ DEĞİLDİR.
 *
 * Erişim `src/middleware.ts` içindeki yönetici oturumu kontrolüyle korunur;
 * kullandığı uç ayrıca kendi içinde yetki doğrular.
 *
 * Herkese açık satış akışı (ürün bölümü ve WhatsApp düğmeleri) bu sayfadan
 * ETKİLENMEZ. Hukuki metinler henüz mevcut olmadığı için burada onay kutusu
 * gösterilmez ve `OrderConsent` kaydı yazılmaz.
 */

export const dynamic = "force-dynamic";

export default function AdminOdemeTestiPage() {
  // Ürün listesi sunucudan gelir; istemci yalnızca kod seçer.
  const urunler = SIPARIS_URUNLERI.map((urun) => ({
    kod: urun.kod,
    ad: urun.ad,
    fiyatKurus: urun.fiyatKurus,
    qrAdedi: urun.qrAdedi,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
        <p className="text-lg font-bold text-amber-200">
          Yalnızca Sandbox teknik testi — gerçek satış değildir
        </p>

        <p className="mt-2 text-sm text-amber-100/80">
          Bu sayfa ödeme zincirini doğrulamak içindir. Gönderim gerçek bir
          sipariş kaydı oluşturur ve QR etiketlerini rezerve eder; hukuki onay
          kaydı (<code>OrderConsent</code>) yazılmaz. Müşterilere açık değildir.
        </p>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white">Sandbox Ödeme Testi</h1>

        <p className="mt-2 text-sm text-white/50">
          Tek ürün, adet 1. Tutarlar sunucudaki ürün kataloğundan hesaplanır;
          formdan fiyat gönderilmez.
        </p>
      </div>

      <OdemeTestiFormu urunler={urunler} />
    </div>
  );
}
