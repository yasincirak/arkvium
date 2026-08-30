import { createHmac } from "crypto";
import { prisma } from "./prisma";

export { istemciIpAdresi } from "./request-ip";

/**
 * Veritabanı destekli hız sınırlama.
 *
 * Bellek içi sayaç kullanılmaz: Vercel birden fazla sunucu örneği çalıştırır
 * ve her örnek kendi sayacını tutarsa sınır pratikte örnek sayısı kadar
 * büyür. Sayaçlar tüm örneklerin paylaştığı veritabanında tutulur.
 *
 * Kişisel veri saklanmaz: IP adresi ve e-posta ham hâlde yazılmaz, yalnızca
 * HMAC özeti kaydedilir.
 */

export type HizSinirSonucu = {
  izinli: boolean;
  /** Sınır aşıldıysa kaç saniye sonra tekrar denenebileceği. */
  bekleSaniye: number;
};

type HizSinirAyari = {
  /** Sayaç kapsamı, örn. "giris-ip". */
  kapsam: string;
  /** IP adresi, e-posta gibi tanımlayıcı. Özetlenerek saklanır. */
  tanimlayici: string;
  /** Pencere içinde izin verilen deneme sayısı. */
  limit: number;
  /** Pencere uzunluğu (saniye). */
  pencereSaniye: number;
};

function ozetle(kapsam: string, tanimlayici: string): string {
  const anahtar =
    process.env.USER_SESSION_SECRET ?? "arkvium-rate-limit";

  const ozet = createHmac("sha256", anahtar)
    .update(`${kapsam}:${tanimlayici.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);

  return `${kapsam}:${ozet}`;
}

/**
 * Süresi dolmuş sayaçları ara sıra temizler.
 * Her istekte silme sorgusu çalıştırmamak için olasılığa bağlıdır.
 */
async function suresiDolanlariTemizle(): Promise<void> {
  if (Math.random() > 0.02) {
    return;
  }

  try {
    await prisma.rateLimitEntry.deleteMany({
      where: {
        windowEnd: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
  } catch {
    // Temizlik başarısız olursa hız sınırlama çalışmaya devam etmelidir.
  }
}

export async function hizSiniriKontrol(
  ayar: HizSinirAyari
): Promise<HizSinirSonucu> {
  const key = ozetle(ayar.kapsam, ayar.tanimlayici);
  const simdi = new Date();
  const yeniPencereSonu = new Date(
    simdi.getTime() + ayar.pencereSaniye * 1000
  );

  try {
    const mevcut = await prisma.rateLimitEntry.findUnique({ where: { key } });

    // Kayıt yok veya pencere dolmuş: sayacı sıfırla.
    if (!mevcut || mevcut.windowEnd <= simdi) {
      await prisma.rateLimitEntry.upsert({
        where: { key },
        create: { key, count: 1, windowEnd: yeniPencereSonu },
        update: { count: 1, windowEnd: yeniPencereSonu },
      });

      await suresiDolanlariTemizle();

      return { izinli: true, bekleSaniye: 0 };
    }

    if (mevcut.count >= ayar.limit) {
      const bekleSaniye = Math.max(
        1,
        Math.ceil((mevcut.windowEnd.getTime() - simdi.getTime()) / 1000)
      );

      return { izinli: false, bekleSaniye };
    }

    await prisma.rateLimitEntry.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { izinli: true, bekleSaniye: 0 };
  } catch (error) {
    // Veritabanına ulaşılamıyorsa uygulamayı tamamen kilitlemek yerine
    // isteğe izin verilir; olay sunucu tarafında görünür kalır.
    console.error("Hız sınırlama kontrolü yapılamadı:", error);

    return { izinli: true, bekleSaniye: 0 };
  }
}

/**
 * Başarılı işlemden sonra sayacı sıfırlar.
 * Örneğin doğru şifreyle giriş yapıldığında önceki hatalı denemeler silinir.
 */
export async function hizSiniriSifirla(
  kapsam: string,
  tanimlayici: string
): Promise<void> {
  try {
    await prisma.rateLimitEntry.delete({
      where: { key: ozetle(kapsam, tanimlayici) },
    });
  } catch {
    // Kayıt yoksa yapılacak bir şey yok.
  }
}
