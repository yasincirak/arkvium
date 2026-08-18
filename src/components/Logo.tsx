import Image from "next/image";

/**
 * ARKVIUM logosu — resmî marka dosyalarından kullanılır.
 *
 * Görseller `public/brand` altındadır; kaynak dosya da orada korunur.
 * Yalnızca kırpma, arka plan temizleme ve boyutlandırma uygulanmıştır;
 * logonun biçimi ve oranları değiştirilmez.
 *
 *  - `ArkviumAmblemi`: üst amblem (dar alanlar, header, favicon ölçüsü)
 *  - `Logo`: amblem + "ARKVIUM" yazısı (header)
 *  - `ArkviumTamLogo`: amblem + yazı + "Dijital Sahiplik Platformu" (footer)
 *
 * Alt slogan küçük ölçüde okunmadığı için header'da gösterilmez.
 */

/** Kırpılmış dosyaların en-boy oranları; boyutlandırma bunlarla yapılır. */
const AMBLEM_ORANI = 671 / 526;
const TAM_LOGO_ORANI = 955 / 766;

type AmblemProps = {
  /** Amblem yüksekliği (px). Genişlik orandan hesaplanır. */
  yukseklik?: number;
  className?: string;
};

export function ArkviumAmblemi({ yukseklik = 32, className }: AmblemProps) {
  return (
    <Image
      src="/brand/arkvium-logo-mark.png"
      alt=""
      width={Math.round(yukseklik * AMBLEM_ORANI)}
      height={yukseklik}
      className={className}
      priority
    />
  );
}

type TamLogoProps = {
  /** Tam logonun genişliği (px). Yükseklik orandan hesaplanır. */
  genislik?: number;
  className?: string;
};

export function ArkviumTamLogo({ genislik = 180, className }: TamLogoProps) {
  return (
    <Image
      src="/brand/arkvium-logo-full.png"
      alt="ARKVIUM — Dijital Sahiplik Platformu"
      width={genislik}
      height={Math.round(genislik / TAM_LOGO_ORANI)}
      className={className}
    />
  );
}

type LogoProps = {
  /** Yazı boyutu sınıfı. */
  yaziSinifi?: string;
  amblemYuksekligi?: number;
};

export default function Logo({
  yaziSinifi = "text-xl",
  amblemYuksekligi = 32,
}: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ArkviumAmblemi yukseklik={amblemYuksekligi} />

      <span
        className={`font-semibold tracking-[0.18em] text-[#101a3d] ${yaziSinifi}`}
      >
        ARKVIUM
      </span>
    </span>
  );
}
