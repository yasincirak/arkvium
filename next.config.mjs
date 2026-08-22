/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Build çıktısının yazılacağı klasör.
   *
   * `next dev` ile `next build` aynı `.next` klasörünü paylaşır. Geliştirme
   * sunucusu açıkken production build alınırsa dev sunucusu çıktıyı ezer ve
   * `next start` bozuk bir build servis eder (sayfalar 404 döner).
   *
   * Entegrasyon testleri bu yüzden ayrı bir klasöre build alır:
   *   NEXT_DIST_DIR=.next-test next build
   * Böylece testler geliştirme sunucusundan bağımsız çalışır.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  experimental: {
    /**
     * `iyzipay` sunucu bundle'ına GÖMÜLMEZ.
     *
     * SDK istek modellerini dinamik require ile yükler
     * (`require('./requests/' + ad + '.js')`). Webpack bu yolu çözemeyip
     * yerine "Cannot find module" saplaması koyuyor; sonuç, sağlayıcıya
     * hiç istek çıkmadan düz bir `Error` fırlatılması oluyordu.
     * Paket dışarıda bırakılınca require çalışma anında node_modules'tan
     * çözülür.
     */
    serverComponentsExternalPackages: ["iyzipay"],
  },
};

export default nextConfig;
