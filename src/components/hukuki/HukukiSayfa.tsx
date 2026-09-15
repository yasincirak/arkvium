import Link from "next/link";
import { notFound } from "next/navigation";
import SayfaUstBari from "@/components/SayfaUstBari";
import {
  CEREZ_POLITIKASI_YOLU,
  DOLDURULACAK,
  HUKUKI_BELGELER_YAYINDA,
  HUKUKI_BELGE_LISTESI,
  type HukukiBelge,
} from "@/lib/hukuki-belgeler";

/**
 * Hukuki belgeler için ortak sayfa çerçevesi.
 *
 * Dört belge de aynı başlık, uyarı ve alt bağlantı bloğunu paylaşır;
 * her sayfada tekrar yazılmaz.
 *
 * DİL: Bu belgeler yalnızca Türkçedir. Yarı çevrilmiş bir hukuki metin
 * yanıltıcı olur; çeviri gerekirse ayrıca ve bütün olarak yapılmalıdır.
 */

/** Yayın öncesi doldurulacak alanların görünür işareti. */
export function Doldurulacak({ not }: { not?: string }) {
  return (
    <mark className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-900">
      {DOLDURULACAK}
      {not ? ` — ${not}` : ""}
    </mark>
  );
}

/**
 * İşletme sahibinin dolduracağı alan işareti.
 *
 * `Doldurulacak` ile aynı işi görür ama alanın KİMDEN beklendiğini de
 * söyler. Yalnızca KVKK Aydınlatma Metni kullanır; diğer belgeler
 * mevcut `Doldurulacak` işaretini kullanmaya devam eder.
 */
export function YasinDoldurur({ alan }: { alan: string }) {
  return (
    <mark className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-900">
      [YASİN TARAFINDAN DOLDURULACAK: {alan}]
    </mark>
  );
}

/**
 * Hukuki değerlendirme gerektiren madde işareti.
 *
 * Hukuki sebep, saklama süresi ve yurt dışına aktarım gibi konular
 * koddan doğrulanamaz ve TAHMİN EDİLMEZ; bir hukuk danışmanının karar
 * vermesi gerekir.
 */
export function HukukOnayi({ konu }: { konu?: string }) {
  return (
    <mark className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-sky-900">
      [HUKUK DANIŞMANI ONAYI GEREKİYOR]
      {konu ? ` — ${konu}` : ""}
    </mark>
  );
}

export function Bolum({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{baslik}</h2>

      <div className="mt-3 space-y-3 leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

export function Liste({ maddeler }: { maddeler: React.ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {maddeler.map((madde, sira) => (
        <li key={sira}>{madde}</li>
      ))}
    </ul>
  );
}

export default function HukukiSayfa({
  belge,
  children,
  isaretAciklamasi,
}: {
  belge: HukukiBelge;
  children: React.ReactNode;
  /**
   * Taslak uyarısındaki işaret açıklaması. Verilmezse mevcut
   * `[YAYIN ÖNCESİ DOLDURULACAK]` metni kullanılır; böylece diğer
   * belgelerin çıktısı değişmez.
   */
  isaretAciklamasi?: React.ReactNode;
}) {
  /*
    TASLAK KİLİDİ — tek kapı.

    Beş hukuki sayfanın tamamı bu kabuğu kullanır; kilit burada
    denetlendiği için sayfalar tek yerden yayından kaldırılır.
    Kapalıyken sayfa YOK gibi davranır: içerik hiç render edilmez,
    yer tutuculu taslak metin ziyaretçiye ulaşmaz.
  */
  if (!HUKUKI_BELGELER_YAYINDA) {
    notFound();
  }

  const digerBelgeler = HUKUKI_BELGE_LISTESI.filter(
    (diger) => diger.yol !== belge.yol
  );

  return (
    <main className="pt-20 min-h-screen bg-[#f6f4ff] text-[#101a3d]">
      <SayfaUstBari ton="acik" />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl font-bold">{belge.baslik}</h1>

        <p className="mt-2 text-sm text-slate-500">
          Sürüm {belge.surum}
        </p>

        {/*
          TASLAK UYARISI — her hukuki sayfada görünür.

          Bu metinler uygulamanın KODUNDAN doğrulanabilen veri akışlarına
          göre hazırlanmıştır. Hukuki uygunluk iddiası TAŞIMAZLAR;
          yayından önce bir hukuk danışmanının incelemesi gerekir.
        */}
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Taslak metin — yayın öncesi hukuki inceleme gerekir
          </p>

          <p className="mt-2 text-sm leading-relaxed text-amber-900">
            Bu metin, ARKVIUM uygulamasının kaynak kodundan doğrulanabilen
            veri akışlarına dayanarak hazırlanmıştır. Hukuki uygunluk
            iddiası taşımaz ve hukuki görüş yerine geçmez.{" "}
            {isaretAciklamasi ?? (
              <>
                İçindeki <Doldurulacak /> işaretli alanlar doldurulmadan ve
                bir hukuk danışmanı tarafından incelenmeden
                yayımlanmamalıdır.
              </>
            )}
          </p>
        </div>

        <div className="mt-8">{children}</div>

        <Bolum baslik="İlgili belgeler">
          <ul className="ml-5 list-disc space-y-2">
            {digerBelgeler.map((diger) => (
              <li key={diger.yol}>
                <Link
                  href={diger.yol}
                  className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
                >
                  {diger.baslik}
                </Link>
              </li>
            ))}

            <li>
              <Link
                href={CEREZ_POLITIKASI_YOLU}
                className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
              >
                Çerez Politikası
              </Link>
            </li>
          </ul>
        </Bolum>
      </div>
    </main>
  );
}
