import type { Metadata } from "next";
import Link from "next/link";
import HukukiSayfa, {
  Bolum,
  Doldurulacak,
  Liste,
} from "@/components/hukuki/HukukiSayfa";
import { HUKUKI_BELGELER } from "@/lib/hukuki-belgeler";
import { CANLI_ADRES } from "@/lib/seo";
import {
  fiyatBicimle,
  KARGO_UCRETI_KURUS,
  SIPARIS_URUNLERI,
} from "@/lib/siparis";

/**
 * Ön Bilgilendirme Formu.
 *
 * Mesafeli satışta sözleşmeden ÖNCE sunulması gereken bilgilendirmedir.
 * Mesafeli Satış Sözleşmesi'nden ayrı bir belgedir ve `OrderConsent`
 * şemasında kendi kodu vardır (`on_bilgilendirme`).
 *
 * Ürün listesi, fiyatlar ve kargo ücreti tek kaynaktan okunur.
 */

const BELGE = HUKUKI_BELGELER.onBilgilendirme;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM siparişi vermeden önce bilmeniz gerekenler: ürün, fiyat, ödeme, teslimat ve cayma hakkı.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function OnBilgilendirmePage() {
  return (
    <HukukiSayfa belge={BELGE}>
      <Bolum baslik="1. Bu form ne işe yarar">
        <p>
          Bu form, siparişinizi onaylamadan önce bilmeniz gereken
          bilgileri bir arada sunar. Siparişi onayladığınızda bu formu
          okuduğunuzu ve{" "}
          <Link
            href={HUKUKI_BELGELER.mesafeliSatis.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Mesafeli Satış Sözleşmesi
          </Link>
          &apos;ni kabul ettiğinizi beyan etmiş olursunuz. Hangi belgenin
          hangi sürümünü onayladığınız sipariş kaydınızla birlikte
          saklanır.
        </p>
      </Bolum>

      <Bolum baslik="2. Satıcı bilgileri">
        <Liste
          maddeler={[
            <>Unvan: <Doldurulacak not="ticaret unvanı" /></>,
            <>Adres: <Doldurulacak /></>,
            <>Telefon: <Doldurulacak /></>,
            <>E-posta: <Doldurulacak /></>,
            <>MERSİS / vergi dairesi ve numarası: <Doldurulacak /></>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Ürünün temel nitelikleri ve fiyatı">
        <p>
          Aşağıdaki liste ve fiyatlar uygulamanın ürün kataloğundan
          doğrudan okunmaktadır. Her ürün, üzerindeki QR kodu ARKVIUM
          hesabınıza bağlamanızı sağlayan fiziksel bir etikettir; her
          etiketin üzerinde yalnızca bir kez kullanılabilen bir
          aktivasyon kodu bulunur.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">QR adedi</th>
                <th className="px-4 py-3 font-medium">Birim fiyat</th>
              </tr>
            </thead>

            <tbody>
              {SIPARIS_URUNLERI.map((urun) => (
                <tr key={urun.kod} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-[#101a3d]">{urun.ad}</td>
                  <td className="px-4 py-3 text-slate-600">{urun.qrAdedi}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {fiyatBicimle(urun.fiyatKurus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          Kargo ücreti: <strong>{fiyatBicimle(KARGO_UCRETI_KURUS)}</strong>{" "}
          (sabit). Ödenecek toplam tutar sipariş ekranında ayrıca
          gösterilir.
        </p>

        <p>
          Fiyatlara KDV dâhil olup olmadığı:{" "}
          <Doldurulacak not="KDV beyanı" />
        </p>

        <p>
          Fiyatlar, siparişi onayladığınız tarihte geçerli olan
          katalogdan hesaplanır. Tarayıcıdan gönderilen hiçbir fiyat
          bilgisi kabul edilmez.
        </p>
      </Bolum>

      <Bolum baslik="4. Ödeme">
        <Liste
          maddeler={[
            "Ödeme iyzico altyapısı üzerinden kredi/banka kartı ile alınır.",
            "Kart bilgileriniz ARKVIUM sunucularına hiç gelmez ve saklanmaz.",
            "Ödeme sağlayıcı tarafından doğrulanana kadar sipariş kesinleşmez.",
          ]}
        />

        <p>
          Taksit seçenekleri ve vade farkı:{" "}
          <Doldurulacak not="taksit bilgisi" />
        </p>
      </Bolum>

      <Bolum baslik="5. Teslimat">
        <p>
          Teslimat süreci, kargo firması, süresi ve bölgeleri{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          sayfasında düzenlenmiştir.
        </p>
      </Bolum>

      <Bolum baslik="6. Cayma hakkı">
        <p>
          Cayma hakkının süresi, kullanım şekli, istisnaları ve iade
          masrafları{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          sayfasında düzenlenmiştir.
        </p>

        <p>
          Cayma hakkının kullanılamayacağı hâller ve aktive edilmiş
          etiketlere ilişkin değerlendirme:{" "}
          <Doldurulacak not="cayma hakkı istisnaları" />
        </p>
      </Bolum>

      <Bolum baslik="7. Şikâyet ve başvuru">
        <p>
          Tüketici hakem heyeti ve mahkeme başvuru mercileri ile parasal
          sınırlar:{" "}
          <Doldurulacak not="yetkili merciler ve parasal sınırlar" />
        </p>
      </Bolum>

      <Bolum baslik="8. Kişisel verileriniz">
        <p>
          Sipariş kapsamında işlenen kişisel veriler ve aktarılan
          taraflar{" "}
          <Link
            href={HUKUKI_BELGELER.kvkkAydinlatma.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            KVKK Aydınlatma Metni
          </Link>{" "}
          içinde açıklanmıştır.
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
