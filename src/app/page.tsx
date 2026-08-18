import HeroCarousel from "@/components/hero/HeroCarousel";
import Logo, { ArkviumTamLogo } from "@/components/Logo";
import UrunlerBolumu from "@/components/UrunlerBolumu";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#101a3d]">
      {/*
       * Ana sayfa açık temalı. Tarayıcı koyu moddayken globals.css gövde
       * zeminini koyuya boyuyor ve sayfa sınırının dışında kalan alan
       * (overscroll) siyah görünüyor. Yalnızca bu sayfa açıkken geçerlidir;
       * diğer sayfaların koyu teması etkilenmez.
       */}
      <style>{`body { background: #ffffff; }`}</style>

      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo yaziSinifi="text-base sm:text-xl" amblemYuksekligi={30} />

          <div className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#urunler" className="transition hover:text-indigo-600">
              Ürünler
            </a>
            <a href="#ozellikler" className="transition hover:text-indigo-600">
              Özellikler
            </a>
            <a href="#nasil" className="transition hover:text-indigo-600">
              Nasıl Çalışır
            </a>
            <a href="#guvenlik" className="transition hover:text-indigo-600">
              Güvenlik
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/login"
              className="whitespace-nowrap rounded-xl px-2 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 sm:px-4"
            >
              Giriş Yap
            </a>

            <a
              href="/register"
              className="whitespace-nowrap rounded-xl bg-[#101a3d] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2a5c] sm:px-5"
            >
              Hemen Başla
            </a>
          </div>
        </div>
      </header>

      <HeroCarousel />

      <section id="ozellikler" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-center text-3xl font-bold">Neden ARKVIUM?</h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-xl font-semibold">QR Dijital Kimlik</h3>
            <p className="mt-3 text-slate-600">
              Her eşya için benzersiz QR kod oluştur ve dijital kimlik ver.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-xl font-semibold">Gizli İletişim</h3>
            <p className="mt-3 text-slate-600">
              Bulan kişi sana ulaşır ama telefon numaran doğrudan görünmez.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-xl font-semibold">Kolay Yönetim</h3>
            <p className="mt-3 text-slate-600">
              Tüm eşyalarını tek panelden ekle, düzenle ve takip et.
            </p>
          </div>
        </div>
      </section>

      <section id="nasil" className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="text-center text-3xl font-bold">
            Fiziksel ARKVIUM ürününü dört adımda kullan
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="text-4xl font-bold text-indigo-600">01</div>
              <h3 className="mt-4 text-xl font-semibold">Ürününü seç</h3>
              <p className="mt-3 text-slate-600">
                İhtiyacına uygun QR sticker, anahtarlık, künye veya valiz
                etiketini seç.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="text-4xl font-bold text-indigo-600">02</div>
              <h3 className="mt-4 text-xl font-semibold">
                WhatsApp&apos;tan sipariş ver
              </h3>
              <p className="mt-3 text-slate-600">
                Hazır sipariş mesajını gönder; ödeme ve teslimat bilgilerini
                WhatsApp üzerinden tamamla.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="text-4xl font-bold text-indigo-600">03</div>
              <h3 className="mt-4 text-xl font-semibold">
                Etiketini etkinleştir
              </h3>
              <p className="mt-3 text-slate-600">
                Ürün eline ulaştığında ARKVIUM hesabına giriş yap ve QR etiketini
                hesabına bağla.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="text-4xl font-bold text-indigo-600">04</div>
              <h3 className="mt-4 text-xl font-semibold">Güvenle mesaj al</h3>
              <p className="mt-3 text-slate-600">
                QR kodunu bulan kişi okutsun ve kişisel bilgilerin görünmeden
                sana mesaj göndersin.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-slate-600">
            Fiziksel ürün istemiyor musun?{" "}
            <a
              href="/register"
              className="font-semibold text-indigo-600 underline-offset-4 transition hover:text-indigo-700 hover:underline"
            >
              Ücretsiz hesap oluştur
            </a>
            arak dijital QR kodunu kendin oluşturabilirsin.
          </p>
        </div>
      </section>

      <UrunlerBolumu />

      <section id="guvenlik" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="rounded-3xl border border-[#e5e0ff] bg-[#f6f4ff] p-8 text-center sm:p-10">
          <h2 className="text-3xl font-bold">Gizlilik önce gelir</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            ARKVIUM&apos;un hedefi sadece eşyayı buldurmak değil; kullanıcıyı
            koruyan, güvenli ve kontrollü bir dijital sahiplik altyapısı
            kurmaktır.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        <div className="flex justify-center">
          <ArkviumTamLogo genislik={170} />
        </div>
        <div className="mt-5">© 2026 ARKVIUM. Tüm hakları saklıdır.</div>
      </footer>
    </main>
  );
}
