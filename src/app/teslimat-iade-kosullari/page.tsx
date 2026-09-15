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
 * Teslimat, İptal ve İade Koşulları.
 *
 * ────────────────────────────────────────────────────────────
 * KODDA DOĞRULANAN GERÇEK DURUM
 *
 * Metin, uygulamanın BUGÜNKÜ yeteneklerine göre yazılmıştır. Var
 * olmayan bir özellik varmış gibi anlatılmaz:
 *
 *   - Sipariş durumları: pending, paid, preparing, shipped, cancelled,
 *     failed (prisma/schema.prisma).
 *   - Yönetici YALNIZCA `paid → preparing → shipped` geçişini
 *     yapabilir (src/lib/siparis-yonetim.ts). Başka geçiş kabul
 *     edilmez.
 *   - `cancelled` durumu enum'da tanımlı ve arayüzde gösteriliyor
 *     ancak HİÇBİR kod yolu bunu bir siparişe yazmıyor: uygulamada
 *     sipariş iptali işlevi YOK.
 *   - Kullanıcı için iptal veya iade başlatma ekranı/ucu YOK.
 *   - Otomatik geri ödeme (refund) kodu YOK.
 *   - `Order` modelinde kargo takip numarası ve kargo firması alanı
 *     YOK; yalnızca `shippedAt` (kargoya verilme anı) ve
 *     `shippingKurus` (kargo ücreti) var.
 *   - Kullanıcıya giden tek sipariş e-postası sipariş onayıdır;
 *     iptal, kargo veya iade bildirimi e-postası YOK.
 *
 * Bu boşluklar metinde gizlenmez; iletişim kanalı doldurulacak olarak
 * bırakılır.
 * ────────────────────────────────────────────────────────────
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
      <Bolum baslik="1. Kapsam">
        <p>
          Bu politika, ARKVIUM (https://arkvium.com) üzerinden verilen
          siparişlerin teslimatını, iptalini ve iadesini düzenler.
          Kapsadığı ürünler:{" "}
          {SIPARIS_URUNLERI.map((urun) => urun.ad).join(", ")}.
        </p>

        <p>
          Bu koşullar{" "}
          <Link
            href={HUKUKI_BELGELER.mesafeliSatis.yol}
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            Mesafeli Satış Sözleşmesi
          </Link>
          &apos;nin ayrılmaz parçasıdır ve sipariş sırasında ayrıca
          onayınıza sunulur.
        </p>
      </Bolum>

      <Bolum baslik="2. Siparişin alınması ve ödeme onayı">
        <p>Kodda doğrulanan işleyiş:</p>

        <Liste
          maddeler={[
            <>
              Sipariş verildiğinde kayıt{" "}
              <strong>&quot;ödeme bekleniyor&quot;</strong> durumunda
              oluşur ve gereken QR etiketleri siparişe geçici olarak
              ayrılır.
            </>,
            <>
              Ödeme iyzico üzerinden alınır. Sipariş,{" "}
              <strong>yalnızca ödeme kuruluşundan gelen doğrulama</strong>{" "}
              sonucunda &quot;ödendi&quot; sayılır; doğrulanan tutar ve
              para birimi siparişle karşılaştırılır.
            </>,
            <>
              Ödeme başarısız olursa sipariş{" "}
              <strong>&quot;başarısız&quot;</strong> olarak işaretlenir ve
              ayrılan etiketler stoğa döner.
            </>,
            <>
              Ödeme tamamlanmazsa ayrılan etiketler belirli bir süre sonra
              kendiliğinden stoğa döner; bu durumda satış hiç gerçekleşmiş
              olmaz.
            </>,
            <>
              Ödeme onaylandığında size <strong>sipariş onayı
              e-postası</strong> gönderilir ve sipariş durumunuzu
              izleyebileceğiniz bir takip bağlantısı iletilir.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Siparişin hazırlanması">
        <p>
          Ödemesi onaylanan sipariş, yönetici tarafından{" "}
          <strong>&quot;hazırlanıyor&quot;</strong> durumuna alınır. Bu
          aşamada ürününüz üzerindeki benzersiz QR kod ile birlikte
          hazırlanır.
        </p>

        <p>
          Sipariş hazırlama süresi:{" "}
          <YasinDoldurur alan="sipariş hazırlama süresi (iş günü)" />
        </p>
      </Bolum>

      <Bolum baslik="4. Kargoya teslim">
        <p>
          Hazırlanan sipariş kargoya verildiğinde{" "}
          <strong>&quot;kargoya verildi&quot;</strong> durumuna geçer ve
          kargoya verilme anı sipariş kaydına yazılır.
        </p>

        <p>
          Uygulamada <strong>kargo takip numarası alanı bulunmamaktadır</strong>;
          takip numarası sistem üzerinden gösterilmez. Takip bilgisinin
          size hangi kanaldan iletileceği:{" "}
          <YasinDoldurur alan="kargo takip bilgisinin iletim yöntemi" />
        </p>

        <p>
          Anlaşmalı kargo firması:{" "}
          <YasinDoldurur alan="kargo firması unvanı" />
        </p>
      </Bolum>

      <Bolum baslik="5. Tahmini teslimat">
        <Liste
          maddeler={[
            <>
              Tahmini teslimat süresi:{" "}
              <YasinDoldurur alan="tahmini teslimat süresi (iş günü)" />
            </>,
            <>
              Teslimat yapılan bölgeler:{" "}
              <YasinDoldurur alan="teslimat yapılan bölgeler" />
            </>,
          ]}
        />

        <p>
          Teslimat süreleri tahminidir. Kargo firmasının yoğunluğu,
          olumsuz hava koşulları ve resmî tatiller süreyi uzatabilir.
        </p>
      </Bolum>

      <Bolum baslik="6. Kargo ücreti">
        <p>
          Kargo ücreti sabittir:{" "}
          <strong>{fiyatBicimle(KARGO_UCRETI_KURUS)}</strong>. Uygulamada
          ücretsiz kargo eşiği bulunmamaktadır. Tutar sipariş ve ödeme
          adımında ayrıca gösterilir ve sipariş kaydında ayrı bir alan
          olarak saklanır.
        </p>

        <p>
          Kargo ücreti politikası ve varsa istisnalar:{" "}
          <YasinDoldurur alan="kargo ücreti politikası ve ücretsiz kargo şartları" />
        </p>
      </Bolum>

      <Bolum baslik="7. Teslimat adresi ve teslim alan kişi">
        <p>
          Teslimat, sipariş formunda beyan ettiğiniz adrese yapılır. Adres
          bilgisi sipariş anındaki hâliyle kaydedilir; sipariş verildikten
          sonra uygulama üzerinden değiştirilemez. Adres değişikliği
          talebiniz için bölüm 19&apos;daki iletişim kanalını kullanın.
        </p>

        <p>
          Gönderi, adreste bulunan ve teslim almaya yetkili bir kişiye
          teslim edilebilir. Adresin doğru ve eksiksiz beyan edilmesi
          alıcının sorumluluğundadır.
        </p>
      </Bolum>

      <Bolum baslik="8. Teslim edilemeyen siparişler">
        <p>
          Adreste bulunulmaması, adresin hatalı olması veya gönderinin
          teslim alınmaması hâlinde kargo firması gönderiyi iade edebilir.
        </p>

        <p>
          Bu durumda izlenecek yol, yeniden gönderim koşulları ve doğacak
          kargo masrafının kime ait olacağı:{" "}
          <YasinDoldurur alan="teslim edilemeyen gönderilerde izlenecek süreç" />{" "}
          <HukukOnayi konu="teslim edilememe hâlinde masraf ve sorumluluk dağılımı" />
        </p>
      </Bolum>

      <Bolum baslik="9. Hasarlı, eksik veya yanlış ürün">
        <p>
          Gönderiyi teslim alırken kutuyu kontrol etmenizi öneririz. Gözle
          görülür bir hasar varsa kargo görevlisine tutanak tutturmanız,
          süreci hızlandırır ve durumu belgelemenize yardımcı olur.
        </p>

        <p>
          Tutanak tutulmamış olması, ayıplı mala ilişkin kanuni
          haklarınızı kullanmanıza engel değildir. Ürün hasarlı, eksik
          veya siparişinizden farklı geldiyse bölüm 19&apos;daki iletişim
          kanalından bize ulaşın.
        </p>

        <p>
          Bildirim süresi ve istenecek belgeler (fotoğraf, tutanak vb.):{" "}
          <YasinDoldurur alan="hasarlı/eksik ürün bildirim süresi ve gerekli belgeler" />
        </p>
      </Bolum>

      <Bolum baslik="10. Kargo öncesi sipariş iptali">
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Mevcut durum:</strong> Uygulamada siparişi kendiniz
          iptal edebileceğiniz bir ekran{" "}
          <strong>bulunmamaktadır</strong>. Yönetim panelinde de sipariş
          iptal işlevi tanımlı değildir; sistem üzerinde yapılabilen tek
          ilerleme &quot;ödendi → hazırlanıyor → kargoya verildi&quot;
          yönündedir. İptal talepleri bu nedenle sistem dışında,
          iletişim kanalı üzerinden ele alınır.
        </p>

        <p>
          Ödemesi henüz tamamlanmamış sipariş geçerli hâle gelmez;
          ayrılan etiketler süresi dolunca kendiliğinden stoğa döner ve
          ayrıca bir işlem yapmanız gerekmez.
        </p>

        <p>
          Ödemesi alınmış bir siparişin kargoya verilmeden önce iptalini
          istiyorsanız:{" "}
          <YasinDoldurur alan="sipariş iptal iletişim kanalı" />
        </p>

        <p>
          İptal talebinin hangi süre içinde kabul edileceği ve ödemenin
          nasıl iade edileceği:{" "}
          <HukukOnayi konu="kargo öncesi iptalde iade usulü ve süresi" />
        </p>
      </Bolum>

      <Bolum baslik="11. Kargo sonrasında cayma bildirimi">
        <p>
          Mesafeli sözleşmelerde tüketicinin, gerekçe göstermeksizin ve
          cezai şart ödemeksizin sözleşmeden cayma hakkı bulunmaktadır.
          Cayma hakkı, aşağıdaki bölüm 17&apos;de anlatılan ayıplı mal
          haklarından <strong>farklı ve ondan bağımsız</strong> bir
          haktır.
        </p>

        <Liste
          maddeler={[
            <>
              Cayma hakkı süresi ve sürenin başlangıç anı:{" "}
              <HukukOnayi konu="cayma süresi ve başlangıcı" />
            </>,
            <>
              Cayma bildiriminin yapılacağı kanal ve şekil:{" "}
              <YasinDoldurur alan="cayma bildirimi iletişim kanalı" />
            </>,
          ]}
        />

        <p>
          Uygulamada cayma bildirimini kendiniz başlatabileceğiniz bir
          ekran bulunmamaktadır; bildirim yukarıdaki kanaldan yapılır.
        </p>
      </Bolum>

      <Bolum baslik="12. Ürünün geri gönderilmesi">
        <Liste
          maddeler={[
            <>
              İade gönderiminin yapılacağı adres:{" "}
              <YasinDoldurur alan="iade adresi" />
            </>,
            <>
              İade ile birlikte gönderilmesi gereken belgeler:{" "}
              <YasinDoldurur alan="iade için gerekli belgeler" />
            </>,
            <>
              İade kargo masrafının hangi tarafa ait olduğu:{" "}
              <YasinDoldurur alan="iade kargo masrafının tarafı" />{" "}
              <HukukOnayi konu="iade kargo masrafının hangi tarafa ait olacağı" />
            </>,
          ]}
        />

        <p>
          Ürünü, size ulaştığı hâliyle ve varsa aksesuarlarıyla birlikte
          göndermeniz iade incelemesini kolaylaştırır.
        </p>
      </Bolum>

      <Bolum baslik="13. İade incelemesi">
        <p>
          Geri gönderilen ürün tarafımıza ulaştığında, siparişle
          eşleştirilerek incelenir. İnceleme sonucunda iadenin kabul
          edilip edilmediği size bildirilir.
        </p>

        <p>
          Uygulamada iade sürecini izleyebileceğiniz bir ekran
          bulunmamaktadır; bilgilendirme bölüm 19&apos;daki iletişim
          kanalı üzerinden yapılır.
        </p>

        <p>
          İnceleme süresi ve iadenin reddedilebileceği hâller:{" "}
          <YasinDoldurur alan="iade inceleme süresi" />{" "}
          <HukukOnayi konu="iadenin reddedilebileceği hâller" />
        </p>
      </Bolum>

      <Bolum baslik="14. Geri ödeme yöntemi ve süresi">
        <p>
          Ödeme iyzico üzerinden alındığı için geri ödeme, ödemenin
          yapıldığı karta yansıtılır. Bankanızın yansıtma süresi
          ARKVIUM&apos;un denetiminde değildir.
        </p>

        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Mevcut durum:</strong> Uygulamada{" "}
          <strong>otomatik geri ödeme işlevi bulunmamaktadır</strong>. Geri
          ödemeler ödeme kuruluşu tarafında elle başlatılır.
        </p>

        <p>
          Geri ödemenin başlatılacağı süre:{" "}
          <YasinDoldurur alan="geri ödeme süresi" />{" "}
          <HukukOnayi konu="geri ödeme süresine ilişkin yasal yükümlülük" />
        </p>
      </Bolum>

      <Bolum baslik="15. QR kod aktivasyonu ve cayma hakkı">
        <p>
          Her ürünün üzerinde benzersiz bir QR kod ve yalnızca bir kez
          kullanılabilen bir aktivasyon kodu bulunur. Aktivasyon, ürün
          teslim alındıktan sonra kullanıcı tarafından ARKVIUM hesabı
          üzerinden yapılır; etiket bir ürün kaydına bağlanır.
        </p>

        <p>
          Aktivasyonun cayma hakkı üzerindeki etkisi{" "}
          <strong>bu metinde kesinleştirilmemiştir</strong>. Aktivasyonun
          cayma hakkını kaldırıp kaldırmayacağı, kaldırıyorsa hangi
          koşullarda kaldıracağı hukuki değerlendirme gerektirir:{" "}
          <HukukOnayi konu="QR aktivasyonunun cayma hakkına etkisi" />
        </p>

        <p>
          Aktive edilmiş bir etiketi istediğiniz zaman pasife alabilir,
          başka bir ürün kaydına taşıyabilir veya başka bir kullanıcıya
          devredebilirsiniz.
        </p>
      </Bolum>

      <Bolum baslik="16. Ambalajı açılmış veya yüzeye uygulanmış ürünler">
        <p>
          Ambalajın açılmış olması veya etiketin bir yüzeye uygulanmış
          olması, bu metinde <strong>kendiliğinden bir hak kaybı
          sayılmamaktadır</strong>. Bu hususların cayma hakkı üzerindeki
          etkisi ayrı ayrı hukuki değerlendirme gerektirir:
        </p>

        <Liste
          maddeler={[
            <>
              Ambalajın açılmasının etkisi:{" "}
              <HukukOnayi konu="ambalaj açılmasının cayma hakkına etkisi" />
            </>,
            <>
              Etiketin bir yüzeye uygulanmış olmasının etkisi:{" "}
              <HukukOnayi konu="etiketin yüzeye uygulanmasının etkisi" />
            </>,
          ]}
        />

        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Bu bölümdeki hiçbir husus, ayıplı mala ilişkin kanuni
          haklarınızı etkilemez. Ürün ayıplıysa, ambalajı açılmış veya
          kullanılmış olması bu haklarınızı ortadan kaldırmaz.
        </p>
      </Bolum>

      <Bolum baslik="17. Ayıplı mal hakları">
        <p>
          <strong>
            Bu bölüm cayma hakkından bağımsızdır ve cayma süresi geçmiş
            olsa dahi uygulanır.
          </strong>
        </p>

        <p>
          Teslim edilen ürünün ayıplı çıkması hâlinde 6502 sayılı
          Tüketicinin Korunması Hakkında Kanun uyarınca seçimlik
          haklarınız bulunur: sözleşmeden dönme, ayıp oranında bedel
          indirimi, ücretsiz onarım veya ayıpsız misliyle değişim.
        </p>

        <p>
          Başvuru süresi, zamanaşımı ve seçimlik hakların kullanım usulü:{" "}
          <HukukOnayi konu="ayıplı mal başvuru süresi ve usulü" />
        </p>

        <p>
          Varsa garanti koşulları ve garanti süresi:{" "}
          <YasinDoldurur alan="garanti koşulları ve süresi" />
        </p>
      </Bolum>

      <Bolum baslik="18. İade dışı bırakılabilecek ürünlere ilişkin hukuki uyarı">
        <p>
          Mevzuat, bazı ürün türlerinde cayma hakkının
          kullanılamayacağını öngörür. ARKVIUM ürünlerinin bu istisnalara
          girip girmediği <strong>bu metinde belirlenmemiştir</strong>.
        </p>

        <p>
          Özellikle, üzerinde benzersiz kod bulunan etiketlerin
          &quot;kişiye özel hazırlanan mal&quot; istisnası kapsamına
          girip girmediği ürün bazında değerlendirilmelidir:{" "}
          <HukukOnayi konu="kişiye özel mal istisnasının ürün bazında uygulanabilirliği" />
        </p>

        <p>
          Bir ürünün iade dışı olduğu, ancak hukuki değerlendirme
          sonucunda ve satın alma öncesinde açıkça bildirilmişse ileri
          sürülebilir.
        </p>
      </Bolum>

      <Bolum baslik="19. İletişim ve iade adresi">
        <p>
          İptal, iade, cayma bildirimi, hasarlı ürün ve teslimat sorunları
          için aşağıdaki kanallardan bize ulaşabilirsiniz.
        </p>

        <Liste
          maddeler={[
            <>
              Unvan:{" "}
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
              İade gönderim adresi:{" "}
              <YasinDoldurur alan="iade adresi" />
            </>,
            <>
              İade ve iptal talepleri için iletişim kanalı:{" "}
              <YasinDoldurur alan="iade ve iptal iletişim kanalı" />
            </>,
          ]}
        />

        <p>
          Uyuşmazlık hâlinde tüketici hakem heyetlerine veya tüketici
          mahkemelerine başvurabilirsiniz. Başvuru, kendi yerleşim
          yerinizdeki veya işlemin yapıldığı yerdeki yetkili mercie
          yapılabilir; başvuru hakkınız satıcının bulunduğu yerle sınırlı
          değildir.
        </p>
      </Bolum>

      <Bolum baslik="20. Yürürlük tarihi ve belge sürümü">
        <Liste
          maddeler={[
            <>Belge sürümü: {BELGE.surum}</>,
            <>
              Yürürlük tarihi:{" "}
              <YasinDoldurur alan="metnin yayımlanacağı tarih" />
            </>,
          ]}
        />

        <p>
          Bu metin değiştiğinde sürüm numarası artırılır. Sipariş
          sırasında onayladığınız sürüm, sipariş kaydınızla birlikte ayrı
          bir onay kaydında saklanır; sürüm artışı geçmiş siparişlerin
          onaylarını etkilemez.
        </p>
      </Bolum>
    </HukukiSayfa>
  );
}
