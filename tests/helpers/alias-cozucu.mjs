import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * `@/...` yol takma adını Node için çözer.
 *
 * Uygulama kodu `@/generated/prisma/client` gibi tsconfig takma adları
 * kullanır; Node bunları tanımaz. Testler uygulama modüllerini doğrudan
 * import ettiği için bu kanca gerekir. Yalnızca test çalıştırmasına
 * eklenir (`--import`), uygulama derlemesini etkilemez.
 */

const kokDizin = path.resolve(import.meta.dirname, "../..");

/** Uzantısız yolu dosya sistemindeki gerçek dosyaya tamamlar. */
function dosyayaTamamla(mutlakYol) {
  if (path.extname(mutlakYol) && existsSync(mutlakYol)) {
    return mutlakYol;
  }

  for (const aday of [
    `${mutlakYol}.ts`,
    `${mutlakYol}.tsx`,
    path.join(mutlakYol, "index.ts"),
  ]) {
    if (existsSync(aday)) {
      return aday;
    }
  }

  return mutlakYol;
}

/**
 * Yalnızca test çalıştırmasında geçerli modül karşılıkları.
 *
 * `next/headers` ve `next/cache` Next.js istek bağlamına bağlıdır ve Node
 * test çalıştırıcısında çözülemez. Server Action sarmalayıcılarını test
 * edebilmek için bunlar `next-taklit.mjs` ile karşılanır. Uygulama kodu
 * ve derlemesi bundan etkilenmez.
 */
const NEXT_KARSILIKLARI = new Set(["next/headers", "next/cache"]);

const nextTaklitUrl = pathToFileURL(
  path.join(import.meta.dirname, "next-taklit.mjs")
).href;

/**
 * Uzantısız çözülemeyen gerçek Next.js modülleri.
 *
 * `next/server` (NextResponse) Node ESM çözücüsünde yalnızca ".js" ekiyle
 * bulunur. Modül TAKLİT EDİLMEZ; route handler'ları doğrudan test
 * edebilmek için yalnızca yol tamamlanır.
 */
const NEXT_UZANTILI_KARSILIKLAR = new Map([["next/server", "next/server.js"]]);

registerHooks({
  resolve(belirtec, baglam, sonraki) {
    if (NEXT_KARSILIKLARI.has(belirtec)) {
      return { url: nextTaklitUrl, shortCircuit: true };
    }

    const uzantiliKarsilik = NEXT_UZANTILI_KARSILIKLAR.get(belirtec);

    if (uzantiliKarsilik) {
      return sonraki(uzantiliKarsilik, baglam);
    }

    if (belirtec.startsWith("@/")) {
      const hedef = dosyayaTamamla(path.join(kokDizin, "src", belirtec.slice(2)));

      return sonraki(pathToFileURL(hedef).href, baglam);
    }

    try {
      return sonraki(belirtec, baglam);
    } catch (hata) {
      // Prisma'nın ürettiği kod uzantısız göreli import kullanır ("./enums").
      // TypeScript bunu çözer, Node çözemez; yalnızca bu durumda tamamlanır.
      const gorelimi = belirtec.startsWith("./") || belirtec.startsWith("../");

      if (hata?.code !== "ERR_MODULE_NOT_FOUND" || !gorelimi || !baglam.parentURL) {
        throw hata;
      }

      const üstDizin = path.dirname(new URL(baglam.parentURL).pathname);
      const hedef = dosyayaTamamla(path.resolve(üstDizin, belirtec));

      return sonraki(pathToFileURL(hedef).href, baglam);
    }
  },
});
