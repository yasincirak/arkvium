/**
 * Hero carousel illüstrasyonları.
 *
 * Fotoğraf kullanılmaz: sade çizgi SVG'ler sayfanın mevcut koyu zemin +
 * indigo vurgu diline uyar, ek istek yapmaz ve her ekranda net kalır.
 * Renkler `currentColor` ve indigo tonlarıyla verilir; her illüstrasyon
 * kendi kapsayıcısını doldurur.
 */

const CIZGI = "stroke-white/40";
const VURGU = "stroke-indigo-400";
const DOLGU = "fill-white/[0.04]";

/** Tüm illüstrasyonların ortak sarmalayıcısı. */
function Cerceve({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 240"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Küçük QR kodu simgesi — etiketin bulunduğu yeri işaretler. */
function QrIsareti({
  x,
  y,
  boyut = 34,
}: {
  x: number;
  y: number;
  boyut?: number;
}) {
  const b = boyut;
  const k = b / 7;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={b}
        height={b}
        rx={k * 0.8}
        className={`${VURGU} fill-indigo-500/15`}
      />
      <rect x={k} y={k} width={k * 1.6} height={k * 1.6} className={VURGU} />
      <rect
        x={b - k * 2.6}
        y={k}
        width={k * 1.6}
        height={k * 1.6}
        className={VURGU}
      />
      <rect
        x={k}
        y={b - k * 2.6}
        width={k * 1.6}
        height={k * 1.6}
        className={VURGU}
      />
      <path
        d={`M${b - k * 2.6} ${b - k * 2.6}h${k * 1.6}v${k * 1.6}`}
        className={VURGU}
      />
    </g>
  );
}

/** 1. Eşyalar: çanta, anahtar ve valiz. */
export function EsyalarIllustrasyonu() {
  return (
    <Cerceve>
      {/* Valiz */}
      <rect x="24" y="96" width="96" height="112" rx="12" className={`${CIZGI} ${DOLGU}`} />
      <path d="M52 96V80a12 12 0 0 1 12-12h16a12 12 0 0 1 12 12v16" className={CIZGI} />
      <path d="M24 132h96M24 172h96" className={CIZGI} />
      <path d="M56 208v12M88 208v12" className={CIZGI} />
      <QrIsareti x={54} y={136} />

      {/* Çanta */}
      <path
        d="M152 120h96l10 88h-116z"
        className={`${CIZGI} ${DOLGU}`}
      />
      <path d="M176 120V96a24 24 0 0 1 48 0v24" className={CIZGI} />
      <path d="M162 152h76" className={CIZGI} />

      {/* Anahtar */}
      <circle cx="264" cy="44" r="20" className={VURGU} />
      <circle cx="264" cy="44" r="7" className={CIZGI} />
      <path d="M264 64v44M264 88h14M264 100h10" className={VURGU} />
    </Cerceve>
  );
}

/** 2. Araçlar: ön camında QR sticker bulunan araç. */
export function AraclarIllustrasyonu() {
  return (
    <Cerceve>
      {/* Gövde */}
      <path
        d="M40 176v-28l20-52a16 16 0 0 1 15-11h90a16 16 0 0 1 15 11l20 52v28"
        className={`${CIZGI} ${DOLGU}`}
      />
      <path d="M40 176h160" className={CIZGI} />
      {/* Ön cam */}
      <path d="M74 96h92l14 44H60z" className={`${CIZGI} fill-white/[0.06]`} />
      <path d="M120 96v44" className={CIZGI} />
      {/* Farlar ve tekerlekler */}
      <path d="M52 152h18M170 152h18" className={CIZGI} />
      <circle cx="76" cy="188" r="16" className={CIZGI} />
      <circle cx="164" cy="188" r="16" className={CIZGI} />
      {/* Cama yapıştırılan QR sticker */}
      <QrIsareti x={130} y={102} boyut={30} />
      <path d="M210 118h34" className={`${VURGU} opacity-60`} />
      <path d="M210 134h22" className={`${VURGU} opacity-40`} />
      {/* Güvenli bildirim balonu */}
      <path
        d="M232 44h56a12 12 0 0 1 12 12v36a12 12 0 0 1-12 12h-30l-14 14v-14h-12a12 12 0 0 1-12-12V56a12 12 0 0 1 12-12z"
        className={`${VURGU} fill-indigo-500/10`}
      />
      <path d="M248 68h24M248 82h16" className={`${CIZGI} opacity-80`} />
    </Cerceve>
  );
}

/** 3. Evcil hayvanlar: QR künyeli kedi ve köpek. */
export function EvcilHayvanlarIllustrasyonu() {
  return (
    <Cerceve>
      {/* Köpek: sarkık kulaklar ve burunla ayırt edilir */}
      <path
        d="M62 74c-14 6-16 26-12 42 3 12 12 16 20 12"
        className={`${CIZGI} ${DOLGU}`}
      />
      <path
        d="M126 74c14 6 16 26 12 42-3 12-12 16-20 12"
        className={`${CIZGI} ${DOLGU}`}
      />
      <circle cx="94" cy="98" r="34" className={`${CIZGI} ${DOLGU}`} />
      <circle cx="82" cy="92" r="3" className="fill-white/60 stroke-none" />
      <circle cx="106" cy="92" r="3" className="fill-white/60 stroke-none" />
      <ellipse cx="94" cy="116" rx="17" ry="12" className={CIZGI} />
      <ellipse cx="94" cy="110" rx="5" ry="4" className="fill-white/60 stroke-none" />
      <path d="M94 116v6M94 122c-4 5-9 5-12 1M94 122c4 5 9 5 12 1" className={CIZGI} />
      {/* Tasma + künye */}
      <path d="M68 146h52" className={VURGU} />
      <path d="M94 146v8" className={VURGU} />
      <QrIsareti x={80} y={154} boyut={28} />

      {/* Kedi: sivri kulaklar ve bıyıklarla ayırt edilir */}
      <path d="M204 78l-6-28 26 14" className={`${CIZGI} ${DOLGU}`} />
      <path d="M248 78l6-28-26 14" className={`${CIZGI} ${DOLGU}`} />
      <circle cx="226" cy="100" r="32" className={`${CIZGI} ${DOLGU}`} />
      <circle cx="214" cy="94" r="3" className="fill-white/60 stroke-none" />
      <circle cx="238" cy="94" r="3" className="fill-white/60 stroke-none" />
      <path d="M226 110l-6 6h12z" className="fill-white/60 stroke-none" />
      <path d="M226 116v5M226 121c-4 5-9 5-11 1M226 121c4 5 9 5 11 1" className={CIZGI} />
      <path
        d="M196 108h-18M196 118h-16M256 108h18M256 118h16"
        className="stroke-white/25"
      />
      <path d="M202 144h48" className={VURGU} />
      <path d="M226 144v8" className={VURGU} />
      <QrIsareti x={213} y={152} boyut={26} />
    </Cerceve>
  );
}

/** 4. Güvenli iletişim: QR okutan telefon ve gizlenen numara. */
export function GuvenliIletisimIllustrasyonu() {
  return (
    <Cerceve>
      {/* Telefon */}
      <rect x="40" y="36" width="112" height="184" rx="18" className={`${CIZGI} ${DOLGU}`} />
      <path d="M82 52h28" className={CIZGI} />
      <rect
        x="56"
        y="72"
        width="80"
        height="112"
        rx="10"
        className="stroke-white/15 fill-white/[0.03]"
      />
      <QrIsareti x={72} y={88} boyut={48} />
      {/* Tarama çerçevesi */}
      <path
        d="M64 84v-8h8M128 76h8v8M136 148v8h-8M72 156h-8v-8"
        className={VURGU}
      />
      <path d="M60 152h72" className={`${VURGU} opacity-70`} />

      {/* Mesaj balonu */}
      <path
        d="M186 60h86a14 14 0 0 1 14 14v50a14 14 0 0 1-14 14h-52l-20 18v-18h-14a14 14 0 0 1-14-14V74a14 14 0 0 1 14-14z"
        className={`${VURGU} fill-indigo-500/10`}
      />
      <path d="M204 88h50M204 106h34" className={`${CIZGI} opacity-80`} />

      {/* Gizlenen numara: kalkan */}
      <path
        d="M236 168l32 12v24c0 18-13 30-32 36-19-6-32-18-32-36v-24z"
        className={`${CIZGI} fill-white/[0.04]`}
      />
      <path d="M222 202h28" className={VURGU} />
      <circle cx="230" cy="192" r="3" className="fill-white/40 stroke-none" />
      <circle cx="242" cy="192" r="3" className="fill-white/40 stroke-none" />
      <circle cx="254" cy="192" r="3" className="fill-white/40 stroke-none" />
    </Cerceve>
  );
}
