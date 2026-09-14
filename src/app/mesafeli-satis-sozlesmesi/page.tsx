import type { Metadata } from "next";
import Link from "next/link";
import HukukiSayfa, {
  Bolum,
  HukukOnayi,
  Liste,
  YasinDoldurur,
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
 * ────────────────────────────────────────────────────────────
 * TEK KAYNAK
 *
 * Ürün adı, QR adedi, birim fiyat ve kargo ücreti `@/lib/siparis`
 * kataloğundan okunur; sözleşmede elle yazılmaz. Katalog değişirse
 * sözleşme kendiliğinden güncellenir ve fiyat ile sözleşme birbirinden
 * ayrı düşemez.
 *
 * DİNAMİK SİPARİŞ VERİSİ YOKTUR: bu sayfa siparişe özel hiçbir
 * parametre almaz. Alıcı adı, adresi, seçtiği ürün, adet ve ödenen
 * tutar bu metne AKTARILMAZ; sipariş kayıtları `Order` / `OrderItem`
 * tablolarında, hangi sözleşme sürümünün onaylandığı ise
 * `OrderConsent` tablosunda ayrıca saklanır. Metinde bu durum
 * olduğu gibi anlatılır; aksi yazılmaz.
 *
 * İNDİRİM VE VERGİ ALANI YOKTUR: veri modelinde ara toplam, kargo ve
 * genel toplam dışında bir tutar alanı bulunmaz. Sözleşmede indirim
 * veya vergi kırılımı varmış gibi yazılmaz.
 * ────────────────────────────────────────────────────────────
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
      <Bolum baslik="1. Taraflar">
        <p className="font-medium text-[#101a3d]">Satıcı</p>

        <Liste
          maddeler={[
            <>Marka: ARKVIUM — https://arkvium.com</>,
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

        <p className="font-medium text-[#101a3d]">Alıcı</p>

        <p>
          ARKVIUM üzerinden sipariş veren gerçek kişidir. Alıcının ad-soyad,
          e-posta, telefon ve teslimat adresi bilgileri sipariş formunda
          beyan edilir ve sipariş kaydına <strong>o andaki hâliyle</strong>{" "}
          yazılır. Sipariş vermek için hesap açmak zorunlu değildir;
          misafir sipariş desteklenir.
        </p>
      </Bolum>

      <Bolum baslik="2. Sözleşmenin konusu">
        <p>
          Bu sözleşmenin konusu, Alıcı&apos;nın ARKVIUM üzerinden
          elektronik ortamda sipariş ettiği fiziksel QR ürününün satışı ve
          teslimi ile bu ürüne bağlı benzersiz QR kodun Alıcı tarafından
          etkinleştirilerek ARKVIUM dijital sahiplik hizmetinin
          kullanılmasıdır.
        </p>

        <p>
          Taraf&apos;ların bu sözleşmeden doğan hak ve yükümlülükleri,
          6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
          Sözleşmeler Yönetmeliği hükümlerine tabidir.
        </p>
      </Bolum>

      <Bolum baslik="3. Sözleşmenin kurulma zamanı">
        <p>
          Sözleşme, Alıcı&apos;nın sipariş ekranındaki onay kutusunu
          işaretleyip siparişi göndermesi ile elektronik ortamda kurulur.
          Onay kutusu işaretlenmeden sipariş oluşturulamaz.
        </p>

        <p>
          Onayladığınız sözleşme <strong>sürümü</strong>, sipariş kaydınızla
          birlikte ayrı bir onay kaydında saklanır. Böylece ileride metin
          değişse bile hangi sürüme onay verdiğiniz belirlenebilir.
        </p>

        <p>
          Siparişin verilmesi ödemenin tamamlandığı anlamına gelmez. Ödeme,
          ödeme kuruluşunun doğrulaması sonucunda kesinleşir (bkz. bölüm 5).
        </p>
      </Bolum>

      <Bolum baslik="4. Ürünlerin temel nitelikleri">
        <p>
          Aşağıdaki ürün listesi, QR adetleri ve birim fiyatlar uygulamanın
          ürün kataloğundan doğrudan okunmaktadır.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Benzersiz QR adedi</th>
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
          Her ürün, üzerinde benzersiz bir QR kod bulunan fiziksel bir
          etikettir. Her etiketin üzerinde, yalnızca bir kez kullanılabilen
          bir aktivasyon kodu yer alır.
        </p>

        <p>
          Ürünlerin fiziksel ölçüleri, malzemesi, dayanıklılığı ve
          kullanım koşulları:{" "}
          <YasinDoldurur alan="ürün bazında malzeme, ölçü ve kullanım bilgileri" />
        </p>
      </Bolum>

      <Bolum baslik="5. Sipariş ve ödeme bilgileri">
        <p className="font-medium text-[#101a3d]">Tutarın hesaplanması</p>

        <Liste
          maddeler={[
            <>
              Sipariş tutarı <strong>her zaman sunucuda</strong> ürün
              kataloğundan hesaplanır. Tarayıcıdan gönderilen fiyat, ara
              toplam, kargo veya toplam değeri kabul edilmez.
            </>,
            <>
              Sipariş kaydında tutulan tutar alanları şunlardır:{" "}
              <strong>ara toplam</strong>, <strong>kargo ücreti</strong> ve{" "}
              <strong>genel toplam</strong>. Her sipariş kalemi için ürün
              adı, adet, birim fiyat ve satır toplamı ayrıca saklanır.
            </>,
            <>
              Kargo ücreti sabittir:{" "}
              <strong>{fiyatBicimle(KARGO_UCRETI_KURUS)}</strong>. Ücretsiz
              kargo eşiği bulunmamaktadır.
            </>,
            <>
              Uygulamada <strong>indirim veya kupon alanı bulunmamaktadır</strong>;
              genel toplam, ara toplam ile kargo ücretinin toplamıdır.
            </>,
          ]}
        />

        <p>
          Fiyatlara KDV dâhil olup olmadığı ve varsa vergi kırılımının
          nasıl gösterileceği:{" "}
          <YasinDoldurur alan="KDV beyanı ve vergi gösterimi" />
        </p>

        <p className="font-medium text-[#101a3d]">Ödeme</p>

        <Liste
          maddeler={[
            "Ödeme, iyzico altyapısı üzerinden kredi/banka kartı ile alınır.",
            <>
              Kart bilgileri <strong>ARKVIUM sunucularına hiç gelmez</strong>;
              doğrudan iyzico&apos;nun kendi sayfasında girilir ve ARKVIUM
              tarafından saklanmaz.
            </>,
            <>
              Ödeme sağlayıcısının zorunlu tuttuğu kimlik numarası alanı
              yalnızca ödeme işlemi için iyzico&apos;ya iletilir; ARKVIUM
              veritabanında saklanmaz.
            </>,
            <>
              Sipariş, yalnızca sağlayıcıdan gelen doğrulama sonucunda
              ödendi sayılır. Doğrulanan tutar ve para birimi siparişle
              karşılaştırılır; uyuşmazsa sipariş ödendi sayılmaz.
            </>,
            <>
              Ödeme başarısız olursa sipariş için ayrılan QR etiketleri
              stoğa döner ve sipariş başarısız olarak işaretlenir.
            </>,
          ]}
        />

        <p>
          Taksit seçenekleri ve varsa vade farkı:{" "}
          <YasinDoldurur alan="taksit ve vade farkı bilgisi" />
        </p>

        <p className="font-medium text-[#101a3d]">
          Siparişinize özel bilgiler
        </p>

        <p>
          Bu sayfa tüm alıcılar için ortak metindir ve{" "}
          <strong>siparişinize özel bilgileri içermez</strong>. Seçtiğiniz
          ürün, adet, birim fiyat, ara toplam, kargo ücreti, genel toplam,
          teslimat adresiniz ve iletişim bilgileriniz sipariş kaydınızda
          saklanır ve sipariş ekranında onaylamadan önce size gösterilir.
          Sipariş özetinizin sözleşme metnine gömülü olarak size ayrıca
          iletilip iletilmeyeceği:{" "}
          <HukukOnayi konu="sipariş özetinin sözleşme metnine aktarılması yükümlülüğü" />
        </p>
      </Bolum>

      <Bolum baslik="6. Teslimat bilgileri">
        <p>
          Teslimat, Alıcı&apos;nın sipariş formunda beyan ettiği adrese
          yapılır. Ödeme onaylandıktan sonra sipariş hazırlanır ve kargoya
          verilir; sipariş durumunu ödeme sonrası size iletilen takip
          bağlantısından izleyebilirsiniz.
        </p>

        <Liste
          maddeler={[
            <>
              Kargo firması: <YasinDoldurur alan="kargo firması unvanı" />
            </>,
            <>
              Sipariş hazırlama süresi:{" "}
              <YasinDoldurur alan="hazırlama süresi (iş günü)" />
            </>,
            <>
              Tahmini teslimat süresi:{" "}
              <YasinDoldurur alan="teslimat süresi (iş günü)" />
            </>,
            <>
              Kargo ücreti politikası:{" "}
              <YasinDoldurur alan="kargo ücretinin kime ait olduğu ve varsa istisnalar" />
            </>,
            <>
              Teslimat yapılan bölgeler:{" "}
              <YasinDoldurur alan="teslimat bölgeleri" />
            </>,
          ]}
        />

        <p>
          Teslimat koşullarının ayrıntısı{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          sayfasında düzenlenmiştir ve bu sözleşmenin ayrılmaz parçasıdır.
        </p>
      </Bolum>

      <Bolum baslik="7. Satıcı ve Alıcı'nın hak ve yükümlülükleri">
        <p className="font-medium text-[#101a3d]">Satıcı</p>

        <Liste
          maddeler={[
            "Sözleşme konusu ürünü, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleriyle birlikte teslim etmekle yükümlüdür.",
            "Ürünün stokta bulunmaması hâlinde sipariş oluşturulmaz; ön sipariş alınmaz.",
            "Ödemesi alınmış siparişin durumunu Alıcı'nın izleyebilmesini sağlar.",
            "Alıcı'nın kişisel verilerini ilgili hukuki metinlerde açıklandığı şekilde işler.",
          ]}
        />

        <p className="font-medium text-[#101a3d]">Alıcı</p>

        <Liste
          maddeler={[
            "Sipariş formunda doğru ve eksiksiz bilgi vermekle yükümlüdür. Yanlış beyan edilen adres nedeniyle teslim edilemeyen gönderilerin sonuçları Alıcı'ya aittir.",
            "Ürünü teslim aldığında kontrol etmeli, gözle görülür hasar varsa kargo görevlisine tutanak tutturmalıdır.",
            "QR etiketinin üzerindeki aktivasyon kodunu üçüncü kişilerle paylaşmamalıdır; bu kod etiketin hesabına bağlanmasını sağlar.",
            "Hesap parolasını gizli tutmakla yükümlüdür.",
          ]}
        />
      </Bolum>

      <Bolum baslik="8. QR kod aktivasyonu ve dijital hizmet kapsamı">
        <p>Kodda doğrulanan işleyiş:</p>

        <Liste
          maddeler={[
            <>
              Her fiziksel etiketin üzerinde{" "}
              <strong>benzersiz bir QR kod</strong> ve{" "}
              <strong>yalnızca bir kez kullanılabilen bir aktivasyon
              kodu</strong> bulunur.
            </>,
            <>
              Etiket, aktivasyon kodunu bilen kullanıcı tarafından bir kez
              etkinleştirilir ve bir ürün kaydına bağlanır.
              Etkinleştirmek için ARKVIUM hesabı gerekir.
            </>,
            <>
              Etiket satın alındığında stoktan Alıcı&apos;nın siparişine
              ayrılır; ancak <strong>sahiplik yalnızca aktivasyonda</strong>,
              aktivasyon kodu doğrulandıktan sonra kurulur.
            </>,
            <>
              QR adresi veritabanı kimliği içermez; tahmin edilemeyen
              kriptografik bir belirteç kullanır.
            </>,
            <>
              Etiketi dilediğiniz zaman pasife alabilir, başka bir ürün
              kaydına taşıyabilir veya başka bir kullanıcıya
              devredebilirsiniz. Pasif etiket bildirim formu göstermez.
            </>,
            <>
              Etiketin açtığı sayfa, sahibin telefon numarasını ve e-posta
              adresini açıkça göstermez; bulan kişi form üzerinden
              iletişim kurar.
            </>,
          ]}
        />

        <p>
          Dijital hizmetin sunulma süresi, varsa kullanım sınırları ve
          hizmetin sonlandırılması hâlinde izlenecek yol:{" "}
          <YasinDoldurur alan="dijital hizmetin kullanım süresi ve varsa sınırları" />
        </p>
      </Bolum>

      <Bolum baslik="9. Alıcı'nın oluşturduğu içeriklerden sorumluluğu">
        <p>
          Alıcı, ürün kaydına girdiği ad, açıklama, kategori ve iletişim
          bilgilerinden; isteğe bağlı Acil Durum Profili&apos;ni
          kullanıyorsa orada beyan ettiği bilgilerden kendisi sorumludur.
        </p>

        <Liste
          maddeler={[
            "Girilen bilgilerin doğruluğu ve güncelliği Alıcı'ya aittir.",
            "Üçüncü kişilere ait bilgileri (örneğin acil durum yakınının adı ve telefonu) girmeden önce o kişileri bilgilendirmek Alıcı'nın sorumluluğundadır.",
            "Hukuka aykırı, başkasının hakkını ihlal eden veya yanıltıcı içerik girilmemelidir.",
          ]}
        />

        <p>
          ARKVIUM, Alıcı&apos;nın girdiği içeriği önceden denetlemez.
          İçerikten doğan sorumluluğun sınırları:{" "}
          <HukukOnayi konu="kullanıcı içeriğinden doğan sorumluluk sınırı" />
        </p>
      </Bolum>

      <Bolum baslik="10. Sistemin internet ve dış hizmet sağlayıcılara bağımlılığı">
        <p>
          ARKVIUM dijital hizmeti internet üzerinden sunulur ve üçüncü
          taraf altyapılara bağımlıdır: uygulama barındırma, veritabanı
          barındırma, ödeme hizmeti ve e-posta gönderimi.
        </p>

        <p>
          Bu altyapılarda oluşabilecek kesinti, gecikme veya arıza
          hizmetin geçici olarak kullanılamamasına yol açabilir. Alıcı,
          internet bağlantısının ve kullandığı cihazın kendi
          sorumluluğunda olduğunu kabul eder.
        </p>

        <p>
          Satıcı&apos;nın hizmet kesintileri, veri kaybı ve güvenlik
          olaylarına ilişkin sorumluluğunun kapsamı ve sınırları bu
          metinde kesinleştirilmemiştir; tüketici mevzuatının emredici
          hükümleri saklıdır:{" "}
          <HukukOnayi konu="hizmet kesintisi ve güvenlik olaylarında sorumluluk sınırı" />
        </p>
      </Bolum>

      <Bolum baslik="11. Cayma hakkı ve cayma bildirimi">
        <p>
          Mesafeli sözleşmelerde tüketicinin, gerekçe göstermeksizin ve
          cezai şart ödemeksizin sözleşmeden cayma hakkı bulunmaktadır.
        </p>

        <p>
          Bu hakkın süresi, başlangıç anı, bildirimin şekli ve iade
          masraflarının kime ait olacağı ilgili mevzuata göre
          belirlenmelidir:
        </p>

        <Liste
          maddeler={[
            <>
              Cayma hakkı süresi ve başlangıç anı:{" "}
              <HukukOnayi konu="cayma süresi ve başlangıcı" />
            </>,
            <>
              Cayma bildiriminin yapılacağı adres ve kanal:{" "}
              <YasinDoldurur alan="cayma bildirimi adresi ve iletişim kanalı" />
            </>,
            <>
              İade kargo masrafının kime ait olduğu ve geri ödeme süresi:{" "}
              <HukukOnayi konu="iade masrafı ve geri ödeme süresi" />
            </>,
          ]}
        />

        <p>
          Ayrıntılar{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          sayfasında düzenlenmiştir.
        </p>
      </Bolum>

      <Bolum baslik="12. Cayma hakkının istisnaları">
        <p>
          Mevzuat, bazı ürün ve hizmet türlerinde cayma hakkının
          kullanılamayacağını öngörür. ARKVIUM ürünlerinin bu istisnalara
          girip girmediği <strong>bu metinde kesinleştirilmemiştir</strong>{" "}
          ve her ürün için ayrı değerlendirme gerektirir.
        </p>

        <p>
          Aşağıdaki hususların hiçbiri bu sözleşmede kesin hüküm olarak
          düzenlenmemiştir; hukuki değerlendirme sonucuna göre
          belirlenecektir:
        </p>

        <Liste
          maddeler={[
            <>
              QR kodun etkinleştirilmiş olmasının cayma hakkına etkisi:{" "}
              <HukukOnayi konu="aktivasyonun cayma hakkına etkisi" />
            </>,
            <>
              Ambalajın açılmış olmasının iade hakkına etkisi:{" "}
              <HukukOnayi konu="ambalaj açılmasının etkisi" />
            </>,
            <>
              Etiketin bir yüzeye yapıştırılmış olmasının etkisi:{" "}
              <HukukOnayi konu="etiketin yapıştırılmasının etkisi" />
            </>,
            <>
              Ürünlerin &quot;kişiye özel hazırlanan mal&quot; istisnası
              kapsamına girip girmediği:{" "}
              <HukukOnayi konu="kişiye özel mal istisnasının uygulanabilirliği" />
            </>,
          ]}
        />

        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Bu bölümdeki hiçbir husus, Alıcı&apos;nın ayıplı mala ilişkin
          kanuni haklarını etkilemez. Cayma hakkı ile ayıplı mal hakları
          birbirinden farklıdır (bkz. bölüm 14).
        </p>
      </Bolum>

      <Bolum baslik="13. İade ve geri ödeme">
        <p>
          Cayma hakkının usulüne uygun kullanılması hâlinde ürün bedeli
          iade edilir. Ödeme iyzico üzerinden alındığı için geri ödeme,
          ödemenin yapıldığı karta yansıtılır; bankanın yansıtma süresi
          ARKVIUM&apos;un denetiminde değildir.
        </p>

        <Liste
          maddeler={[
            <>
              İade gönderiminin yapılacağı adres:{" "}
              <YasinDoldurur alan="iade adresi" />
            </>,
            <>
              İade talebi için iletişim kanalı:{" "}
              <YasinDoldurur alan="iade iletişim kanalı" />
            </>,
            <>
              İade ile birlikte gönderilmesi gereken belgeler:{" "}
              <YasinDoldurur alan="iade için gerekli belgeler" />
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="14. Ayıplı mal ve tüketicinin kanuni hakları">
        <p>
          <strong>
            Bu bölüm cayma hakkından bağımsızdır ve cayma süresi geçmiş
            olsa dahi uygulanır.
          </strong>
        </p>

        <p>
          Teslim edilen ürünün ayıplı çıkması hâlinde Alıcı, 6502 sayılı
          Kanun&apos;un öngördüğü seçimlik haklara sahiptir: sözleşmeden
          dönme, ayıp oranında bedel indirimi, ücretsiz onarım veya
          ayıpsız misliyle değişim.
        </p>

        <p>
          Ayıplı mala ilişkin başvuru süresi, zamanaşımı ve seçimlik
          hakların kullanım usulü:{" "}
          <HukukOnayi konu="ayıplı mal başvuru süresi ve usulü" />
        </p>

        <p>
          Varsa garanti koşulları ve garanti süresi:{" "}
          <YasinDoldurur alan="garanti koşulları ve süresi" />
        </p>
      </Bolum>

      <Bolum baslik="15. Şikâyet ve uyuşmazlık başvuruları">
        <p>
          Alıcı, sözleşmeden doğan uyuşmazlıklarda tüketici hakem
          heyetlerine veya tüketici mahkemelerine başvurabilir.
        </p>

        <p>
          Başvuru, <strong>Alıcı&apos;nın kendi yerleşim yerindeki</strong>{" "}
          veya tüketici işleminin yapıldığı yerdeki yetkili mercie
          yapılabilir. Başvuru hakkı Satıcı&apos;nın bulunduğu yerle
          sınırlı değildir.
        </p>

        <Liste
          maddeler={[
            <>
              Yetkili merciler ve yürürlükteki parasal sınırlar:{" "}
              <HukukOnayi konu="yetkili merciler ve parasal sınırlar" />
            </>,
            <>
              Satıcıya doğrudan şikâyet için iletişim kanalı:{" "}
              <YasinDoldurur alan="şikâyet iletişim kanalı" />
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="16. Yürürlük, sözleşme sürümü ve elektronik onay">
        <p>
          Bu sözleşme, Alıcı&apos;nın sipariş ekranındaki onay kutusunu
          işaretleyip siparişi göndermesiyle yürürlüğe girer ve taraflar
          arasında elektronik ortamda kurulmuş sayılır.
        </p>

        <Liste
          maddeler={[
            <>Sözleşme sürümü: {BELGE.surum}</>,
            <>
              Yürürlük tarihi:{" "}
              <YasinDoldurur alan="metnin yayımlanacağı tarih" />
            </>,
          ]}
        />

        <p>
          Onayladığınız sürüm, sipariş kaydınızla birlikte ayrı bir onay
          kaydında saklanır. Metin değiştiğinde sürüm numarası artırılır;
          böylece geçmişte verilen onayların hangi metne ait olduğu
          belirlenebilir. Sürüm artışı geçmiş siparişlerin onaylarını
          etkilemez.
        </p>

        <p>
          Sipariş sırasında onayınıza sunulan diğer belgeler:{" "}
          <Link
            href={HUKUKI_BELGELER.onBilgilendirme.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Ön Bilgilendirme Formu
          </Link>
          ,{" "}
          <Link
            href={HUKUKI_BELGELER.teslimatIade.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Teslimat, İptal ve İade Koşulları
          </Link>{" "}
          ve{" "}
          <Link
            href={HUKUKI_BELGELER.kvkkAydinlatma.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            KVKK Aydınlatma Metni
          </Link>
          .
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
