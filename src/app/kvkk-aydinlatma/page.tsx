import type { Metadata } from "next";
import HukukiSayfa, {
  Bolum,
  Doldurulacak,
  Liste,
} from "@/components/hukuki/HukukiSayfa";
import { HUKUKI_BELGELER } from "@/lib/hukuki-belgeler";
import { CANLI_ADRES } from "@/lib/seo";
import { ANALITIK_SAKLAMA_GUNU } from "@/lib/analitik-aralik";

/**
 * KVKK Aydınlatma Metni.
 *
 * İÇERİK KURALI: Buradaki her veri kategorisi ve her aktarım, kaynak
 * koddan doğrulanmıştır. Doğrulanamayan hiçbir bilgi (veri sorumlusu
 * unvanı, saklama süreleri, hukuki sebepler) uydurulmamış, açıkça
 * doldurulacak olarak işaretlenmiştir.
 */

const BELGE = HUKUKI_BELGELER.kvkkAydinlatma;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM'da işlenen kişisel veriler, işlenme amaçları, aktarımlar ve ilgili kişi hakları.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function KvkkAydinlatmaPage() {
  return (
    <HukukiSayfa belge={BELGE}>
      <Bolum baslik="1. Veri sorumlusu">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
          uyarınca veri sorumlusu:
        </p>

        <Liste
          maddeler={[
            <>Unvan: <Doldurulacak not="ticaret unvanı" /></>,
            <>Adres: <Doldurulacak not="merkez adresi" /></>,
            <>MERSİS / vergi bilgileri: <Doldurulacak /></>,
            <>İletişim (e-posta / KEP): <Doldurulacak /></>,
          ]}
        />
      </Bolum>

      <Bolum baslik="2. İşlenen kişisel veriler">
        <p>
          Aşağıdaki veriler, uygulamanın veritabanı şemasında fiilen
          tutulan alanlardır.
        </p>

        <p className="font-medium text-[#101a3d]">Hesap verileri</p>

        <Liste
          maddeler={[
            "E-posta adresi, ad-soyad ve telefon numarası (telefon isteğe bağlıdır).",
            "Şifreniz düz metin olarak saklanmaz; yalnızca bcrypt özeti tutulur.",
            "Şifre sıfırlama ve e-posta doğrulama bağlantıları düz metin saklanmaz; yalnızca SHA-256 özetleri tutulur.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">Sipariş ve teslimat verileri</p>

        <Liste
          maddeler={[
            "Ad-soyad, e-posta, telefon, adres satırı, ilçe, il ve posta kodu.",
            "Sipariş kalemleri, tutarlar ve sipariş durumu.",
            <>
              Kimlik numarası SAKLANMAZ. Ödeme sağlayıcısının zorunlu
              tuttuğu bu alan yalnızca ödeme adımında sağlayıcıya iletilir,
              hiçbir tabloya yazılmaz ve loglanmaz.
            </>,
            <>
              Kart bilgileri ARKVIUM sunucularına HİÇ GELMEZ. Kart verisi
              yalnızca ödeme sağlayıcısının kendi sayfasında girilir.
            </>,
          ]}
        />

        <p className="font-medium text-[#101a3d]">Ürün kaydı ve QR verileri</p>

        <Liste
          maddeler={[
            "Kaydettiğiniz eşyaya ilişkin ad, açıklama, kategori ve iletişim bilgileri.",
            "QR etiketlerinizin durumu ve hangi kayda bağlı olduğu.",
            "Eşyanızı bulan kişinin size gönderdiği mesajda verdiği ad, telefon, isteğe bağlı e-posta, konum ve mesaj metni.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          Acil Durum Profili (tamamen isteğe bağlı)
        </p>

        <Liste
          maddeler={[
            "Kan grubu, alerjiler, kullanılan ilaçlar, sağlık durumu, acil durum notu ve acil durum yakınlarının ad ve telefonu.",
            "Bu veriler KVKK m.6 kapsamında ÖZEL NİTELİKLİ kişisel veridir ve yalnızca AÇIK RIZANIZLA işlenir.",
            "Profil varsayılan olarak KAPALIDIR ve her alan ayrı ayrı görünür yapılır; varsayılan olarak hepsi kapalıdır.",
            "Beyan edilen tüm alanlar (kan grubu dâhil) uygulama katmanında AES-256-GCM ile şifrelenerek saklanır; veritabanında düz metin sağlık verisi bulunmaz.",
            "Açık rızanızı geri çektiğinizde veya metin sürümü değiştiğinde profil otomatik olarak yayından kalkar.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">Teknik veriler</p>

        <Liste
          maddeler={[
            "IP adresiniz HAM HÂLDE SAKLANMAZ. Yalnızca kötüye kullanımı sınırlamak için HMAC-SHA256 özeti tutulur ve bu özetten IP geri elde edilemez.",
            <>
              Analitik kayıtlarında IP adresi, tarayıcı parmak izi,
              e-posta, telefon veya adres BULUNMAZ. Analitik yalnızca
              çerez bildiriminde açıkça kabul etmeniz hâlinde çalışır.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. İşleme amaçları">
        <Liste
          maddeler={[
            "Hesabınızı oluşturmak, girişinizi sağlamak ve oturumunuzu doğrulamak.",
            "Siparişinizi almak, ödemesini tahsil etmek, hazırlamak ve kargoya vermek.",
            "QR etiketlerinizi ürünlerinize bağlamak ve aktivasyonunu yönetmek.",
            "Eşyanızı bulan kişinin, sizin iletişim bilgileriniz görünmeden size ulaşmasını sağlamak.",
            "Açık rıza vermeniz hâlinde acil durum bilgilerinizi QR sayfasında göstermek.",
            "Açık rıza vermeniz hâlinde ziyaret istatistiği üretmek.",
            "Kötüye kullanımı sınırlamak (hız sınırlama).",
          ]}
        />

        <p>
          Her amaç için dayanılan KVKK m.5/m.6 hukuki sebepleri:{" "}
          <Doldurulacak not="amaç bazında hukuki sebep eşleşmesi" />
        </p>
      </Bolum>

      <Bolum baslik="4. Aktarılan taraflar">
        <p>
          Kişisel verileriniz aşağıdaki hizmet sağlayıcılar üzerinden
          işlenir. Bu liste, uygulamanın koduna ve bağımlılıklarına göre
          doğrulanmıştır.
        </p>

        <Liste
          maddeler={[
            <>
              <strong>Supabase</strong> — veritabanı barındırma
              (PostgreSQL). Yukarıda sayılan tüm kayıtlar burada tutulur.
            </>,
            <>
              <strong>Vercel</strong> — uygulama barındırma ve sunucu
              tarafı çalıştırma.
            </>,
            <>
              <strong>iyzico</strong> — ödeme hizmeti. Ad-soyad, e-posta,
              telefon, adres, sipariş tutarı ve sağlayıcının zorunlu
              tuttuğu kimlik numarası ödeme adımında iletilir. Kart
              bilgileriniz doğrudan iyzico tarafından alınır.
            </>,
            <>
              <strong>Google (Gmail SMTP)</strong> — işlem e-postalarının
              gönderimi (sipariş onayı, e-posta doğrulama, şifre sıfırlama,
              bulan kişi bildirimi).
            </>,
            <>
              <strong>Kargo hizmeti</strong> — teslimat için ad-soyad,
              telefon ve adres bilgisi paylaşılır. Firma ve aktarım
              ayrıntıları: <Doldurulacak not="kargo firması unvanı" />
            </>,
          ]}
        />

        <p>
          Bu sağlayıcıların sunucu konumları ve yurt dışına aktarım
          durumu: <Doldurulacak not="yurt dışına aktarım değerlendirmesi" />
        </p>
      </Bolum>

      <Bolum baslik="5. Saklama süreleri">
        <p>
          Kod düzeyinde tanımlı tek kesin süre analitik kayıtlarına aittir:
          analitik olayları <strong>{ANALITIK_SAKLAMA_GUNU} gün</strong>{" "}
          sonra otomatik olarak silinir.
        </p>

        <p>
          Sipariş, ödeme, hesap, ürün kaydı ve acil durum profili
          verileri için saklama süreleri ilgili mevzuata göre
          belirlenmelidir: <Doldurulacak not="veri kategorisi bazında saklama süreleri" />
        </p>

        <p>
          Sipariş ve ödeme kayıtları mali ve hukuki kayıt niteliği
          taşıdığından uygulama içinde silinmez; sipariş iptali kayıt
          silinerek değil, durum değiştirilerek yapılır.
        </p>
      </Bolum>

      <Bolum baslik="6. Haklarınız">
        <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>

        <Liste
          maddeler={[
            "Kişisel verinizin işlenip işlenmediğini öğrenme ve buna ilişkin bilgi talep etme.",
            "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.",
            "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme.",
            "Eksik veya yanlış işlenmişse düzeltilmesini isteme.",
            "Şartları oluştuğunda silinmesini veya yok edilmesini isteme.",
            "Düzeltme, silme ve yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme.",
            "Otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme.",
            "Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
          ]}
        />

        <p>
          Hesabınıza bağlı bazı hakları doğrudan uygulama içinden
          kullanabilirsiniz: acil durum profilinizi kapatabilir, açık
          rızanızı geri çekebilir, ürün kayıtlarınızı düzenleyebilir,
          etiketlerinizi pasife alabilir ve tüm oturumlarınızı
          kapatabilirsiniz. Çerez tercihinizi de istediğiniz zaman
          değiştirebilirsiniz.
        </p>

        <p>
          Başvuru kanalı ve şekli:{" "}
          <Doldurulacak not="başvuru adresi ve yöntemi" />
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
