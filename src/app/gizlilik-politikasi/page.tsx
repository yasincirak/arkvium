import type { Metadata } from "next";
import Link from "next/link";
import HukukiSayfa, {
  Bolum,
  Doldurulacak,
  Liste,
} from "@/components/hukuki/HukukiSayfa";
import {
  CEREZ_POLITIKASI_YOLU,
  HUKUKI_BELGELER,
} from "@/lib/hukuki-belgeler";
import { CANLI_ADRES } from "@/lib/seo";
import { ANALITIK_SAKLAMA_GUNU } from "@/lib/analitik-aralik";

/**
 * Gizlilik Politikası.
 *
 * KVKK Aydınlatma Metni hukuki bildirimdir; bu sayfa aynı akışları
 * günlük dille ve güvenlik önlemleri tarafından anlatır. İkisi
 * çelişmemelidir: her ikisi de koddan doğrulanmış olgulara dayanır.
 */

const BELGE = HUKUKI_BELGELER.gizlilikPolitikasi;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM hangi bilgileri topluyor, nerede saklıyor, kimlerle paylaşıyor ve nasıl koruyor.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function GizlilikPolitikasiPage() {
  return (
    <HukukiSayfa belge={BELGE}>
      <Bolum baslik="Kısaca">
        <Liste
          maddeler={[
            "QR sayfanızda telefon numaranız ve e-postanız açıkça gösterilmez; bulan kişi form üzerinden size ulaşır.",
            "Kart bilgileriniz ARKVIUM sunucularına hiç gelmez.",
            "IP adresiniz ham hâlde saklanmaz.",
            "Analitik yalnızca açıkça kabul ederseniz çalışır ve kimliğinizi içermez.",
            "Sağlık bilgisi içeren Acil Durum Profili varsayılan olarak kapalıdır ve şifrelenerek saklanır.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Hangi bilgileri topluyoruz">
        <p>
          Topladığımız verilerin tam listesi ve veritabanında hangi
          alanlarda tutulduğu{" "}
          <Link
            href={HUKUKI_BELGELER.kvkkAydinlatma.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            KVKK Aydınlatma Metni
          </Link>{" "}
          içinde ayrıntılı olarak yer alır. Özetle: hesap bilgileri,
          sipariş ve teslimat bilgileri, ürün kayıtlarınız, bulan kişi
          mesajları ve isteğe bağlı acil durum bilgileri.
        </p>
      </Bolum>

      <Bolum baslik="Nerede saklanıyor">
        <Liste
          maddeler={[
            "Veritabanı Supabase (PostgreSQL) üzerinde barındırılır.",
            "Uygulama Vercel üzerinde çalışır.",
            "İşlem e-postaları Gmail SMTP üzerinden gönderilir.",
            "Ödeme iyzico üzerinden alınır.",
          ]}
        />

        <p>
          Bu sağlayıcıların sunucu konumları:{" "}
          <Doldurulacak not="barındırma bölgeleri" />
        </p>
      </Bolum>

      <Bolum baslik="Nasıl koruyoruz">
        <p>
          Aşağıdaki önlemler uygulamanın kodunda fiilen uygulanmaktadır:
        </p>

        <Liste
          maddeler={[
            "Şifreler bcrypt ile özetlenir; düz metin saklanmaz.",
            "Şifre sıfırlama, e-posta doğrulama ve sahiplik devri bağlantıları yalnızca SHA-256 özeti olarak saklanır. Veritabanı ele geçse bile özetten geçerli bağlantı üretilemez.",
            "Oturum çerezi httpOnly'dir ve imzalıdır. Şifre değişikliğinde veya 'tüm oturumları kapat' işleminde önceki tüm oturumlar anında geçersiz olur.",
            "QR adresleri veritabanı kimliği içermez; tahmin edilemeyen kriptografik token kullanır.",
            "Acil durum profilindeki tüm alanlar (kan grubu dâhil) AES-256-GCM ile şifrelenir.",
            "QR erişim sayfaları hiçbir ara katmanda önbelleklenmez; rıza geri çekildiğinde bilgi anında görünmez olur.",
            "Hız sınırlama sayaçlarında IP ve e-posta ham hâlde değil, HMAC özeti olarak tutulur.",
            "Yönetim paneline erişim her istekte veritabanındaki rol bilgisinden doğrulanır.",
          ]}
        />

        <p>
          Hiçbir teknik önlem mutlak güvenlik sağlamaz. Hesabınızı
          korumak için güçlü ve size özel bir şifre kullanın.
        </p>
      </Bolum>

      <Bolum baslik="Çerezler ve analitik">
        <p>
          Zorunlu çerezler sitenin çalışması için gereklidir. Analitik
          çerezler yalnızca açık onayınızla oluşturulur; reddederseniz
          tarayıcınıza yazılmaz ve hiçbir analitik kayıt üretilmez.
        </p>

        <p>
          Analitik kayıtlarında IP adresi, tarayıcı parmak izi, e-posta,
          telefon veya adres bulunmaz. Kayıtlar{" "}
          <strong>{ANALITIK_SAKLAMA_GUNU} gün</strong> sonra otomatik
          silinir.
        </p>

        <p>
          Ayrıntılar ve tercih değiştirme:{" "}
          <Link
            href={CEREZ_POLITIKASI_YOLU}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Çerez Politikası
          </Link>
        </p>
      </Bolum>

      <Bolum baslik="Üçüncü taraf takip">
        <p>
          ARKVIUM üçüncü taraf analitik veya reklam çerezi kullanmaz.
          Sayfalara dışarıdan takip betiği yüklenmez.
        </p>
      </Bolum>

      <Bolum baslik="Çocukların gizliliği">
        <p>
          Hizmetin yaş sınırı ve çocuklara ilişkin politika:{" "}
          <Doldurulacak not="yaş sınırı politikası" />
        </p>
      </Bolum>

      <Bolum baslik="Değişiklikler ve iletişim">
        <p>
          Bu politika değiştiğinde sürüm numarası artırılır. Gizlilikle
          ilgili sorularınız için:{" "}
          <Doldurulacak not="iletişim adresi" />
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
