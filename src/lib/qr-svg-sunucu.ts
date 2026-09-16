import { createRequire } from "node:module";

/**
 * Sunucu tarafında QR SVG üretimi.
 *
 * NEDEN `createRequire` İLE?
 * `qrcode.react` bir React bileşenidir ve içinde `useMemo` kullanır. Route
 * Handler bundle'ına gömülürse iki ayrı tuzak vardır ve İKİSİ DE daha önce
 * production'da 500 üretmiştir (bkz. baskici-paketi ucundaki uzun not):
 *
 *  1) Paket route bundle'ına girerse `react`, Next'in sunucu bileşeni
 *     çalışma zamanına bağlanır; orada hook'lar yoktur.
 *  2) Yalnızca bileşen dışarı alınırsa İKİ AYRI React kopyası oluşur ve
 *     dispatcher eşleşmediği için hook yine null gelir.
 *
 * Çözüm: bileşen de renderer da AYNI gerçek `node_modules` kopyasından
 * yüklenir. `qrcode.react` ve `react-dom/server` next.config.mjs içinde
 * sunucu bundle'ının DIŞINDA bırakılır; dosyaların sunucusuz pakete
 * girmesi `outputFileTracingIncludes` ile garanti altına alınır.
 *
 * Bu ucu kullanan HER YENİ route yolunun next.config.mjs içindeki
 * `outputFileTracingIncludes` listesine eklenmesi ZORUNLUDUR; aksi hâlde
 * production'da "Cannot find module" alınır.
 */

const nodeRequire = createRequire(import.meta.url);

/** QR standardının gerektirdiği sessiz alan, modül cinsinden. */
export const SESSIZ_ALAN_MODUL = 4;

/**
 * Verilen adres için QR SVG'si üretir.
 *
 * Adres GİZLİ DEĞİLDİR: yalnızca etiketin herkese açık `/t/<token>`
 * hedefidir. Aktivasyon kodu bu fonksiyona hiç girmez.
 */
export function qrSvgUret(adres: string): string {
  const React = nodeRequire("react");
  const { renderToStaticMarkup } = nodeRequire("react-dom/server");
  const { QRCodeSVG } = nodeRequire("qrcode.react");

  return renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: adres,
      level: "M",
      marginSize: SESSIZ_ALAN_MODUL,
      bgColor: "#ffffff",
      fgColor: "#000000",
    })
  );
}
