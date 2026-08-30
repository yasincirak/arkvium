/**
 * Baskı ve okuma doğrulama kontrol listesi.
 *
 * Ekranda görünen ölçüler doğru olsa bile gerçek baskı yazıcıya, kâğıda ve
 * kesime bağlıdır. Bu liste, bir parti basıma gönderilmeden önce yapılması
 * gerekenleri sıralar. Yalnızca bilgi gösterir; hiçbir veri okumaz.
 */

const BASKI_ADIMLARI = [
  "Yazdırma kutusunda kâğıt A4, ölçek %100, “sayfaya sığdır” kapalı olsun.",
  "Önce 1 sayfa deneme bas. Doğrudan yazıcıya bas; PDF üzerinden basacaksan PDF'i de %100 ölçekle aç.",
  "Cetvelle ölç: bir etiket kutusu tam 30 mm olmalı. 29 veya 31 mm çıkıyorsa ölçek %100 değildir, düzeltmeden devam etme.",
  "QR'ın çevresindeki beyaz boşluğa hiçbir çizgi, yazı veya kesim payı girmemeli.",
  "Kesimi gri çizginin tam üzerinden yap. İçeriden kesersen sessiz alan daralır ve okuma bozulur.",
  "Mat kâğıt veya mat etiket kullan. Parlak yüzey flaşta yansıma yapıp okumayı engelliyor.",
  "Toner/mürekkep tasarruf kipini kapat. Açık gri basılan QR modülleri okunmuyor.",
];

const OKUMA_ADIMLARI = [
  "En az 3 farklı telefonla dene: 1 iPhone, 1 Android, 1 de eski/düşük kameralı cihaz.",
  "Her telefonda yerleşik kamera uygulamasıyla oku — ayrı QR uygulaması kurma. Müşteri de kamerayı kullanacak.",
  "Normal iç mekân ışığında, yaklaşık 10–15 cm mesafeden oku.",
  "Loş ışıkta ve doğrudan güneş altında tekrar dene.",
  "Etiketi eğimli tut (yaklaşık 30 derece) ve yine okunuyor mu bak.",
  "Etiketi yapıştırılacağı gerçek yüzeye (kavisli şişe, anahtarlık, valiz) yapıştırıp tekrar oku.",
  "Açılan adresin /t/ ile başladığını ve doğru etiket sayfasını getirdiğini doğrula.",
  "Rastgele 3 etiket seç; üçü de FARKLI sayfalara gitmeli. Aynı sayfa açılıyorsa baskıda hata var.",
];

function Liste({
  baslik,
  adimlar,
  numaraOneki,
}: {
  baslik: string;
  adimlar: string[];
  numaraOneki: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{baslik}</h3>

      <ol className="mt-3 space-y-2">
        {adimlar.map((adim, sira) => (
          <li key={adim} className="flex gap-3 text-sm leading-relaxed">
            <span className="mt-0.5 shrink-0 font-mono text-xs text-white/30">
              {numaraOneki}
              {sira + 1}
            </span>

            <span className="text-white/60">{adim}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function BaskiKontrolListesi() {
  return (
    <details className="rounded-2xl border border-white/10 bg-white/5">
      <summary className="cursor-pointer list-none px-6 py-4 text-sm font-semibold text-white marker:content-none">
        Baskı ve okuma kontrol listesi
        <span className="ml-2 font-normal text-white/40">
          — bir parti basıma gitmeden önce
        </span>
      </summary>

      <div className="space-y-6 border-t border-white/10 px-6 py-5">
        <Liste
          baslik="Baskı öncesi"
          adimlar={BASKI_ADIMLARI}
          numaraOneki="B"
        />

        <Liste
          baslik="Okuma testi — en az 3 farklı telefon"
          adimlar={OKUMA_ADIMLARI}
          numaraOneki="O"
        />

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
          <strong>Üç telefonun üçünde de okunmayan bir parti basıma
          gönderilmez.</strong>{" "}
          Tek telefonda okunmaması yeterlidir: sorun etiketin kendisinde,
          telefonda değil.
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/55">
          <p className="font-semibold text-white/80">
            Daha önce üretilmiş etiketlerin CSV&apos;si elinizdeyse
          </p>

          <p className="mt-1">
            O dosyayı buraya veya başka bir sunucuya <strong>yüklemeyin</strong>
            . Aktivasyon kodları veritabanında saklanmaz; bir sunucuya
            yüklenmeleri, tek gösterimlik olmalarının anlamını ortadan kaldırır.
          </p>

          <p className="mt-2">
            Güvenli yöntem: CSV&apos;yi çevrimdışı bir bilgisayarda elektronik
            tabloda açın, QR adresi sütunundan bu sayfadaki ölçülerle
            (30&nbsp;mm kutu, 4 modül sessiz alan, %100 ölçek) yerel bir
            birleştirme/baskı belgesi hazırlayın ve doğrudan yazdırın. Dosya
            hiçbir zaman ağa çıkmaz.
          </p>
        </div>
      </div>
    </details>
  );
}
