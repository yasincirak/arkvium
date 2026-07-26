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
};

export default nextConfig;
