import { analitikRaporu, urunFiltresiCoz } from "@/lib/analitik-rapor";
import {
  aralikCoz,
  tarihMetniYaz,
  type Aralik,
} from "@/lib/analitik-aralik";
import { fiyatBicimle, SIPARIS_URUNLERI } from "@/lib/siparis";

/**
 * Analitik paneli (yönetim).
 *
 * YALNIZCA OKUR: hiçbir kaydı değiştirmez.
 *
 * Erişim iki kapıdan geçer: `src/middleware.ts` (imzalı oturum) ve
 * `src/app/admin/layout.tsx` (veritabanındaki ADMIN rolü). Bu sayfa
 * yalnızca rolü ADMIN olan kullanıcı için render edilir.
 *
 * Filtreler adres satırındaki parametrelerden okunur ve tamamı sunucuda
 * doğrulanır; geçersiz değer sessizce varsayılana düşer. İstemci tarafı
 * JavaScript gerekmez, form düz `GET` gönderir.
 *
 * KİŞİSEL VERİ GÖSTERİLMEZ: sayfada müşteri adı, e-postası, telefonu,
 * adresi veya IP'si yer almaz; yalnızca toplam sayılar bulunur.
 */

export const dynamic = "force-dynamic";

type Props = {
  searchParams: {
    aralik?: string;
    bas?: string;
    bit?: string;
    urun?: string;
  };
};

/** Filtre bağlantılarının ortak görünümü. */
function aralikSinifi(secili: boolean): string {
  return secili
    ? "rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-200"
    : "rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10";
}

function Kart({
  etiket,
  deger,
  not,
}: {
  etiket: string;
  deger: string;
  not?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wide text-white/40">{etiket}</p>

      <p className="mt-2 text-2xl font-bold text-white">{deger}</p>

      {not && <p className="mt-1 text-xs text-white/40">{not}</p>}
    </div>
  );
}

/**
 * Huni çubuğu.
 *
 * Genişlik ilk adıma göre oranlanır; ilk adım sıfırsa tüm çubuklar boş
 * gösterilir (sıfıra bölme yapılmaz).
 *
 * ÇUBUK VE METİN AYNI DEĞERDEN üretilir. Daha önce genişlik %100'e
 * kırpılıyor ama metin kırpılmıyordu; ikisi birbirinden ayrılabiliyordu.
 * Huni adımları artık kümelenerek sayıldığı için oran zaten %100'ü
 * aşamaz — buradaki kırpma yine de ikinci bir kapı olarak duruyor.
 */
function HuniSatiri({
  etiket,
  deger,
  taban,
}: {
  etiket: string;
  deger: number;
  taban: number;
}) {
  const oran =
    taban > 0 ? Math.min(100, Math.max(0, (deger / taban) * 100)) : null;

  const yuzdeMetni = oran === null ? "—" : `%${oran.toFixed(1)}`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-white/70">{etiket}</span>

        <span className="text-sm text-white/50">
          <span className="font-semibold text-white">{deger}</span> · {yuzdeMetni}
        </span>
      </div>

      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-indigo-500/70"
          style={{ width: `${oran ?? 0}%` }}
        />
      </div>
    </div>
  );
}

/** Filtreyi koruyarak aralık değiştiren bağlantı adresi üretir. */
function aralikAdresi(anahtar: string, urun: string | null): string {
  const parametreler = new URLSearchParams({ aralik: anahtar });

  if (urun) {
    parametreler.set("urun", urun);
  }

  return `/admin/analitik?${parametreler.toString()}`;
}

