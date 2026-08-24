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

  /**
   * HTTP güvenlik başlıkları.
   *
   * Tüm uygulama rotalarına uygulanır. Yalnızca düşük riskli, davranış
   * değiştirmeyen başlıklar eklenmiştir:
   *
   * - `X-Content-Type-Options: nosniff` — tarayıcının içerik türünü tahmin
   *   etmesini engeller.
   * - `Referrer-Policy: strict-origin-when-cross-origin` — dış sitelere tam
   *   adres yerine yalnızca köken gönderilir (sipariş `publicToken` değeri
   *   referrer ile sızmaz).
   * - `X-Frame-Options: DENY` — sayfalar üçüncü taraf bir çerçeveye alınamaz
   *   (clickjacking). Uygulama kendi içinde iframe kullanmıyor ve ödeme
   *   yönlendirmesi `window.location.assign` ile üst düzeyde yapılıyor.
   * - `Permissions-Policy` — kamera, mikrofon ve konum kapatılır. Bu API'lerin
   *   hiçbiri uygulamada kullanılmıyor; QR okutma ziyaretçinin kendi kamera
   *   uygulamasında gerçekleşir, sayfa içinde değil.
   *
   * Content-Security-Policy ve Strict-Transport-Security BİLEREK eklenmedi;
   * ayrı değerlendirme gerektiriyorlar.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // QR erişim sayfaları acil durum bilgisi içerebilir. Bu sayfalar
        // hiçbir ara katmanda (CDN, tarayıcı, proxy) SAKLANMAMALIDIR: sahibi
        // rızasını geri çektiğinde bilgi anında görünmez olmalı.
        //
        // `X-Robots-Tag` sayfa metadata'sındaki noindex kuralını HTTP
        // düzeyinde de tekrarlar; robots.txt zaten /t yolunu kapatır.
        source: "/t/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
