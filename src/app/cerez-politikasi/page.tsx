import type { Metadata } from "next";
import Link from "next/link";
import SayfaUstBari from "@/components/SayfaUstBari";
import CerezTercihleriBaglantisi from "@/components/CerezTercihleriBaglantisi";
import { sozluk } from "@/lib/i18n";
import { CANLI_ADRES } from "@/lib/seo";
import {
  ONAY_COOKIE_OMRU,
  CEREZ_ONAY_COOKIE,
} from "@/lib/cerez-onayi";
import { HUKUKI_BELGE_LISTESI } from "@/lib/hukuki-belgeler";
import {
  ZIYARET_COOKIE,
  ZIYARETCI_COOKIE,
  ZIYARET_COOKIE_OMRU,
  ZIYARETCI_COOKIE_OMRU,
} from "@/lib/analitik-ziyaretci";
import { DIL_COOKIE } from "@/lib/i18n/diller";
import { USER_SESSION_COOKIE } from "@/lib/auth";

/**
 * Çerez Politikası.
 *
 * TEK KAYNAK: Tablodaki çerez ADLARI ve SÜRELERİ koddaki sabitlerden
 * okunur, elle yazılmaz. Bir çerezin adı veya ömrü değişirse bu sayfa
 * kendiliğinden güncellenir; politika ile gerçek davranış birbirinden
 * ayrı düşemez.
 *
 * Sayfa herkese açıktır ve indekslenir: çerez politikasının erişilebilir
 * olması mevzuatın gereğidir.
 */

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description:
    "ARKVIUM'da kullanılan çerezler: adı, amacı, süresi, sağlayıcısı ve türü.",
  alternates: { canonical: `${CANLI_ADRES}/cerez-politikasi` },
};

/** Saniyeyi okunabilir süreye çevirir. */
function sureMetni(saniye: number): string {
  const gun = Math.round(saniye / (60 * 60 * 24));

  if (gun >= 365) {
    const yil = Math.round(gun / 365);

    return yil === 1 ? "1 yıl" : `${yil} yıl`;
  }

  if (gun >= 1) {
    return `${gun} gün`;
  }

  const dakika = Math.round(saniye / 60);

  return `${dakika} dakika (hareketsizlik sonrası sona erer)`;
}

export default function CerezPolitikasiPage() {
  const s = sozluk();

  /**
   * Sitede oluşan TÜM çerezler. Sağlayıcı her satırda ARKVIUM'dur:
   * üçüncü taraf analitik veya reklam çerezi kullanılmaz.
   */
  const cerezler = [
    {
      ad: USER_SESSION_COOKIE,
      amac: "Oturum açmış kullanıcıyı tanır. Giriş yapılmadan oluşmaz.",
      sure: "7 gün",
      tur: s.cerezPolitikasi.turZorunlu,
    },
    {
      ad: CEREZ_ONAY_COOKIE,
      amac:
        "Çerez tercihinizi hatırlar. Bu kayıt olmadan size her sayfada yeniden sorulurdu.",
      sure: sureMetni(ONAY_COOKIE_OMRU),
      tur: s.cerezPolitikasi.turZorunlu,
    },
    {
      ad: DIL_COOKIE,
      amac: "Seçtiğiniz dili (Türkçe/İngilizce) hatırlar.",
      sure: "1 yıl",
      tur: s.cerezPolitikasi.turZorunlu,
    },
    {
      ad: ZIYARETCI_COOKIE,
      amac:
        "Tekil ziyaretçi sayımı için rastgele, kişiyle ilişkilendirilmeyen bir kimlik taşır. Kimlik bilgisi, IP adresi veya tarayıcı parmak izi içermez ve bunlardan türetilmez.",
      sure: sureMetni(ZIYARETCI_COOKIE_OMRU),
      tur: s.cerezPolitikasi.turAnalitik,
    },
    {
      ad: ZIYARET_COOKIE,
      amac:
        "Aynı ziyaretin tek sayılmasını sağlar (toplam ziyaret ölçümü). Rastgeledir ve kişisel veri içermez.",
      sure: sureMetni(ZIYARET_COOKIE_OMRU),
      tur: s.cerezPolitikasi.turAnalitik,
    },
  ];

  return (
    <main className="pt-20 min-h-screen bg-[#f6f4ff] text-[#101a3d]">
      <SayfaUstBari ton="acik" />

      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl font-bold">{s.cerezPolitikasi.baslik}</h1>

        <p className="mt-2 text-sm text-slate-500">
          {s.cerezPolitikasi.sonGuncelleme}
        </p>

        <p className="mt-6 leading-relaxed text-slate-700">
          {s.cerezPolitikasi.girisMetni}
        </p>

        <h2 className="mt-10 text-xl font-semibold">
          {s.cerezPolitikasi.tabloBaslik}
        </h2>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">
                  {s.cerezPolitikasi.sutunAd}
                </th>
                <th className="px-4 py-3 font-medium">
                  {s.cerezPolitikasi.sutunAmac}
                </th>
                <th className="px-4 py-3 font-medium">
                  {s.cerezPolitikasi.sutunSure}
                </th>
                <th className="px-4 py-3 font-medium">
                  {s.cerezPolitikasi.sutunSaglayici}
                </th>
                <th className="px-4 py-3 font-medium">
                  {s.cerezPolitikasi.sutunTur}
                </th>
              </tr>
            </thead>

            <tbody>
              {cerezler.map((cerez) => (
                <tr key={cerez.ad} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs text-[#101a3d]">
                    {cerez.ad}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{cerez.amac}</td>
                  <td className="px-4 py-3 text-slate-600">{cerez.sure}</td>
                  {/* Sağlayıcı her satırda ARKVIUM: üçüncü taraf çerez yok. */}
                  <td className="px-4 py-3 text-slate-600">ARKVIUM</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        cerez.tur === s.cerezPolitikasi.turZorunlu
                          ? "bg-slate-100 text-slate-600"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {cerez.tur}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-xl font-semibold">
          {s.cerezPolitikasi.ucuncuTarafBaslik}
        </h2>

        <p className="mt-3 leading-relaxed text-slate-700">
          {s.cerezPolitikasi.ucuncuTarafMetin}
        </p>

        <h2 className="mt-10 text-xl font-semibold">
          {s.cerezPolitikasi.haklarBaslik}
        </h2>

        <p className="mt-3 leading-relaxed text-slate-700">
          {s.cerezPolitikasi.haklarMetin}
        </p>

        <div className="mt-5">
          <CerezTercihleriBaglantisi className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#101a3d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1b2a5e]" />
        </div>

        <h2 className="mt-10 text-xl font-semibold">
          {s.cerezPolitikasi.iletisimBaslik}
        </h2>

        <p className="mt-3 leading-relaxed text-slate-700">
          {s.cerezPolitikasi.iletisimMetin}
        </p>

        {/* Mevcut gizlilik ve hukuki metinlere bağlantılar. */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {HUKUKI_BELGE_LISTESI.map((belge) => (
            <Link
              key={belge.yol}
              href={belge.yol}
              className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
            >
              {belge.baslik}
            </Link>
          ))}

          <a
            href="/#guvenlik"
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            {s.cerez.gizliligiGor}
          </a>

          <a
            href="/#sss"
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            {s.footer.sss}
          </a>

          <Link
            href="/"
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            {s.kalanlar.urunlereDon}
          </Link>
        </div>
      </div>
    </main>
  );
}
