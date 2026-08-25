import Image from "next/image";

/**
 * ARKVIUM ürün ve kullanım görselleri.
 *
 * Görseller ARKVIUM'a aittir (bkz. THIRD_PARTY_ASSETS.md) ve ürünlerin
 * kendisini QR etiketiyle birlikte gösterir. Üçüncü taraf stok fotoğrafı
 * kullanılmaz.
 */

type GorselTanimi = {
  src: string;
  alt: string;
  /** CSS object-position — kadrajın hangi bölgeyi öne çıkaracağı. */
  konum: string;
};

export type GorselAnahtari =
  | "acil-durum"
  | "hero"
  | "arac"
  | "sticker-seti"
  | "anahtarlik"
  | "evcil-hayvan"
  | "valiz"
  | "mesajlasma"
  | "aktivasyon";

const GORSELLER: Record<GorselAnahtari, GorselTanimi> = {
  "acil-durum": {
    src: "/gorseller/acil-durum.jpg",
    alt: "Sedyedeki motosikletlinin kaskındaki QR kodu telefonuyla okutan sağlık personeli; arkada açık kapılı ambulans",
    /*
     * Kadraj: QR okutma anı (telefon + kasktaki QR) yatayda %45'te durur.
     * Kaynak 2:1'e yakın olduğu için 4:3 ve 5:4 kutularda yatay kırpma
     * yapılır; %45 hem masaüstünde hem mobilde bu anı çerçeve içinde tutar.
     */
    konum: "45% 50%",
  },
  hero: {
    src: "/gorseller/hero.jpg",
    alt: "Lacivert çantaya takılı QR etiketi telefonuyla okutan kişi; yanında QR etiketli anahtarlar ve evcil hayvan tasması",
    konum: "60% 50%",
  },
  arac: {
    src: "/gorseller/arac.jpg",
    alt: "Araç ön camına yapıştırılmış QR sticker'ı telefonuyla okutan kişi",
    konum: "50% 50%",
  },
  "sticker-seti": {
    src: "/gorseller/sticker-seti.jpg",
    alt: "Laptop kılıfı, defter ve ekipman çantası üzerine yapıştırılmış QR sticker'lar",
    konum: "50% 50%",
  },
  anahtarlik: {
    src: "/gorseller/anahtarlik.jpg",
    alt: "Araç anahtarı ve anahtarlara takılı QR kodlu metal ARKVIUM etiketi",
    konum: "50% 55%",
  },
  "evcil-hayvan": {
    src: "/gorseller/evcil-hayvan.jpg",
    alt: "Lacivert tasmasında QR kodlu yuvarlak künye taşıyan golden retriever",
    konum: "50% 45%",
  },
  valiz: {
    src: "/gorseller/valiz.jpg",
    alt: "Havalimanında lacivert valize takılmış QR kodlu bagaj etiketi",
    konum: "50% 55%",
  },
  mesajlasma: {
    src: "/gorseller/mesajlasma.jpg",
    alt: "Telefonunda gelen mesajı okuyan kişi; masada QR etiketli anahtarlar",
    konum: "62% 50%",
  },
  aktivasyon: {
    src: "/gorseller/aktivasyon.jpg",
    alt: "Masada QR etiketini telefonuyla okutarak hesabına bağlayan kişi",
    konum: "50% 50%",
  },
};

/** Ürün kodundan görsel anahtarına eşleme. */
const URUN_GORSELI: Record<string, GorselAnahtari> = {
  "sticker-seti": "sticker-seti",
  "arac-stickeri": "arac",
  "metal-anahtarlik": "anahtarlik",
  "evcil-hayvan-kunyesi": "evcil-hayvan",
  "valiz-etiketi": "valiz",
};

export function urunGorselAnahtari(kod: string): GorselAnahtari | null {
  return URUN_GORSELI[kod] ?? null;
}

/**
 * Görseli kapsayıcısını dolduracak şekilde gösterir.
 *
 * Kapsayıcı sabit en-boy oranı taşır; bu yüzden `fill` kullanılır ve
 * layout kayması oluşmaz.
 */
export function Gorsel({
  anahtar,
  sizes,
  oncelikli = false,
  className,
}: {
  anahtar: GorselAnahtari;
  sizes: string;
  /** Yalnızca ekranın üstündeki görselde true olmalı. */
  oncelikli?: boolean;
  className?: string;
}) {
  const gorsel = GORSELLER[anahtar];

  return (
    <Image
      src={gorsel.src}
      alt={gorsel.alt}
      fill
      sizes={sizes}
      priority={oncelikli}
      loading={oncelikli ? undefined : "lazy"}
      style={{ objectFit: "cover", objectPosition: gorsel.konum }}
      className={className}
    />
  );
}

/**
 * "Temsili görsel" rozeti.
 *
 * Ürün ve senaryo görselleri yapay zekâ ile üretilmiştir; gerçek ürün
 * fotoğrafı değildir. Rozet okunaklıdır ama dikkat dağıtmaz: küçük, düşük
 * kontrastlı ve köşede durur. Görsel kapsayıcısının içine, `Gorsel` ile
 * kardeş olarak yerleştirilir.
 */
export function TemsiliRozet() {
  return (
    <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-sm">
      Temsili görsel
    </span>
  );
}

/**
 * Sayfanın en arka katmanındaki ARKVIUM logosu.
 *
 * Yalnızca dekoratiftir: `aria-hidden`, tıklanamaz ve çok düşük opaklıkta
 * durur; metin kontrastını bozmaz. Ekranın üstünde olmadığı için lazy
 * yüklenir.
 */
export function ArkaPlanLogosu() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <Image
        src="/gorseller/logo-arka.jpg"
        alt=""
        fill
        sizes="100vw"
        loading="lazy"
        style={{ objectFit: "cover", objectPosition: "50% 50%" }}
        className="opacity-[0.07]"
      />
      {/* Zemini beyaza yaklaştırıp metin kontrastını güvenceye alır. */}
      <div className="absolute inset-0 bg-white/55" />
    </div>
  );
}
