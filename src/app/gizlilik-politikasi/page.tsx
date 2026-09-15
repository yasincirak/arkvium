import type { Metadata } from "next";
import Link from "next/link";
import HukukiSayfa, {
  Bolum,
  HukukOnayi,
  Liste,
  YasinDoldurur,
} from "@/components/hukuki/HukukiSayfa";
import {
  CEREZ_POLITIKASI_YOLU,
  HUKUKI_BELGELER,
} from "@/lib/hukuki-belgeler";
import { CANLI_ADRES } from "@/lib/seo";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import { ANALITIK_SAKLAMA_GUNU } from "@/lib/analitik-aralik";

/**
 * Gizlilik Politikası.
 *
 * ────────────────────────────────────────────────────────────
 * KVKK AYDINLATMA METNİNDEN AYRI BİR BELGEDİR
 *
 * KVKK Aydınlatma Metni, kanunun öngördüğü biçimde veri sorumlusunu,
 * hukuki sebepleri ve ilgili kişi haklarını bildirir. Bu belge ise
 * uygulamanın verileri FİİLEN nasıl işlediğini ve koruduğunu anlatır.
 * İkisi birbirinin yerine kullanılmaz; çelişmemeleri için ikisi de aynı
 * kaynaktan — koddan — üretilir.
 * ────────────────────────────────────────────────────────────
 *
 * İÇERİK KURALI: Aşağıdaki her teknik iddia kaynak kodundan
 * doğrulanmıştır. Doğrulanamayan hiçbir güvenlik iddiası ("en üst düzey
 * güvenlik", "tamamen güvenli", "düzenli sızma testi" gibi) yazılmaz.
 *
 *   - Şifreleme ve oturum: src/lib/auth.ts, api/register, api/password/*
 *   - Ödeme: src/lib/odeme-servisi.ts, src/lib/odeme-saglayici.ts
 *   - Acil durum: src/lib/acil-durum.ts, acil-durum-sifreleme.ts
 *   - Analitik ve çerez: src/lib/analitik*.ts, src/lib/cerez-onayi.ts
 *   - QR ve mesajlar: src/lib/tags.ts, FinderMessage modeli
 */

