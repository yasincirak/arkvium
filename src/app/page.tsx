export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 bg-[#0a0a0f]/90 px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            ARKV<span className="text-indigo-400">IUM</span>
          </div>

          <div className="hidden gap-6 text-sm text-white/60 md:flex">
            <a href="#ozellikler" className="hover:text-white">
              Özellikler
            </a>
            <a href="#nasil" className="hover:text-white">
              Nasıl Çalışır
            </a>
            <a href="#guvenlik" className="hover:text-white">
              Güvenlik
            </a>
          </div>

          <a
            href="/admin/new"
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
          >
            Hemen Başla
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-28 text-center">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
            Dijital Sahiplik Platformu
          </div>

          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
            Eşyaların kaybolsa bile{" "}
            <span className="text-indigo-400">sana geri dönsün</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
            ARKVIUM, eşyalarına QR kodlu dijital kimlik kazandırır. Bulan kişi QR
            kodu okutur ve kişisel bilgilerin korunurken sana güvenli şekilde
            ulaşır.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/admin/new"
              className="rounded-xl bg-indigo-500 px-8 py-4 font-semibold hover:bg-indigo-600"
            >
              Ücretsiz Başla
            </a>

            <a
              href="#nasil"
              className="rounded-xl border border-white/15 bg-white/5 px-8 py-4 font-semibold hover:bg-white/10"
            >
              Nasıl Çalışır?
            </a>
          </div>
        </div>
      </section>

      <section id="ozellikler" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold">Neden ARKVIUM?</h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-semibold">QR Dijital Kimlik</h3>
            <p className="mt-3 text-white/60">
              Her eşya için benzersiz QR kod oluştur ve dijital kimlik ver.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-semibold">Gizli İletişim</h3>
            <p className="mt-3 text-white/60">
              Bulan kişi sana ulaşır ama telefon numaran doğrudan görünmez.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-xl font-semibold">Kolay Yönetim</h3>
            <p className="mt-3 text-white/60">
              Tüm eşyalarını tek panelden ekle, düzenle ve takip et.
            </p>
          </div>
        </div>
      </section>

      <section id="nasil" className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold">Üç adımda çalışır</h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 p-8">
              <div className="text-4xl font-bold text-indigo-400">01</div>
              <h3 className="mt-4 text-xl font-semibold">Eşyanı kaydet</h3>
              <p className="mt-3 text-white/60">
                Çanta, anahtar, valiz, laptop veya başka bir eşyanı sisteme ekle.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-8">
              <div className="text-4xl font-bold text-indigo-400">02</div>
              <h3 className="mt-4 text-xl font-semibold">QR etiketi yapıştır</h3>
              <p className="mt-3 text-white/60">
                Oluşan QR kodu etikete dönüştürüp eşyanın üzerine yapıştır.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-8">
              <div className="text-4xl font-bold text-indigo-400">03</div>
              <h3 className="mt-4 text-xl font-semibold">Bulan kişi ulaşsın</h3>
              <p className="mt-3 text-white/60">
                QR okutulduğunda güvenli iletişim sayfası açılır.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="guvenlik" className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 to-white/5 p-10 text-center">
          <h2 className="text-3xl font-bold">Gizlilik önce gelir</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            ARKVIUM&apos;un hedefi sadece eşyayı buldurmak değil; kullanıcıyı
            koruyan, güvenli ve kontrollü bir dijital sahiplik altyapısı
            kurmaktır.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-white/40">
        <div className="font-semibold text-white">
          ARKV<span className="text-indigo-400">IUM</span>
        </div>
        <div className="mt-2">Dijital Sahiplik Platformu</div>
        <div className="mt-4">© 2026 ARKVIUM. Tüm hakları saklıdır.</div>
      </footer>
    </main>
  );
}