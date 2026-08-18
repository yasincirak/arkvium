/**
 * ARKVIUM logosu.
 *
 * İşaret, bir QR kodunun sol üst köşesindeki okuma karesinden ve onu takip
 * eden üç noktadan oluşur: "okut ve bağlan" fikrini tek bir sade biçimde
 * anlatır. Ayrıntı bilinçli olarak azdır; 16 pikselde de favicon olarak
 * okunabilsin diye kalın çizgi ve büyük boşluk kullanılır.
 *
 * Açık zeminde kullanılır: yazı ve çerçeve koyu lacivert, okuma karesi mor.
 */

const LACIVERT = "#101a3d";
const MOR = "#4f46e5";

type IsaretProps = {
  /** Kare kenar uzunluğu (px). */
  boyut?: number;
  className?: string;
};

/** Yalnızca işaret — favicon veya dar alanlar için. */
export function ArkviumIsareti({ boyut = 32, className }: IsaretProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={boyut}
      height={boyut}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        stroke={LACIVERT}
        strokeWidth="2.5"
      />
      {/* QR okuma karesi */}
      <rect
        x="8"
        y="8"
        width="10"
        height="10"
        rx="2.5"
        stroke={MOR}
        strokeWidth="2.5"
      />
      {/* Bağlantıyı sürdüren noktalar */}
      <circle cx="23" cy="13" r="1.8" fill={LACIVERT} />
      <circle cx="23" cy="23" r="1.8" fill={LACIVERT} />
      <circle cx="13" cy="23" r="1.8" fill={LACIVERT} />
    </svg>
  );
}

type LogoProps = {
  /** Yazı boyutu sınıfı; başlık ve footer farklı ölçülerde kullanır. */
  yaziSinifi?: string;
  isaretBoyutu?: number;
};

export default function Logo({
  yaziSinifi = "text-2xl",
  isaretBoyutu = 32,
}: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ArkviumIsareti boyut={isaretBoyutu} />

      <span
        className={`font-bold tracking-tight text-[#101a3d] ${yaziSinifi}`}
      >
        ARKV<span className="text-indigo-600">IUM</span>
      </span>
    </span>
  );
}
