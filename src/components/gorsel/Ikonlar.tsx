/**
 * Arayüz ikonları.
 *
 * Küçük, işlevsel çizgi ikonlardır; ürün veya kullanım senaryosu görseli
 * DEĞİLDİR (onlar fotoğrafla gösterilir). Tümü özgün olarak çizilmiştir.
 */

function Cerceve({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10 stroke-indigo-600"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Telefonla okutma — kolaylık. */
export function IkonTarama() {
  return (
    <Cerceve>
      <rect x="16" y="6" width="16" height="36" rx="4" />
      <path d="M8 14V9a3 3 0 0 1 3-3h3M40 14V9a3 3 0 0 0-3-3h-3M8 34v5a3 3 0 0 0 3 3h3M40 34v5a3 3 0 0 1-3 3h-3" />
      <rect x="21" y="20" width="6" height="6" rx="1" />
    </Cerceve>
  );
}

/** Kalkan — gizlilik. */
export function IkonKalkan() {
  return (
    <Cerceve>
      <path d="M24 5l14 5v11c0 9-6 15-14 18-8-3-14-9-14-18V10z" />
      <path d="M18 24h12" />
      <circle cx="20" cy="19" r="1.5" className="fill-indigo-600" />
      <circle cx="24" cy="19" r="1.5" className="fill-indigo-600" />
      <circle cx="28" cy="19" r="1.5" className="fill-indigo-600" />
    </Cerceve>
  );
}

/** Ok döngüsü — etiketin taşınabilirliği. */
export function IkonTasima() {
  return (
    <Cerceve>
      <path d="M10 20a14 14 0 0 1 24-8" />
      <path d="M38 28a14 14 0 0 1-24 8" />
      <path d="M34 6v7h-7M14 42v-7h7" />
    </Cerceve>
  );
}

/** Panel — tek yerden yönetim. */
export function IkonPanel() {
  return (
    <Cerceve>
      <rect x="6" y="8" width="36" height="32" rx="4" />
      <path d="M6 18h36M18 18v22" />
      <path d="M25 26h10M25 32h7" />
    </Cerceve>
  );
}
