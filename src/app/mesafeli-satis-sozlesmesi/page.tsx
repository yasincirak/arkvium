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
 * Mesafeli Satış Sözleşmesi.
 *
 * Ürün listesi, fiyatlar ve kargo ücreti TEK KAYNAKTAN (`@/lib/siparis`)
 * okunur; sözleşmede elle yazılmaz. Katalog değişirse sözleşme
 * kendiliğinden güncellenir ve fiyat ile sözleşme birbirinden ayrı
 * düşemez.
 */

const BELGE = HUKUKI_BELGELER.mesafeliSatis;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM üzerinden yapılan satışlara ilişkin mesafeli satış sözleşmesi.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function MesafeliSatisPage() {
  return (
    <HukukiSayfa belge={BELGE}>
      <Bolum baslik="1. Taraflar">
        <p className="font-medium text-[#101a3d]">Satıcı</p>

        <Liste
          maddeler={[
            <>Unvan: <Doldurulacak not="ticaret unvanı" /></>,
            <>Adres: <Doldurulacak /></>,
            <>Telefon: <Doldurulacak /></>,
            <>E-posta: <Doldurulacak /></>,
            <>MERSİS / vergi dairesi ve numarası: <Doldurulacak /></>,
          ]}
        />

        <p className="font-medium text-[#101a3d]">Alıcı</p>

        <p>
          Sipariş formunda beyan ettiğiniz ad-soyad, e-posta, telefon ve
          teslimat adresi bilgileri. Bu bilgiler siparişin verildiği anda
          kaydedilir ve kargo ile sipariş bildirimleri için kullanılır.
        </p>
      </Bolum>

      <Bolum baslik="2. Sözleşme konusu ürünler ve fiyatlar">
        <p>
          Aşağıdaki liste ve fiyatlar uygulamanın ürün kataloğundan
          doğrudan okunmaktadır. Tüm fiyatlara KDV dâhil olup olmadığı:{" "}
          <Doldurulacak not="KDV beyanı" />
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
          (sabit; ücretsiz kargo eşiği bulunmamaktadır). Ödenecek toplam
          tutar, sipariş ve ödeme adımında ayrıca gösterilir.
        </p>

        <p>
          Sipariş tutarı her zaman sunucudaki katalogdan hesaplanır;
          tarayıcıdan gönderilen hiçbir fiyat bilgisi kabul edilmez.
        </p>
      </Bolum>

      <Bolum baslik="3. Ödeme">
        <Liste
          maddeler={[
            "Ödeme, iyzico altyapısı üzerinden kredi/banka kartı ile alınır.",
            "Kart bilgileriniz ARKVIUM sunucularına hiç gelmez; doğrudan iyzico sayfasında girilir ve ARKVIUM tarafından saklanmaz.",
            "Ödeme sağlayıcı tarafından doğrulanana kadar sipariş 'ödeme bekleniyor' durumunda kalır.",
            "Ödeme başarısız olursa sipariş için ayrılan QR etiketleri stoğa döner ve sipariş 'başarısız' olarak işaretlenir.",
            <>
              Ödeme sırasında sağlayıcının zorunlu tuttuğu kimlik numarası
              ARKVIUM tarafından SAKLANMAZ; yalnızca iyzico&apos;ya iletilir.
            </>,
          ]}
        />

        <p>
          Taksit seçenekleri ve varsa ek ücretler:{" "}
          <Doldurulacak not="taksit ve vade farkı bilgisi" />
        </p>
      </Bolum>

      <Bolum baslik="4. Sipariş ve teslimat süreci">
        <p>
          Siparişiniz uygulama içinde şu durumlardan geçer: ödeme
          bekleniyor → ödendi → hazırlanıyor → kargoya verildi. İptal
          edilen veya ödemesi başarısız olan siparişler ayrıca
          işaretlenir.
        </p>

        <p>
          Teslimat süresi, kargo firması ve teslimat bölgeleri{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          sayfasında düzenlenmiştir.
        </p>
      </Bolum>

      <Bolum baslik="5. Cayma hakkı">
        <p>
          Cayma hakkının süresi, kullanım şekli, istisnaları ve iade
          masraflarının kime ait olacağı{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          sayfasında düzenlenmiştir ve bu sözleşmenin ayrılmaz parçasıdır.
        </p>
      </Bolum>

      <Bolum baslik="6. Kişisel verilerin işlenmesi">
        <p>
          Sipariş kapsamında işlenen kişisel veriler, işleme amaçları ve
          aktarılan taraflar{" "}
          <Link
            href={HUKUKI_BELGELER.kvkkAydinlatma.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            KVKK Aydınlatma Metni
          </Link>{" "}
          içinde açıklanmıştır.
        </p>
      </Bolum>

      <Bolum baslik="7. Uyuşmazlık çözümü">
        <p>
          Yetkili tüketici hakem heyetleri ve mahkemeler ile uygulanacak
          parasal sınırlar: <Doldurulacak not="yetkili merciler ve parasal sınırlar" />
        </p>
      </Bolum>

      <Bolum baslik="8. Yürürlük">
        <p>
          Bu sözleşme, siparişi onayladığınız anda elektronik ortamda
          kurulur. Onayladığınız sürüm sipariş kaydınızla birlikte
          saklanır.
        </p>

        <p className="text-sm text-slate-500">
          Not: Onay kaydının veritabanına yazılması (OrderConsent)
          uygulamada henüz devreye alınmamıştır; yayın öncesi
          tamamlanması gereken bir adımdır.
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
