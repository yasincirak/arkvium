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
 * KVKK Aydınlatma Metni.
 *
 * ────────────────────────────────────────────────────────────
 * İÇERİK KURALI — YALNIZCA KODDA DOĞRULANAN
 *
 * Bu metindeki her veri kategorisi, her amaç ve her aktarım kaynak
 * kodundan doğrulanmıştır:
 *
 *   - Veri alanları: prisma/schema.prisma
 *   - Sipariş ve ödeme akışı: src/lib/siparis-servisi.ts,
 *     src/lib/odeme-servisi.ts, src/lib/odeme-saglayici.ts
 *   - Kimlik doğrulama: src/lib/auth.ts, src/lib/session.ts
 *   - QR aktivasyonu: src/app/api/tags/activate, src/lib/tags.ts
 *   - Ziyaretçi mesajları: FinderMessage modeli, src/lib/actions.ts
 *   - Analitik ve çerez: src/lib/analitik*.ts, src/lib/cerez-onayi.ts
 *   - Dış hizmetler: package.json bağımlılıkları ve .env.example
 *
 * TAHMİN EDİLMEZ: hukuki sebep, saklama süresi ve yurt dışına aktarım
 * değerlendirmesi koddan okunamaz; `HukukOnayi` ile işaretlenir.
 * İşletme bilgileri `YasinDoldurur` ile işaretlenir.
 *
 * AÇIK RIZA İLE AYDINLATMA KARIŞTIRILMAZ: bu metin bilgilendirmedir,
 * onay belgesi değildir. Açık rıza gereken tek yer (Acil Durum Profili)
 * kendi ekranında ayrıca alınır.
 * ────────────────────────────────────────────────────────────
 */

const BELGE = HUKUKI_BELGELER.kvkkAydinlatma;

export const metadata: Metadata = {
  title: BELGE.baslik,
  description:
    "ARKVIUM'da işlenen kişisel veriler, işlenme amaçları, aktarımlar ve KVKK kapsamındaki haklarınız.",
  alternates: { canonical: `${CANLI_ADRES}${BELGE.yol}` },
};

