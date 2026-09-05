import Link from "next/link";
import AracBaskiciPaketi, {
  type StokEtiketi,
} from "@/components/admin/AracBaskiciPaketi";
import {
  baskiYapilandirmasi,
  baskiciPaketiOlanUrunler,
} from "@/lib/baski-yapilandirmasi";
import { prisma } from "@/lib/prisma";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import { etiketKoduBicimle } from "@/lib/tags";

/**
 * Baskıcı paketi — SONRADAN İNDİRME.
 *
 * Etiket üretim ekranındaki paket yalnızca üretim anında, tokenlar hâlâ
 * bellekteyken indirilebiliyordu; kaçırılırsa geri dönüşü yoktu. Bu sayfa
 * aynı paketi daha önce üretilmiş etiketler için yeniden üretir.
 *
 * Ürün `?urun=` parametresiyle seçilir ve YALNIZCA baskıcı paketi tanımlı
 * ürünler kabul edilir; bilinmeyen değer varsayılana düşer.
 *
 * Yeni tablo veya migration YOKTUR: mevcut `Tag` kayıtları `productKod`
 * alanına göre süzülür. Sorgu salt okunurdur.
 *
 * Yetki: /admin altındaki tüm sayfalar gibi `src/app/admin/layout.tsx`
 * içindeki ADMIN rol kapısıyla korunur; paket ucu ayrıca kendi kontrolünü
 * yapar.
 */
export const dynamic = "force-dynamic";

/** Ekranda gösterilecek en fazla etiket. */
const EN_FAZLA_SATIR = 500;

type Props = {
  searchParams: { urun?: string };
};

export default async function BaskiciPaketiSayfasi({ searchParams }: Props) {
  const paketliKodlar = baskiciPaketiOlanUrunler();

  const urunler = SIPARIS_URUNLERI.filter((u) => paketliKodlar.includes(u.kod));

  const istenen = String(searchParams?.urun ?? "").trim();

  const urun =
    urunler.find((u) => u.kod === istenen) ?? urunler[0] ?? null;

  if (!urun) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Baskıcı paketi tanımlı ürün bulunmuyor.
      </div>
    );
  }

  const yapilandirma = baskiYapilandirmasi(urun.kod);
  const ayar = yapilandirma.baskiciAyari;

  /*
    `publicToken` BİLEREK seçilmez: QR adresinin tamamını taşır ve bu
    ekranda gösterilmesine gerek yoktur. Seçim etiket koduyla yapılır,
    tokenı paket ucu veritabanından kendisi bulur.
  */
  const kayitlar = await prisma.tag.findMany({
    where: { productKod: urun.kod },
    select: { code: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: EN_FAZLA_SATIR,
  });

  const etiketler: StokEtiketi[] = kayitlar.map((kayit) => ({
    kod: etiketKoduBicimle(kayit.code),
    durum: kayit.status,
    olusturulma: kayit.createdAt.toLocaleDateString("tr-TR"),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tags"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          ← Etiket Üretimi
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-white">Baskıcı Paketi</h1>

        <p className="mt-2 text-sm leading-6 text-white/50">
          Daha önce üretilmiş etiketleri seçip üretici paketini yeniden
          indirebilirsin. Paket her etiket için ölçüsü tanımlanmış SVG QR
          dosyası, <span className="font-mono">baskici-listesi.csv</span> ve{" "}
          <span className="font-mono">URETIM-NOTU.txt</span> içerir.
        </p>
      </div>

      {/* Ürün sekmeleri — her ürünün kendi paketi vardır. */}
      <div className="flex flex-wrap gap-2">
        {urunler.map((secenek) => {
          const secili = secenek.kod === urun.kod;

          return (
            <Link
              key={secenek.kod}
              href={`/admin/tags/baskici?urun=${secenek.kod}`}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                secili
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {secenek.ad}
            </Link>
          );
        })}
      </div>

      {ayar && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
          <span className="font-semibold text-white">{urun.ad}</span> — gövde{" "}
          {ayar.govde}, QR dosyası {ayar.qrMm}×{ayar.qrMm} mm.
          <span className="mt-1 block text-white/40">
            {yapilandirma.aciklama}
          </span>
        </div>
      )}

      <AracBaskiciPaketi
        urunKod={urun.kod}
        urunAdi={urun.ad}
        etiketler={etiketler}
      />
    </div>
  );
}
