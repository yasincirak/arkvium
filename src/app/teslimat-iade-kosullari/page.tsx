import type { Metadata } from "next";
import Link from "next/link";
import HukukiSayfa, {
  Bolum,
  Doldurulacak,
  Liste,
} from "@/components/hukuki/HukukiSayfa";
import { HUKUKI_BELGELER } from "@/lib/hukuki-belgeler";
import { CANLI_ADRES } from "@/lib/seo";
import { fiyatBicimle, KARGO_UCRETI_KURUS } from "@/lib/siparis";

/**
 * Teslimat, İptal ve İade Koşulları.
 *
 * Kargo ücreti ve sipariş durumları koddan okunur. Teslimat süresi,
 * kargo firması ve cayma hakkı ayrıntıları koddan DOĞRULANAMAZ; bu
 * yüzden uydurulmamış, doldurulacak olarak bırakılmıştır.
 */

const BELGE = HUKUKI_BELGELER.teslimatIade;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM siparişlerinde teslimat süreci, sipariş iptali, cayma hakkı ve iade koşulları.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function TeslimatIadePage() {
  return (
    <HukukiSayfa belge={BELGE}>
      <Bolum baslik="1. Teslimat">
        <p>
          Kargo ücreti sabittir:{" "}
          <strong>{fiyatBicimle(KARGO_UCRETI_KURUS)}</strong>. Ücretsiz
          kargo eşiği bulunmamaktadır. Tutar sipariş ve ödeme adımında
          ayrıca gösterilir.
        </p>

        <Liste
          maddeler={[
            <>Kargo firması: <Doldurulacak not="firma unvanı" /></>,
            <>Tahmini teslimat süresi: <Doldurulacak not="iş günü" /></>,
            <>Teslimat yapılan bölgeler: <Doldurulacak /></>,
            <>Kargo takip bilgisinin nasıl iletileceği: <Doldurulacak /></>,
          ]}
        />

        <p>
          Ödemeniz onaylandıktan sonra siparişiniz &quot;hazırlanıyor&quot;
          durumuna alınır, kargoya verildiğinde &quot;kargoya
          verildi&quot; olarak işaretlenir. Sipariş durumunuzu, ödeme
          sonrası size gönderilen takip bağlantısından
          görüntüleyebilirsiniz.
        </p>
      </Bolum>

      <Bolum baslik="2. Sipariş iptali">
        <Liste
          maddeler={[
            "Ödemesi alınmamış sipariş, ödeme tamamlanmadığı sürece geçerli hâle gelmez; ayrılan QR etiketleri belirli bir süre sonra otomatik olarak stoğa döner.",
            "Ödemesi başarısız olan siparişlerde etiketler hemen stoğa döner ve sipariş 'başarısız' olarak işaretlenir.",
            "Ödemesi alınmış siparişin kargoya verilmeden önce iptali için bizimle iletişime geçin.",
          ]}
        />

        <p>
          İptal talebi kanalı ve süresi:{" "}
          <Doldurulacak not="iptal başvuru kanalı" />
        </p>
      </Bolum>

      <Bolum baslik="3. Cayma hakkı">
        <p>
          Mesafeli sözleşmelerde tüketicinin cayma hakkı bulunmaktadır.
          Bu hakkın süresi, başlangıç anı, kullanım şekli ve istisnaları
          ilgili mevzuata göre belirlenmelidir:
        </p>

        <Liste
          maddeler={[
            <>Cayma hakkı süresi: <Doldurulacak /></>,
            <>Sürenin başlangıç anı: <Doldurulacak /></>,
            <>Cayma bildiriminin yapılacağı adres ve şekil: <Doldurulacak /></>,
            <>İade kargo masrafının kime ait olduğu: <Doldurulacak /></>,
            <>Geri ödemenin yapılacağı süre ve yöntem: <Doldurulacak /></>,
          ]}
        />

        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Dikkat: QR etiketleri fiziksel üründür ve her etiketin üzerinde
          yalnızca bir kez kullanılabilen bir aktivasyon kodu bulunur.
          Etiketin aktive edilmiş olmasının cayma hakkına etkisi hukuki
          değerlendirme gerektirir: <Doldurulacak not="aktive edilmiş etiketlerde cayma hakkı değerlendirmesi" />
        </p>
      </Bolum>

      <Bolum baslik="4. Ayıplı ürün ve değişim">
        <p>
          Ürünün ayıplı çıkması hâlinde izlenecek süreç, başvuru süresi
          ve değişim koşulları:{" "}
          <Doldurulacak not="ayıplı ürün süreci" />
        </p>
      </Bolum>

      <Bolum baslik="5. İade süreci">
        <Liste
          maddeler={[
            <>İade gönderiminin yapılacağı adres: <Doldurulacak /></>,
            <>İade ile birlikte gönderilmesi gereken belgeler: <Doldurulacak /></>,
            <>Geri ödemenin hangi kanaldan yapılacağı: <Doldurulacak /></>,
          ]}
        />

        <p>
          Ödeme iyzico üzerinden alındığı için geri ödeme, ödemenin
          yapıldığı karta yansıtılır. Bankanızın yansıtma süresi
          ARKVIUM&apos;un denetiminde değildir.
        </p>
      </Bolum>

      <Bolum baslik="6. Uyuşmazlık başvurusu">
        <p>
          Tüketici hakem heyeti ve mahkeme başvuru mercileri ile parasal
          sınırlar:{" "}
          <Doldurulacak not="yetkili merciler ve parasal sınırlar" />
        </p>

        <p>
          Bu koşullar{" "}
          <Link
            href={HUKUKI_BELGELER.mesafeliSatis.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Mesafeli Satış Sözleşmesi
          </Link>
          &apos;nin ayrılmaz parçasıdır.
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
