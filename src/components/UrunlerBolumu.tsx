import {
  KARGO_NOTU,
  SIPARIS_URUNLERI,
  SIPARIS_WHATSAPP_NUMARASI,
} from "@/lib/siparis";
import { whatsappBaglantisi } from "@/lib/telefon";

/**
 * Ana sayfadaki "Ürünler ve Fiyatlar" bölümü.
 *
 * Sipariş WhatsApp üzerinden elle alınır: her kart, ürünün adı hazır yazılmış
 * bir sohbet açar. Numara ve ürün bilgisi `@/lib/siparis` içinde tek yerde
 * durur; burada tekrar yazılmaz.
 */
export default function UrunlerBolumu() {
  return (
    <section id="urunler" className="border-y border-[#e5e0ff] bg-[#f6f4ff]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-center text-3xl font-bold">Ürünler ve Fiyatlar</h2>

        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
          Etiketini seç, WhatsApp&apos;tan sipariş ver. Etiketin eline
          ulaştığında hesabına bağlayıp eşyanla eşleştirirsin.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SIPARIS_URUNLERI.map((urun) => {
            const siparisAdresi = whatsappBaglantisi(
              SIPARIS_WHATSAPP_NUMARASI,
              urun.siparisMesaji
            );

            return (
              <div
                key={urun.kod}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md"
              >
                <h3 className="text-xl font-semibold">{urun.ad}</h3>

                <p className="mt-3 flex-1 leading-relaxed text-slate-600">{urun.aciklama}</p>

                <div className="mt-6">
                  <div className="text-2xl font-bold">{urun.fiyat}</div>
                  <div className="mt-1 text-sm text-slate-500">{KARGO_NOTU}</div>
                </div>

                {siparisAdresi && (
                  <a
                    href={siparisAdresi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex justify-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-500"
                  >
                    WhatsApp&apos;tan Sipariş Ver
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