export default function KvkkAydinlatmaPage() {
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
      <Bolum baslik="Bu metin ne değildir">
        <p>
          Bu belge bir <strong>aydınlatma metnidir</strong>: hangi
          verilerinizin neden işlendiğini anlatır. Bir onay veya rıza
          belgesi <strong>değildir</strong>.
        </p>

        <p>
          Siteyi ziyaret etmeniz, burada anlatılan tüm veri işleme
          faaliyetlerini kabul ettiğiniz anlamına gelmez. Onay gerektiren
          işlemler için onayınız ayrıca ve açıkça istenir: analitik
          çerezler çerez bildirimindeki seçiminizle, sipariş belgeleri
          sipariş ekranındaki onay kutusuyla, Acil Durum Profili ise kendi
          ekranındaki ayrı açık rıza adımıyla.
        </p>
      </Bolum>

      <Bolum baslik="1. Veri sorumlusu">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu
          (&quot;KVKK&quot;) uyarınca veri sorumlusu, ARKVIUM markasını
          işleten aşağıdaki işletmedir:
        </p>

        <Liste
          maddeler={[
            <>Marka: ARKVIUM</>,
            <>Web sitesi: https://arkvium.com</>,
            <>
              Resmî unvan:{" "}
              <YasinDoldurur alan="ticaret unvanı / şahıs firması adı" />
            </>,
            <>
              Açık adres: <YasinDoldurur alan="açık adres" />
            </>,
            <>
              Telefon: <YasinDoldurur alan="telefon" />
            </>,
            <>
              Kurumsal e-posta:{" "}
              <YasinDoldurur alan="kurumsal e-posta adresi" />
            </>,
            <>
              Vergi dairesi ve numarası:{" "}
              <YasinDoldurur alan="vergi dairesi ve vergi numarası" />
            </>,
            <>
              MERSİS numarası (varsa):{" "}
              <YasinDoldurur alan="MERSİS numarası" />
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="2. İşlenen kişisel veri kategorileri">
        <p>
          Aşağıdakiler, uygulamanın veritabanında fiilen tutulan veya
          işlenen alanlardır. Bu listede yer almayan hiçbir veri
          toplanmaz.
        </p>

        <p className="font-medium text-[#101a3d]">a) Hesap verileri</p>

        <Liste
          maddeler={[
            "E-posta adresi (zorunlu), ad-soyad ve telefon numarası (isteğe bağlı).",
            "Şifreniz düz metin olarak saklanmaz; yalnızca bcrypt özeti tutulur.",
            "Şifre sıfırlama ve e-posta doğrulama bağlantıları düz metin saklanmaz; yalnızca SHA-256 özetleri tutulur.",
            "Oturum geçerliliğini kontrol eden bir oturum sürüm sayacı.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          b) Sipariş ve teslimat verileri
        </p>

        <Liste
          maddeler={[
            "Ad-soyad, e-posta, telefon, adres satırı, ilçe, il ve posta kodu.",
            "Sipariş kalemleri, adetler, tutarlar, sipariş durumu ve sipariş geçmişi kayıtları.",
            "Hangi hukuki belgenin hangi sürümünü onayladığınız ve onay zamanı.",
            <>
              <strong>Kimlik numarası.</strong> Ödeme sağlayıcısının
              zorunlu tuttuğu bu alan sipariş formunda istenir ve{" "}
              <strong>
                yalnızca ödeme işleminin gerçekleştirilmesi amacıyla
                iyzico&apos;ya iletilir
              </strong>
              . Kodda doğrulanan kapsam: değer sağlayıcıya gönderilen
              ödeme isteğinin alıcı bilgisine konur; ARKVIUM
              veritabanında <strong>hiçbir tabloda saklanmaz</strong>,
              hiçbir log kaydına yazılmaz ve başka hiçbir amaçla
              kullanılmaz.
            </>,
            <>
              Kart bilgileri ARKVIUM sunucularına <strong>hiç gelmez</strong>.
              Kart verisi yalnızca ödeme sağlayıcısının kendi sayfasında
              girilir ve ARKVIUM tarafından saklanmaz.
            </>,
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          c) Ürün kaydı ve QR etiketi verileri
        </p>

        <Liste
          maddeler={[
            "Kaydettiğiniz eşyaya ilişkin ad, açıklama, kategori ve durum bilgisi.",
            "Kayda bağladığınız iletişim bilgileri (ad, telefon, e-posta).",
            "QR etiketinizin durumu, hangi ürüne bağlı olduğu ve aktivasyon zamanı.",
            "Etiket geçmişi: aktivasyon, ürün değişimi, devir, pasife alma ve iptal işlemleri.",
            "Ürün sahipliğini başka bir kullanıcıya devrettiğinizde davetin gönderildiği e-posta adresi.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          d) QR kodu tarayan kişilerin verileri
        </p>

        <Liste
          maddeler={[
            "Eşyanızı bulan kişinin gönderdiği mesajda verdiği ad, telefon, isteğe bağlı e-posta, konum ve mesaj metni.",
            "Bu veriler eşya sahibine iletilmek üzere işlenir (bkz. bölüm 9).",
          ]}
        />

        <p className="font-medium text-[#101a3d]">
          e) Acil Durum Profili — isteğe bağlı, açık rızaya bağlı
        </p>

        <p>
          Aşağıdakiler, özelliğin kodda doğrulanan davranışıdır:
        </p>

        <Liste
          maddeler={[
            <>
              <strong>İsteğe bağlıdır.</strong> Kullanmayı seçmezseniz bu
              kategoride hiçbir veri işlenmez.
            </>,
            <>
              <strong>Varsayılan olarak kapalıdır.</strong> Profilin
              kendisi ve her bir alanın görünürlüğü ayrı ayrı kapalı
              başlar; hiçbiri siz açmadan yayına girmez.
            </>,
            <>
              <strong>Ayrı bir açık rıza adımına bağlıdır.</strong> Rıza
              zamanı ve onaylanan metnin sürümü kaydedilir. Metnin sürümü
              değişirse eski rızayla verilen profil otomatik olarak
              yayından kalkar; yeniden yayına almak için yeni rıza
              gerekir.
            </>,
            <>
              <strong>AES-256-GCM ile şifrelenir.</strong> Beyan edilen
              tüm alanlar (kan grubu dâhil) uygulama katmanında
              şifrelenerek saklanır; veritabanında düz metin sağlık
              verisi bulunmaz.
            </>,
            <>
              <strong>Rıza geri çekilebilir.</strong> Geri çektiğinizde
              profil yayından kalkar; bağlı olduğu ürün kaydı silinirse
              profil de birlikte silinir.
            </>,
          ]}
        />

        <p>
          Kullanmayı seçerseniz beyan ettiğiniz kan grubu, alerjiler,
          kullanılan ilaçlar, sağlık durumu, acil durum notu ve acil durum
          yakınlarının ad ile telefonu işlenir.
        </p>

        <p>
          Bu veriler KVKK m.6 anlamında <strong>özel nitelikli</strong>{" "}
          kişisel veri niteliğindedir. Bu kategorinin işlenmesine ilişkin
          hukuki değerlendirme ve alınan açık rızanın usulüne uygunluğu bu
          metinde tahmin edilmemiştir:
        </p>

        <Liste
          maddeler={[
            <>
              Özel nitelikli veri işlemenin şartları ve sınırları:{" "}
              <HukukOnayi konu="sağlık verilerinin işlenmesi" />
            </>,
            <>
              Açık rızanın alınma yöntemi, metni ve geri alınma usulü:{" "}
              <HukukOnayi konu="açık rıza yöntemi" />
            </>,
          ]}
        />

        <p className="font-medium text-[#101a3d]">f) Teknik veriler</p>

        <Liste
          maddeler={[
            <>
              IP adresiniz <strong>ham hâlde saklanmaz</strong>. Yalnızca
              kötüye kullanımı sınırlamak amacıyla HMAC-SHA256 özeti
              tutulur; bu özetten IP adresi geri elde edilemez.
            </>,
            <>
              Analitik kayıtlarında IP adresi, tarayıcı parmak izi,
              user-agent, e-posta, telefon veya adres{" "}
              <strong>bulunmaz</strong> (bkz. bölüm 8).
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. İşleme amaçları">
        <Liste
          maddeler={[
            "Hesabınızı oluşturmak, girişinizi sağlamak, e-posta adresinizi doğrulamak ve oturumunuzu güvenli tutmak.",
            <>
              Siparişinizi almak, ödemesini tahsil etmek, hazırlamak ve
              kargoya vermek. Ürünler: {SIPARIS_URUNLERI.map((u) => u.ad).join(", ")}.
            </>,
            "Sipariş onayı, e-posta doğrulama, şifre sıfırlama ve sahiplik devri gibi işlem e-postalarını göndermek.",
            "Hangi hukuki belgenin hangi sürümünü onayladığınızı kanıt olarak saklamak.",
            "QR etiketlerinizi ürünlerinize bağlamak, aktivasyonunu ve sahiplik devrini yönetmek.",
            "Eşyanızı bulan kişinin, sizin iletişim bilgileriniz açıkça gösterilmeden size ulaşmasını sağlamak.",
            "Açık rıza vermeniz hâlinde, beyan ettiğiniz acil durum bilgilerini QR sayfasında göstermek.",
            "Çerez bildiriminde kabul etmeniz hâlinde ziyaret ve ürün ilgisi istatistiği üretmek.",
            "Hizmetin kötüye kullanılmasını sınırlamak (hız sınırlama) ve stok kilitlenmesini önlemek.",
          ]}
        />
      </Bolum>

      <Bolum baslik="4. Toplama yöntemi ve hukuki sebepler">
        <p className="font-medium text-[#101a3d]">Toplama yöntemi</p>

        <Liste
          maddeler={[
            "Kayıt, giriş, ürün kaydı, sipariş ve acil durum formlarına kendiniz girdiğiniz bilgiler.",
            "QR kodu tarayan kişinin bildirim formuna girdiği bilgiler.",
            "Çerez onayı verdiyseniz, site kullanımınız sırasında tarayıcınızdan otomatik olarak üretilen anonim ziyaret kayıtları.",
            "Ödeme sağlayıcısından dönen ödeme sonucu bilgisi (tutar, durum, sağlayıcı referansı).",
          ]}
        />

        <p className="font-medium text-[#101a3d]">Hukuki sebepler</p>

        <p>
          Her işleme amacının KVKK m.5 ve m.6 kapsamında hangi hukuki
          sebebe dayandığı hukuki değerlendirme gerektirir ve bu metinde
          tahmin edilmemiştir: <HukukOnayi konu="amaç bazında hukuki sebep eşleşmesi" />
        </p>

        <p>
          Kodda kesin olan nokta şudur: Acil Durum Profili verileri açık
          rıza alınmadan işlenmez, rıza zamanı ile onaylanan metnin
          sürümü kaydedilir ve rıza geri çekildiğinde işleme durur.
          Rızanın hangi usulle alınacağı ve metninin içeriği ise hukuki
          değerlendirme gerektirir:{" "}
          <HukukOnayi konu="açık rıza yöntemi ve metni" />
        </p>
      </Bolum>

      <Bolum baslik="5. Verilerin aktarıldığı hizmet sağlayıcı grupları">
        <p>
          Aşağıdaki liste, uygulamanın bağımlılıklarından ve ortam
          yapılandırmasından doğrulanmıştır. Bu sağlayıcılar dışında
          hiçbir tarafa veri aktarılmaz; reklam ağlarına veya veri
          simsarlarına aktarım yapılmaz.
        </p>

        <Liste
          maddeler={[
            <>
              <strong>Barındırma ve altyapı (Vercel)</strong> — uygulamanın
              çalıştırılması. Sunucu tarafında işlenen tüm istekler bu
              altyapı üzerinden geçer.
            </>,
            <>
              <strong>Veritabanı (Supabase — PostgreSQL)</strong> — bölüm
              2&apos;de sayılan kayıtların saklandığı yer.
            </>,
            <>
              <strong>Ödeme hizmeti (iyzico)</strong> — ad-soyad, e-posta,
              telefon, adres, sipariş tutarı ve sağlayıcının zorunlu
              tuttuğu kimlik numarası ödeme adımında iletilir. Kart
              bilgileriniz doğrudan iyzico tarafından alınır ve ARKVIUM
              tarafından görülmez.
            </>,
            <>
              <strong>E-posta gönderimi (Google — Gmail SMTP)</strong> —
              işlem e-postalarının iletilmesi için alıcı e-posta adresi ve
              mesaj içeriği.
            </>,
            <>
              <strong>Kargo hizmeti</strong> — teslimat için ad-soyad,
              telefon ve adres. Firma:{" "}
              <YasinDoldurur alan="kargo firması unvanı" />
            </>,
          ]}
        />

        <p>
          Yönetici bildirimleri için web push kullanıldığında, bildirim
          yalnızca sipariş numarası ve tutar taşır; müşteri bilgisi push
          gövdesine konmaz.
        </p>
      </Bolum>

      <Bolum baslik="6. Yurt dışına veri aktarımı">
        <p>
          Yukarıdaki sağlayıcıların bir kısmı hizmetlerini yurt dışındaki
          sunucular üzerinden sunabilir. Hangi sağlayıcının verileri hangi
          bölgede işlediği ve bu aktarımın KVKK m.9 kapsamında hangi
          şartla yapılacağı hukuki ve teknik değerlendirme gerektirir:
        </p>

        <Liste
          maddeler={[
            <>
              Sağlayıcıların veri işleme bölgeleri:{" "}
              <YasinDoldurur alan="Supabase, Vercel, iyzico ve Gmail için seçilen bölgeler" />
            </>,
            <>
              Aktarımın hukuki dayanağı ve gereken taahhütnameler:{" "}
              <HukukOnayi konu="yurt dışına aktarım şartı" />
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="7. Saklama ve silme yaklaşımı">
        <p>
          Kod düzeyinde kesin olarak tanımlı tek süre analitik
          kayıtlarına aittir: analitik olayları{" "}
          <strong>{ANALITIK_SAKLAMA_GUNU} gün</strong> sonra otomatik
          olarak silinir.
        </p>

        <p>Kodda doğrulanan diğer davranışlar:</p>

        <Liste
          maddeler={[
            "Sipariş ve ödeme kayıtları mali ve hukuki kayıt niteliği taşır; uygulama içinde silinmez. Sipariş iptali, kayıt silinerek değil durum değiştirilerek yapılır.",
            "Hesabınız silinirse siparişiniz korunur, yalnızca hesapla bağı kopar.",
            "Acil Durum Profili, bağlı olduğu ürün kaydı silindiğinde birlikte silinir. Rızanızı geri çektiğinizde profil yayından kalkar.",
            "Süresi dolmuş QR rezervasyonları otomatik olarak temizlenir.",
            "Hız sınırlama sayaçları süresi dolduğunda temizlenir.",
          ]}
        />

        <p>
          Veri kategorisi bazında kesin saklama süreleri (özellikle
          sipariş, ödeme, hesap ve ürün kaydı için mevzuatın öngördüğü
          süreler):{" "}
          <YasinDoldurur alan="veri kategorisi bazında saklama süreleri" />{" "}
          <HukukOnayi konu="yasal saklama sürelerinin belirlenmesi" />
        </p>
      </Bolum>

      <Bolum baslik="8. Çerezler ve onaya bağlı analitik">
        <p>
          Zorunlu çerezler sitenin çalışması için gereklidir: oturum
          çerezi, dil tercihi ve çerez kararınızın kendisi.
        </p>

        <p>
          <strong>
            Analitik çerezler yalnızca açık onayınızla oluşturulur.
          </strong>{" "}
          Çerez bildiriminde reddederseniz analitik çerez tarayıcınıza
          yazılmaz ve hiçbir analitik kayıt üretilmez. Daha önce kabul
          edip sonradan reddederseniz oluşmuş analitik çerezler silinir.
        </p>

        <p>Onay verdiğinizde kaydedilen olaylar yalnızca şunlardır:</p>

        <Liste
          maddeler={[
            "Sayfa görüntüleme ve ürün görüntüleme",
            "Sepete ekleme ve sepetten çıkarma",
            "Ödeme başlatma, başarısız ödeme ve doğrulanmış satın alma",
          ]}
        />

        <p>
          Bu kayıtlarda kimliğiniz yer almaz. Oturum açmamışsanız yalnızca
          rastgele üretilmiş, kişiyle ilişkilendirilmeyen bir ziyaretçi ve
          ziyaret kimliği tutulur. Oturum açmışsanız kayıt yalnızca
          hesabınızla ilişkilendirilir ve ayrıca anonim bir takip kimliği
          oluşturulmaz.
        </p>

        <p>
          Çerezlerin adı, amacı, süresi, sağlayıcısı ve türü{" "}
          <Link
            href={CEREZ_POLITIKASI_YOLU}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Çerez Politikası
          </Link>{" "}
          sayfasındadır. Tercihinizi istediğiniz zaman
          değiştirebilirsiniz.
        </p>

        <p>
          ARKVIUM üçüncü taraf analitik veya reklam çerezi kullanmaz;
          sayfalara dışarıdan takip betiği yüklenmez.
        </p>
      </Bolum>

      <Bolum baslik="9. QR kodu tarayan ziyaretçiler ve mesaj gönderen kişiler">
        <p>
          QR etiketini tarayan kişiden hesap açması veya kimliğini
          doğrulaması istenmez. Etiketin açtığı sayfa, eşya sahibinin
          telefon numarasını ve e-posta adresini açıkça göstermez.
        </p>

        <p>
          Bulan kişi bildirim formunu doldurursa, formda beyan ettiği ad,
          telefon, isteğe bağlı e-posta, konum ve mesaj metni kaydedilir
          ve eşya sahibine iletilir. Bu bilgileri gönderen kişi kendisi
          beyan eder; ARKVIUM bunları başka bir kaynaktan toplamaz.
        </p>

        <p>
          Etiket pasife alınmış, iptal edilmiş veya henüz bir ürüne
          bağlanmamışsa bildirim formu gösterilmez ve ürün bilgisi
          sızdırılmaz. Etiket sayfaları hiçbir ara katmanda
          önbelleklenmez; sahibi bir bilgiyi yayından kaldırdığında bilgi
          anında görünmez olur.
        </p>

        <p>
          Bulan kişi olarak gönderdiğiniz mesaja ilişkin haklarınızı
          kullanmak için bölüm 11&apos;deki başvuru yöntemini
          kullanabilirsiniz.
        </p>
      </Bolum>

      <Bolum baslik="10. KVKK kapsamındaki haklarınız">
        <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>

        <Liste
          maddeler={[
            "Kişisel verinizin işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme.",
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
          Bazı hakları başvuru beklemeden, doğrudan uygulama içinden
          kullanabilirsiniz: ürün kayıtlarınızı düzenleyebilir,
          etiketlerinizi pasife alabilir, Acil Durum Profilinizi
          kapatabilir ve açık rızanızı geri çekebilir, şifrenizi
          değiştirebilir, tüm oturumlarınızı kapatabilir ve çerez
          tercihinizi değiştirebilirsiniz.
        </p>
      </Bolum>

      <Bolum baslik="11. Veri sorumlusuna başvuru yöntemi">
        <p>
          Haklarınızı kullanmak için aşağıdaki kanaldan başvurabilirsiniz.
          Başvurunuz, KVKK ve ilgili tebliğde öngörülen süre içinde
          yanıtlanır.
        </p>

        <Liste
          maddeler={[
            <>
              Başvuru adresi ve yöntemi:{" "}
              <YasinDoldurur alan="KVKK başvuru adresi ve kabul edilen başvuru yöntemleri" />
            </>,
            <>
              Başvuruda istenecek bilgi ve belgeler ile kimlik doğrulama
              yöntemi: <HukukOnayi konu="başvuru usulü" />
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="12. Yürürlük ve sürüm">
        <Liste
          maddeler={[
            <>Sürüm: {BELGE.surum}</>,
            <>
              Yürürlük tarihi:{" "}
              <YasinDoldurur alan="metnin yayımlanacağı tarih" />
            </>,
          ]}
        />

        <p>
          Bu metin değiştiğinde sürüm numarası artırılır. Sipariş
          sırasında hangi sürümü onayladığınız sipariş kaydınızla birlikte
          saklanır, böylece geçmiş onaylar hangi metne verildiği belli
          olur.
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
