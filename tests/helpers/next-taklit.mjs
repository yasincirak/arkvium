/**
 * Test ortamı için `next/headers` ve `next/cache` taklidi.
 *
 * NEDEN GEREKLİ: Server Action sarmalayıcıları (`ownership-transfer-actions.ts`)
 * `getUserSession()` üzerinden `cookies()` okur ve `revalidatePath()` çağırır.
 * Bu modüller yalnızca Next.js istek bağlamında çalışır; Node test
 * çalıştırıcısında import bile edilemez. Bu dosya onların yerine geçer.
 *
 * Oturum TAKLİT EDİLMEZ: test gerçek bir imzalı token üretip çereze koyar,
 * `verifyUserSessionToken` ve veritabanındaki `sessionVersion` kontrolü
 * olduğu gibi çalışır. Taklit edilen tek şey çerezin okunduğu yerdir.
 *
 * Yalnızca `tests/helpers/alias-cozucu.mjs` üzerinden test çalıştırmasına
 * bağlanır; uygulama derlemesi bu dosyayı hiç görmez.
 */

const cerezler = new Map();

/** Testin çerez ayarlaması için: cerezAyarla("ad", "deger") */
export function cerezAyarla(ad, deger) {
  cerezler.set(ad, deger);
}

/** Oturumsuz duruma dönmek için. */
export function cerezleriTemizle() {
  cerezler.clear();
}

/** Kaydedilen revalidatePath çağrıları — testler doğrulamak isterse. */
export const tazelenenYollar = [];

// --- next/headers karşılığı ---

export async function cookies() {
  return {
    get(ad) {
      const deger = cerezler.get(ad);

      return deger === undefined ? undefined : { name: ad, value: deger };
    },
    getAll() {
      return [...cerezler].map(([name, value]) => ({ name, value }));
    },
    has(ad) {
      return cerezler.has(ad);
    },
    set() {},
    delete() {},
  };
}

export async function headers() {
  return new Map();
}

// --- next/cache karşılığı ---

export function revalidatePath(yol) {
  tazelenenYollar.push(yol);
}

export function revalidateTag(etiket) {
  tazelenenYollar.push(etiket);
}