const BELGE = HUKUKI_BELGELER.gizlilikPolitikasi;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM hangi verileri topluyor, nasıl koruyor, kimlerle paylaşıyor ve tercihlerinizi nasıl kullanabilirsiniz.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function GizlilikPolitikasiPage() {
  return (
    <HukukiSayfa
      belge={BELGE}
      isaretAciklamasi={
        <>
          İçindeki <YasinDoldurur alan="örnek" /> işaretli alanlar işletme
          tarafından doldurulmalı, <HukukOnayi /> işaretli maddeler bir
          hukuk danışmanı tarafından belirlenmelidir. Bu adımlar
          tamamlanmadan yayımlanmamalıdır.
        </>
      }
    >
      <Bolum baslik="1. Politikanın amacı ve kapsamı">
        <p>
          Bu politika, ARKVIUM markası altında{" "}
          <strong>https://arkvium.com</strong> adresinde sunulan hizmette
          verilerinizin nasıl işlendiğini ve korunduğunu anlatır. Hizmet;
          QR kodla dijital sahiplik, kayıp eşya iletişimi, ürün
          aktivasyonu, kullanıcı hesabı ile sipariş ve ödeme sistemini
          kapsar.
        </p>

        <p>
          Politika, aşağıdaki ürünler üzerinden sunulan hizmetin tamamını
          kapsar: {SIPARIS_URUNLERI.map((urun) => urun.ad).join(", ")}.
        </p>

        <p>
          Bu belge{" "}
          <Link
            href={HUKUKI_BELGELER.kvkkAydinlatma.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            KVKK Aydınlatma Metni
          </Link>{" "}
          ile <strong>aynı belge değildir</strong> ve onun yerine geçmez.
          Aydınlatma metni kanunun öngördüğü bildirimi yapar; bu politika
          uygulamanın fiilî davranışını anlatır.
        </p>

        <p>
          Bu politikayı okumanız veya siteyi kullanmanız, veri işlemeye
          onay verdiğiniz anlamına gelmez. Onay gereken yerlerde onayınız
          ayrıca ve açıkça istenir.
        </p>
      </Bolum>

      <Bolum baslik="2. Toplanan ve oluşturulan veri türleri">
        <p>
          Aşağıdakiler uygulamanın fiilen tuttuğu veya işlediği
          alanlardır.
        </p>

        <p className="font-medium text-[#101a3d]">Sizin girdiğiniz veriler</p>

        <Liste
          maddeler={[
            "Hesap: e-posta adresi, ad-soyad ve telefon (telefon isteğe bağlı).",
            "Sipariş: ad-soyad, e-posta, telefon, adres satırı, ilçe, il ve posta kodu.",
            "Ürün kaydı: eşyanın adı, açıklaması, kategorisi ve kayda bağladığınız iletişim bilgileri.",
            "İsteğe bağlı Acil Durum Profili alanları (bkz. bölüm 4).",
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          Başkalarının girdiği veriler
        </p>

        <Liste
          maddeler={[
            "Eşyanızı bulan kişinin bildirim formunda beyan ettiği ad, telefon, isteğe bağlı e-posta, konum ve mesaj metni.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          Sistemin oluşturduğu veriler
        </p>

        <Liste
          maddeler={[
            "QR etiketinizin durumu, bağlı olduğu ürün ve etiket geçmişi (aktivasyon, taşıma, devir, pasife alma, iptal).",
            "Sipariş durumu, sipariş olayları ve ödeme denemelerinin sonucu.",
            "Hangi hukuki belgenin hangi sürümünü onayladığınız ve onay zamanı.",
            "Çerez onayı verdiyseniz anonim ziyaret kayıtları (bkz. bölüm 8).",
            <>
              Kötüye kullanım sınırlaması için sayaçlar. Bu sayaçlarda IP
              adresi ve e-posta <strong>ham hâlde tutulmaz</strong>;
              yalnızca HMAC-SHA256 özeti saklanır ve özetten değer geri
              elde edilemez.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Hesap ve parola güvenliği">
        <p>Kodda doğrulanan davranışlar:</p>

        <Liste
          maddeler={[
            <>
              Parolanız <strong>düz metin olarak saklanmaz</strong>.
              Kayıt, parola değiştirme ve parola sıfırlama akışlarının
              tamamında <strong>bcrypt</strong> ile özetlenir ve yalnızca
              bu özet veritabanında tutulur.
            </>,
            <>
              Parola sıfırlama ve e-posta doğrulama bağlantıları düz metin
              saklanmaz; yalnızca <strong>SHA-256 özetleri</strong>{" "}
              tutulur. Veritabanı ele geçse bile özetten geçerli bağlantı
              üretilemez. Bağlantılar tek kullanımlıktır ve sürelidir.
            </>,
            <>
              Oturum çerezi <strong>httpOnly</strong>&apos;dir (sayfa
              betikleri okuyamaz), <strong>SameSite=Lax</strong>{" "}
              işaretlidir, üretim ortamında <strong>Secure</strong>{" "}
              gönderilir ve <strong>7 gün</strong> geçerlidir. İçeriği
              imzalıdır; imzası bozuk bir çerez kabul edilmez.
            </>,
            <>
              Her oturum, üretildiği andaki oturum sürümünü taşır. Parola
              değiştirdiğinizde, parolanızı sıfırladığınızda veya
              &quot;tüm oturumları kapat&quot; dediğinizde bu sürüm
              artırılır ve <strong>önceki tüm oturumlar anında geçersiz</strong>{" "}
              olur.
            </>,
            <>
              Yönetim paneli yetkisi her istekte veritabanındaki rol
              alanından okunur; oturum çerezine yazılmaz. Yetki geri
              alındığında etkisi anında geçerli olur.
            </>,
          ]}
        />

        <p>
          Hiçbir teknik önlem mutlak güvenlik sağlamaz. Hesabınızı korumak
          için size özel ve güçlü bir parola kullanmanızı öneririz.
        </p>
      </Bolum>

      <Bolum baslik="4. Acil Durum Profilindeki sağlık verilerinin korunması">
        <p>
          Acil Durum Profili <strong>tamamen isteğe bağlı</strong> bir
          özelliktir. Kullanmayı seçmezseniz bu kategoride hiçbir veri
          işlenmez.
        </p>

        <p>Kodda doğrulanan davranışlar:</p>

        <Liste
          maddeler={[
            <>
              <strong>Varsayılan olarak kapalıdır.</strong> Profilin
              kendisi ve her alanın görünürlüğü ayrı ayrı kapalı başlar;
              hiçbiri siz açmadan yayına girmez.
            </>,
            <>
              <strong>Ayrı bir açık rıza adımına bağlıdır.</strong> Rıza
              zamanı ve onaylanan metnin sürümü kaydedilir.
            </>,
            <>
              <strong>AES-256-GCM ile şifrelenir.</strong> Beyan edilen
              tüm alanlar — kan grubu dâhil — uygulama katmanında
              şifrelenerek saklanır; veritabanında düz metin sağlık
              verisi bulunmaz. Şifre çözülemezse alan gösterilmez,
              açıkta bırakılmaz.
            </>,
            <>
              Bir alanın QR sayfasında görünmesi için{" "}
              <strong>altı koşulun birlikte</strong> sağlanması gerekir:
              profil etkin, rıza geri çekilmemiş, kayıtlı rıza sürümü
              yürürlükteki sürümle tam eşit, etiket aktif, profil kaydın
              güncel sahibine ait ve o alan için görünürlük açık.
            </>,
            <>
              Onay metninin sürümü değişirse eski rızayla verilmiş profil
              gösterilmez; yeniden yayına almak için yeni rıza gerekir.
            </>,
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          Rızanızı geri çektiğinizde ne olur
        </p>

        <p>
          Kodda doğrulanan kapsam şudur: profil{" "}
          <strong>yayından kaldırılır</strong> (etkin durumu kapatılır,
          kapatma ve rıza geri çekme zamanı kaydedilir) ve{" "}
          <strong>onay kayıtları temizlenir</strong> (rıza zamanı, rıza
          sürümü ile diğer onay damgaları boşaltılır). QR sayfası etkinlik
          durumunu kontrol ettiği için bilgiler <strong>anında</strong>{" "}
          görünmez olur ve yeniden etkinleştirme yeni açık rıza gerektirir.
        </p>

        <p>
          Rızayı geri çekmek, kayıtlı alanları <strong>silmez</strong>;
          şifreli hâlleriyle kayıtta kalırlar. Profili tamamen silmek ayrı
          bir işlemdir ve bağlı acil durum yakınlarıyla birlikte kaydı
          kaldırır. Ürün kaydınızı silerseniz profil de birlikte silinir.
        </p>

        <p>
          Sağlık verilerinin özel nitelikli kişisel veri olarak işlenmesine
          ilişkin hukuki değerlendirme ve alınan açık rızanın usulüne
          uygunluğu bu metinde tahmin edilmemiştir:{" "}
          <HukukOnayi konu="sağlık verilerinin işlenmesi ve açık rıza usulü" />
        </p>
      </Bolum>

      <Bolum baslik="5. Kimlik numarasının ödeme işlemindeki kullanımı">
        <p>
          Ödeme sağlayıcısı, ödeme isteğinde alıcı kimlik numarası alanını
          zorunlu tutar. Bu alan sipariş formunda istenir.
        </p>

        <p>Kodda doğrulanan kapsam:</p>

        <Liste
          maddeler={[
            <>
              Değer <strong>yalnızca ödeme işleminin gerçekleştirilmesi
              amacıyla iyzico&apos;ya iletilir</strong>; sağlayıcıya
              gönderilen ödeme isteğinin alıcı bilgisine konur.
            </>,
            <>
              ARKVIUM veritabanında{" "}
              <strong>hiçbir tabloda saklanmaz</strong>. Bu amaçla
              tanımlanmış bir veri alanı yoktur.
            </>,
            <>
              Hiçbir <strong>log kaydına yazılmaz</strong> ve başka hiçbir
              amaçla kullanılmaz.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="6. Sipariş, ödeme ve kart güvenliği">
        <p>Kodda doğrulanan davranışlar:</p>

        <Liste
          maddeler={[
            <>
              <strong>Kart bilgileriniz ARKVIUM sunucularına hiç gelmez.</strong>{" "}
              Kart verisi yalnızca iyzico&apos;nun kendi ödeme sayfasında
              girilir. Uygulamanın veri modelinde kart numarası, son
              kullanma tarihi veya güvenlik kodu için tanımlı hiçbir alan
              yoktur.
            </>,
            <>
              Ödenecek tutar <strong>her zaman sunucuda</strong> ürün
              kataloğundan hesaplanır. Tarayıcıdan gönderilen fiyat, ara
              toplam, kargo veya toplam değeri kabul edilmez.
            </>,
            <>
              Sipariş, <strong>yalnızca sağlayıcıdan gelen doğrulama</strong>{" "}
              sonucunda ödendi sayılır. Ödeme dönüşünde tarayıcının
              taşıdığı tutar, durum veya sipariş kimliği dikkate alınmaz;
              sonuç doğrudan sağlayıcıya sorulur.
            </>,
            <>
              Doğrulanan tutar ve para birimi siparişle karşılaştırılır;
              uyuşmazsa sipariş ödendi sayılmaz.
            </>,
            <>
              Tekrarlanan ödeme bildirimleri tek sefer işlenir; aynı
              sipariş iki kez ödenmiş sayılamaz.
            </>,
            <>
              Ödeme sağlayıcısının belirteci (token) hiçbir log kaydına
              yazılmaz ve adres satırına konmaz. Hata kayıtlarında
              sağlayıcının ham yanıtı saklanmaz.
            </>,
          ]}
        />

        <p>
          ARKVIUM kodunda 3D Secure&apos;a ilişkin bir yapılandırma
          bulunmamaktadır; ödeme akışının hangi doğrulama adımlarını
          içerdiği iyzico ve kartınızı veren banka tarafında belirlenir.
          Bu konuda ARKVIUM bir taahhütte bulunmaz.
        </p>
      </Bolum>

      <Bolum baslik="7. Zorunlu çerezler">
        <p>
          Zorunlu çerezler sitenin çalışması için gereklidir ve
          kapatılamaz. Onay gerektirmezler.
        </p>

        <Liste
          maddeler={[
            "Oturum çerezi — giriş yapmış kullanıcıyı tanır. Giriş yapılmadan oluşmaz.",
            "Dil çerezi — seçtiğiniz dili (Türkçe/İngilizce) hatırlar.",
            "Çerez onayı çerezi — çerez tercihinizin kendisini saklar. Bu kayıt olmasa size her sayfada yeniden sorulurdu.",
          ]}
        />

        <p>
          Adları, süreleri ve sağlayıcıları{" "}
          <Link
            href={CEREZ_POLITIKASI_YOLU}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Çerez Politikası
          </Link>{" "}
          sayfasındadır.
        </p>
      </Bolum>

      <Bolum baslik="8. Açık tercihinize bağlı analitik çerezleri">
        <p>
          Analitik çerezler <strong>zorunlu değildir</strong> ve
          zorunlu çerezlerden ayrıdır.{" "}
          <strong>
            Yalnızca çerez bildiriminde açıkça kabul ederseniz oluşturulur.
          </strong>
        </p>

        <p>Kodda ve testlerde doğrulanan davranış:</p>

        <Liste
          maddeler={[
            <>
              Onay vermediyseniz veya reddettiyseniz analitik çerez
              tarayıcınıza <strong>yazılmaz</strong> ve{" "}
              <strong>hiçbir analitik kayıt oluşturulmaz</strong>. Bu
              kural hem tarayıcı tarafında hem sunucu ucunda ayrı ayrı
              uygulanır; sunucu kontrolü, istemci atlansa bile kaydın
              oluşmamasını sağlar.
            </>,
            <>
              Daha önce kabul edip sonradan reddederseniz, oluşmuş
              analitik çerezler <strong>silinir</strong>.
            </>,
            <>
              Çerez politikası sürümü değişirse eski onay geçersiz sayılır
              ve size yeniden sorulur.
            </>,
          ]}
        />

        <p>Onay verdiğinizde kaydedilen olaylar yalnızca şunlardır:</p>

        <Liste
          maddeler={[
            "Sayfa görüntüleme ve ürün görüntüleme",
            "Sepete ekleme ve sepetten çıkarma",
            "Ödeme başlatma, başarısız ödeme ve doğrulanmış satın alma",
          ]}
        />

        <p>
          Bu kayıtlarda IP adresi, tarayıcı parmak izi, user-agent,
          e-posta, telefon veya adres <strong>bulunmaz</strong>. Adres
          kaydedilirken sorgu dizesi atılır. Oturum açmamışsanız yalnızca
          rastgele üretilmiş, kişiyle ilişkilendirilmeyen bir ziyaretçi ve
          ziyaret kimliği tutulur; oturum açmışsanız kayıt yalnızca
          hesabınızla ilişkilendirilir ve ayrıca anonim bir takip kimliği
          oluşturulmaz. Yönetici gezintileri bu istatistiğe dâhil edilmez.
        </p>

        <p>
          Analitik kayıtları <strong>{ANALITIK_SAKLAMA_GUNU} gün</strong>{" "}
          sonra otomatik olarak silinir.
        </p>

        <p>
          ARKVIUM üçüncü taraf analitik veya reklam çerezi kullanmaz;
          sayfalara dışarıdan takip betiği yüklenmez.
        </p>
      </Bolum>

      <Bolum baslik="9. QR tarama, ziyaret ve mesaj kayıtları">
        <p>
          QR etiketini tarayan kişiden hesap açması veya kimliğini
          doğrulaması istenmez. Etiketin açtığı sayfa, eşya sahibinin
          telefon numarasını ve e-posta adresini açıkça göstermez.
        </p>

        <Liste
          maddeler={[
            <>
              Etiket adresleri veritabanı kimliği içermez; tahmin
              edilemeyen kriptografik bir belirteç kullanır.
            </>,
            <>
              Etiket pasife alınmış, iptal edilmiş veya henüz bir ürüne
              bağlanmamışsa bildirim formu gösterilmez ve ürün bilgisi
              sızdırılmaz.
            </>,
            <>
              Etiket sayfaları hiçbir ara katmanda{" "}
              <strong>önbelleklenmez</strong>. Bir bilgiyi yayından
              kaldırdığınızda anında görünmez olur.
            </>,
            <>
              Bulan kişi bildirim formunu doldurursa beyan ettiği ad,
              telefon, isteğe bağlı e-posta, konum ve mesaj metni
              kaydedilir ve size iletilir. Bu bilgileri gönderen kişi
              kendisi beyan eder; başka bir kaynaktan toplanmaz.
            </>,
            <>
              Etiket aktivasyonunda kullanılan kod düz metin saklanmaz;
              yalnızca özeti tutulur. Kod fiziksel etiketin üzerindedir.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="10. Supabase, Vercel, iyzico ve e-posta servislerinin rolleri">
        <p>
          Aşağıdaki liste uygulamanın bağımlılıklarından ve ortam
          yapılandırmasından doğrulanmıştır. Bu sağlayıcılar dışında
          hiçbir tarafa veri aktarılmaz; reklam ağlarına veya veri
          simsarlarına aktarım yapılmaz.
        </p>

        <Liste
          maddeler={[
            <>
              <strong>Supabase (PostgreSQL)</strong> — veritabanı
              barındırma. Bölüm 2&apos;de sayılan kayıtlar burada tutulur.
            </>,
            <>
              <strong>Vercel</strong> — uygulamanın barındırılması ve
              sunucu tarafı çalıştırılması. Sunucuya gelen istekler bu
              altyapı üzerinden geçer.
            </>,
            <>
              <strong>iyzico</strong> — ödeme hizmeti. Ad-soyad, e-posta,
              telefon, adres, sipariş tutarı ve sağlayıcının zorunlu
              tuttuğu kimlik numarası ödeme adımında iletilir. Kart
              bilgileriniz doğrudan iyzico tarafından alınır.
            </>,
            <>
              <strong>Google (Gmail SMTP)</strong> — işlem e-postalarının
              gönderimi: sipariş onayı, e-posta doğrulama, parola
              sıfırlama, sahiplik devri daveti ve bulan kişi bildirimi.
              Alıcı adresi ve mesaj içeriği bu servisten geçer.
            </>,
            <>
              <strong>Kargo hizmeti</strong> — teslimat için ad-soyad,
              telefon ve adres.{" "}
              <YasinDoldurur alan="kargo firması unvanı" />
            </>,
          ]}
        />

        <p>
          Bu sağlayıcıların verileri hangi bölgede işlediği ve yurt dışına
          aktarımın hangi şartla yapılacağı hukuki ve teknik
          değerlendirme gerektirir:
        </p>

        <Liste
          maddeler={[
            <>
              Sağlayıcıların veri işleme bölgeleri:{" "}
              <YasinDoldurur alan="Supabase, Vercel, iyzico ve Gmail için seçilen bölgeler" />
            </>,
            <>
              Yurt dışına aktarımın hukuki dayanağı:{" "}
              <HukukOnayi konu="yurt dışına veri aktarımı" />
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="11. Dış bağlantılar">
        <p>
          Sitede üçüncü taraf adreslere giden bağlantılar bulunur: ödeme
          adımında iyzico&apos;nun kendi alan adına yönlendirilirsiniz ve
          destek için WhatsApp bağlantısı sunulur.
        </p>

        <p>
          Bu adreslere geçtiğinizde artık ARKVIUM&apos;un gizlilik
          uygulamaları değil, ilgili tarafın kendi politikaları geçerlidir.
          ARKVIUM bu sitelerin içeriğinden ve veri işleme davranışından
          sorumlu değildir. Sorumluluk sınırlarının kapsamı:{" "}
          <HukukOnayi konu="sorumluluk sınırı" />
        </p>
      </Bolum>

      <Bolum baslik="12. Gizlilik tercihleriniz">
        <p>
          Aşağıdakileri başvuru beklemeden, doğrudan uygulama içinden
          yapabilirsiniz:
        </p>

        <Liste
          maddeler={[
            "Çerez tercihinizi değiştirmek (footer'daki 'Çerez Tercihleri' bağlantısı).",
            "Ürün kaydınızı düzenlemek veya kayda bağlı iletişim bilgilerini değiştirmek.",
            "QR etiketinizi pasife almak; pasif etiket bildirim formu göstermez.",
            "Acil Durum Profilinizi kapatmak, açık rızanızı geri çekmek veya profili tamamen silmek.",
            "Acil durum profilinde her alanın görünürlüğünü tek tek açıp kapatmak.",
            "Parolanızı değiştirmek ve tüm oturumlarınızı kapatmak.",
            "Ürün sahipliğini başka bir kullanıcıya devretmek.",
          ]}
        />
      </Bolum>

      <Bolum baslik="13. Verilerin silinmesi ve hesabın kapatılması">
        <p>Kodda doğrulanan silme davranışları:</p>

        <Liste
          maddeler={[
            "Acil Durum Profili tamamen silinebilir; bağlı acil durum yakınları da birlikte silinir.",
            "Ürün kaydı silindiğinde, ona bağlı acil durum profili de silinir.",
            "Analitik kayıtları saklama süresi dolduğunda otomatik olarak silinir.",
            "Süresi dolmuş QR rezervasyonları ve hız sınırlama sayaçları otomatik olarak temizlenir.",
            "Sipariş ve ödeme kayıtları mali ve hukuki kayıt niteliği taşıdığından uygulama içinde silinmez; sipariş iptali kayıt silinerek değil durum değiştirilerek yapılır.",
            "Hesap kaydı kaldırılırsa siparişiniz korunur, yalnızca hesapla bağı kopar.",
          ]}
        />

        <p>
          <strong>
            Uygulamada şu anda kendi hesabınızı kendiniz kapatmanızı
            sağlayan bir ekran bulunmamaktadır.
          </strong>{" "}
          Hesabınızın kapatılmasını istiyorsanız bölüm 15&apos;teki
          iletişim kanalından talep edebilirsiniz.
        </p>

        <p>
          Hangi verinin ne kadar süreyle saklanacağı ve silme talebinin
          hangi kayıtları kapsayacağı mevzuata göre belirlenmelidir:{" "}
          <YasinDoldurur alan="veri kategorisi bazında saklama süreleri" />{" "}
          <HukukOnayi konu="saklama ve silme yükümlülükleri" />
        </p>
      </Bolum>

      <Bolum baslik="14. Politika değişiklikleri">
        <p>
          Bu politika değiştiğinde sürüm numarası artırılır ve yürürlük
          tarihi güncellenir. Değişiklikler yayımlandığı andan itibaren
          geçerli olur.
        </p>

        <p>
          Çerez tercihinizi etkileyen bir değişiklik olursa çerez onayının
          sürümü de artırılır; bu durumda tercihiniz size yeniden sorulur
          ve eski onay geçerli sayılmaz.
        </p>

        <p>
          Değişikliklerin kullanıcılara nasıl duyurulacağı:{" "}
          <YasinDoldurur alan="değişiklik duyuru yöntemi" />
        </p>
      </Bolum>

      <Bolum baslik="15. İletişim, yürürlük tarihi ve sürüm">
        <Liste
          maddeler={[
            <>Marka: ARKVIUM — https://arkvium.com</>,
            <>
              İşletme unvanı:{" "}
              <YasinDoldurur alan="ticaret unvanı / şahıs firması adı" />
            </>,
            <>
              Adres: <YasinDoldurur alan="açık adres" />
            </>,
            <>
              Telefon: <YasinDoldurur alan="telefon" />
            </>,
            <>
              Gizlilik ve veri talepleri için e-posta:{" "}
              <YasinDoldurur alan="kurumsal e-posta adresi" />
            </>,
            <>Sürüm: {BELGE.surum}</>,
            <>
              Yürürlük tarihi:{" "}
              <YasinDoldurur alan="metnin yayımlanacağı tarih" />
            </>,
          ]}
        />

        <p>
          KVKK kapsamındaki haklarınızı kullanmak için başvuru kanalı ve
          yöntemi{" "}
          <Link
            href={HUKUKI_BELGELER.kvkkAydinlatma.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            KVKK Aydınlatma Metni
          </Link>{" "}
          içinde belirtilmiştir.
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
