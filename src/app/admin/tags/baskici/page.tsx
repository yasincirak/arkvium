import Link from "next/link";
import AracBaskiciPaketi, {
  type StokEtiketi,
} from "@/components/admin/AracBaskiciPaketi";
import { baskiYapilandirmasi } from "@/lib/baski-yapilandirmasi";
import { prisma } from "@/lib/prisma";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import { etiketKoduBicimle } from "@/lib/tags";

/**
 * Araç QR'ları için baskıcı paketi — SONRADAN İNDİRME.
 *
 * Etiket üretim ekranındaki paket yalnızca üretim anında, tokenlar hâlâ
 * bellekteyken indirilebiliyordu; kaçırılırsa geri dönüşü yoktu. Bu sayfa
 * aynı paketi daha önce üretilmiş etiketler için yeniden üretir.
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

const ARAC_KODU = "arac-stickeri";

export default async function BaskiciPaketiSayfasi() {
  const urun = SIPARIS_URUNLERI.find((u) => u.kod === ARAC_KODU);
  const yapilandirma = baskiYapilandirmasi(ARAC_KODU);

  if (!urun || !yapilandirma.baskiciPaketi) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Bu ürün için baskıcı paketi tanımlı değil.
      </div>
    );
  }

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

        <h1 className="mt-4 text-3xl font-bold text-white">
          Araç Baskıcı Paketi
        </h1>

        <p className="mt-2 text-sm leading-6 text-white/50">
          Daha önce üretilmiş {urun.ad} etiketlerini seçip matbaa paketini
          yeniden indirebilirsin. Paket her etiket için 40×40 mm SVG QR
          dosyası, <span className="font-mono">baskici-listesi.csv</span> ve{" "}
          <span className="font-mono">URETIM-NOTU.txt</span> içerir.
        </p>

        <p className="mt-2 text-sm text-white/40">{yapilandirma.aciklama}</p>
      </div>

      <AracBaskiciPaketi
        urunKod={urun.kod}
        urunAdi={urun.ad}
        etiketler={etiketler}
      />
    </div>
  );
}