export default async function AdminAnalitikPage({ searchParams }: Props) {
  const urunKodu = urunFiltresiCoz(searchParams?.urun);

  const aralik: Aralik = aralikCoz({
    aralik: searchParams?.aralik,
    bas: searchParams?.bas,
    bit: searchParams?.bit,
  });

  const rapor = await analitikRaporu(aralik, urunKodu);

  // Özel aralık formunun varsayılan değerleri: seçili aralığın sınırları.
  const basVarsayilan = tarihMetniYaz(aralik.baslangic);
  const bitVarsayilan = tarihMetniYaz(
    new Date(aralik.bitis.getTime() - 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analitik</h1>

        <p className="mt-2 text-sm text-white/50">
          Müşteri davranışı ve satış özeti. Yönetici ziyaretleri bu
          rakamlara dâhil değildir. Ziyaretçiler anonim bir çerez kimliğiyle
          sayılır; giriş yapmış kullanıcılar yalnızca hesaplarıyla
          ilişkilendirilir. IP adresi ve tarayıcı parmak izi saklanmaz.
        </p>
      </div>

      {/* --- Tarih filtreleri --- */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={aralikAdresi("bugun", urunKodu)}
            className={aralikSinifi(aralik.anahtar === "bugun")}
          >
            Bugün
          </a>

          <a
            href={aralikAdresi("7g", urunKodu)}
            className={aralikSinifi(aralik.anahtar === "7g")}
          >
            Son 7 gün
          </a>

          <a
            href={aralikAdresi("30g", urunKodu)}
            className={aralikSinifi(aralik.anahtar === "30g")}
          >
            Son 30 gün
          </a>

          <span className="ml-1 text-sm text-white/40">
            Seçili: {aralik.etiket}
          </span>
        </div>

        {/*
          Özel aralık ve ürün filtresi tek formda. `GET` gönderdiği için
          istemci tarafı JavaScript gerekmez ve adres paylaşılabilir olur.
        */}
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="aralik" value="ozel" />

          <div>
            <label
              htmlFor="bas"
              className="mb-1 block text-xs text-white/50"
            >
              Başlangıç
            </label>

            <input
              id="bas"
              name="bas"
              type="date"
              defaultValue={basVarsayilan}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="bit" className="mb-1 block text-xs text-white/50">
              Bitiş
            </label>

            <input
              id="bit"
              name="bit"
              type="date"
              defaultValue={bitVarsayilan}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="urun" className="mb-1 block text-xs text-white/50">
              Ürün
            </label>

            <select
              id="urun"
              name="urun"
              defaultValue={urunKodu ?? ""}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">Tüm ürünler</option>

              {SIPARIS_URUNLERI.map((urun) => (
                <option key={urun.kod} value={urun.kod}>
                  {urun.ad}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Uygula
          </button>

          <a
            href="/admin/analitik?aralik=7g"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10"
          >
            Sıfırla
          </a>
        </form>
      </div>

      {/* --- Özet kartları --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kart
          etiket="Tekil ziyaretçi"
          deger={String(rapor.tekilZiyaretci)}
          not="Aynı kişi bir kez sayılır"
        />

        <Kart
          etiket="Toplam ziyaret"
          deger={String(rapor.toplamZiyaret)}
          not="Her geliş ayrı sayılır"
        />

        <Kart
          etiket="Sayfa görüntüleme"
          deger={String(rapor.sayfaGoruntuleme)}
        />

        <Kart
          etiket="Ürün görüntüleme"
          deger={String(rapor.urunGoruntuleme)}
        />

        <Kart etiket="Sepete ekleme" deger={String(rapor.sepeteEkleme)} />

        <Kart
          etiket="Sepetten çıkarma"
          deger={String(rapor.sepettenCikarma)}
          not="Almadan vazgeçenler"
        />

        <Kart
          etiket="Ödeme başlatma"
          deger={String(rapor.odemeBaslatma)}
        />

        <Kart
          etiket="Başarısız ödeme"
          deger={String(rapor.basarisizOdeme)}
          not="Satış olarak sayılmaz"
        />

        <Kart
          etiket="Satış adedi"
          deger={String(rapor.satisAdedi)}
          not="Ödemesi onaylanmış sipariş"
        />

        <Kart
          etiket="Toplam gelir"
          deger={fiyatBicimle(rapor.gelirKurus)}
          not={urunKodu ? "Seçili ürünün satır toplamı" : "Kargo dâhil"}
        />
      </div>

      {/* --- Huni --- */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">
          Görüntüleme → Sepet → Ödeme → Satış
        </h2>

        <p className="mt-1 text-sm text-white/50">
          Tüm adımlar TEKİL ZİYARETÇİ sayısıdır ve &quot;en az bu aşamaya
          ulaşan&quot; olarak hesaplanır; bu yüzden adımlar hiçbir zaman
          artmaz. Ödemesi onaylanmış sipariş adedi yukarıdaki &quot;Satış
          adedi&quot; kartındadır.
        </p>

        <div className="mt-5 space-y-4">
          <HuniSatiri
            etiket="Ürünü görüntüleyen"
            deger={rapor.huni.goruntuleyen}
            taban={rapor.huni.goruntuleyen}
          />

          <HuniSatiri
            etiket="Sepete ekleyen"
            deger={rapor.huni.sepeteEkleyen}
            taban={rapor.huni.goruntuleyen}
          />

          <HuniSatiri
            etiket="Ödemeye başlayan"
            deger={rapor.huni.odemeBaslatan}
            taban={rapor.huni.goruntuleyen}
          />

          <HuniSatiri
            etiket="Satın alan ziyaretçi"
            deger={rapor.huni.satinAlan}
            taban={rapor.huni.goruntuleyen}
          />
        </div>

        <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-sm text-amber-200">
            Sepete ekleyip satın almayan ziyaretçi:{" "}
            <span className="font-bold">{rapor.sepetiBirakan}</span>
          </p>
        </div>
      </div>

      {/* --- Ürün bazlı huni --- */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">
          Ürün bazlı dönüşüm hunisi
        </h2>

        <p className="mt-1 text-sm text-white/50">
          Her ürün için görüntüleme → sepete ekleme → satın alma. Oranlar
          bir önceki adıma göredir. Satış adedi sipariş tablosundan okunur.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {rapor.urunler.map((satir) => (
            <div
              key={satir.kod}
              className="rounded-xl border border-white/10 bg-black/20 p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium text-white">{satir.ad}</h3>

                <span className="text-xs text-white/40">
                  {satir.donusumYuzde === null
                    ? "dönüşüm —"
                    : `dönüşüm %${satir.donusumYuzde.toFixed(2)}`}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <HuniSatiri
                  etiket="Görüntüleme"
                  deger={satir.goruntuleme}
                  taban={satir.goruntuleme}
                />

                <HuniSatiri
                  etiket="Sepete ekleme"
                  deger={satir.sepeteEkleme}
                  taban={satir.goruntuleme}
                />

                <HuniSatiri
                  etiket="Satın alma"
                  deger={satir.satisAdedi}
                  taban={satir.goruntuleme}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/50">
                <span>
                  Görüntüleme → Sepet:{" "}
                  <span className="font-semibold text-white/80">
                    {satir.goruntulemedenSepeteYuzde === null
                      ? "—"
                      : `%${satir.goruntulemedenSepeteYuzde.toFixed(1)}`}
                  </span>
                </span>

                <span>
                  Sepet → Satış:{" "}
                  <span className="font-semibold text-white/80">
                    {satir.sepettenSatisaYuzde === null
                      ? "—"
                      : `%${satir.sepettenSatisaYuzde.toFixed(1)}`}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Ürün tablosu --- */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Ürün bazlı özet</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                <th className="pb-3 pr-4 font-medium">Ürün</th>
                <th className="pb-3 pr-4 font-medium">Görüntüleme</th>
                <th className="pb-3 pr-4 font-medium">Sepete ekleme</th>
                <th className="pb-3 pr-4 font-medium">Sepetten çıkarma</th>
                <th className="pb-3 pr-4 font-medium">Ödeme başlatma</th>
                <th className="pb-3 pr-4 font-medium">Satış</th>
                <th className="pb-3 pr-4 font-medium">Gelir</th>
                <th className="pb-3 font-medium">Dönüşüm</th>
              </tr>
            </thead>

            <tbody>
              {rapor.urunler.map((satir) => (
                <tr key={satir.kod} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white">{satir.ad}</td>
                  <td className="py-3 pr-4 text-white/70">
                    {satir.goruntuleme}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {satir.sepeteEkleme}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {satir.sepettenCikarma}
                  </td>
                  <td className="py-3 pr-4 text-white/70">
                    {satir.odemeBaslatma}
                  </td>
                  <td className="py-3 pr-4 text-white/70">{satir.satisAdedi}</td>
                  <td className="py-3 pr-4 text-white/70">
                    {fiyatBicimle(satir.gelirKurus)}
                  </td>
                  <td className="py-3 text-white/70">
                    {satir.donusumYuzde === null
                      ? "—"
                      : `%${satir.donusumYuzde.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/40">
          Dönüşüm = satış adedi / ürün görüntüleme. Satış adedi ve gelir
          sipariş tablosundan okunur; analitik olaylarından değil.
        </p>
      </div>
    </div>
  );
}
