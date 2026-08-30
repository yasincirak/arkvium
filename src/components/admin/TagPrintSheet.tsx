"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Üretilen etiketlerin baskı sayfası.
 *
 * Ekranda yalnızca "Yazdır" butonu görünür; etiket ızgarası sadece yazdırma
 * sırasında görünür hâle gelir (kurallar `globals.css` içindeki `@media print`
 * bloğunda). Yazdır penceresinden "PDF olarak kaydet" de seçilebilir.
 *
 * QR adresi `NEXT_PUBLIC_APP_URL` üzerinden kurulur. Baskıya giden QR yanlış
 * adrese giderse geri dönüşü olmadığı için ortam değişkeni önceliklidir;
 * tanımlı değilse tarayıcının açık olduğu adres kullanılır.
 */

type UretilenEtiket = {
  code: string;
  activationCode: string;
  publicToken: string;
};

export default function TagPrintSheet({
  etiketler,
  urunAdi,
}: {
  etiketler: UretilenEtiket[];
  /** Baskı sayfasının üstünde hangi ürüne ait olduğu yazar. */
  urunAdi?: string;
}) {
  const [tabanAdres, setTabanAdres] = useState("");
  const [aktivasyonGoster, setAktivasyonGoster] = useState(false);

  useEffect(() => {
    const adres = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    setTabanAdres(adres.replace(/\/+$/, ""));
  }, []);

  if (etiketler.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!tabanAdres}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          QR baskı sayfasını yazdır
        </button>

        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            checked={aktivasyonGoster}
            onChange={(e) => setAktivasyonGoster(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5"
          />
          Aktivasyon kodlarını da bas (kazınacak alan)
        </label>
      </div>

      {/* Ekranda gizli, yalnızca yazdırmada görünür. */}
      <div id="etiket-baski-alani" className="hidden print:block">
        {/*
          Baskı çıktısı matbaaya gider ve hangi ürüne ait olduğu kâğıttan
          anlaşılamazsa partiler karışır.
        */}
        {urunAdi && (
          <p className="mb-3 text-[12px] font-semibold text-black">
            {urunAdi} — {etiketler.length} etiket
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          {etiketler.map((etiket) => (
            <div
              key={etiket.publicToken}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-lg border border-dashed border-black/40 bg-white p-3 text-black"
            >
              {tabanAdres && (
                <QRCodeSVG
                  value={`${tabanAdres}/t/${etiket.publicToken}`}
                  size={110}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              )}

              <div className="text-center">
                <p className="text-[11px] font-semibold tracking-wide">
                  ARKVIUM
                </p>

                <p className="font-mono text-[13px] font-bold tracking-wider">
                  {etiket.code}
                </p>

                {aktivasyonGoster && (
                  <p className="mt-1 font-mono text-[11px]">
                    {etiket.activationCode}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
