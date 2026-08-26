"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { VARSAYILAN_DIL, type Dil } from "./diller";
import { SOZLUKLER } from "./sozlukler";
import type { Sozluk } from "./tr";

/**
 * İstemci bileşenleri için sözlük.
 *
 * Sunucu bileşenleri `sozluk()` çağırır; istemci bileşenleri çereze veya
 * `headers()`'a erişemediği için aktif dili buradan alır.
 *
 * Dil KÖKTE, sunucuda belirlenir ve sağlayıcıya prop olarak verilir. Yani
 * istemci hiçbir zaman dil tahmini yapmaz; ilk render doğru dildedir ve
 * hidrasyon uyuşmazlığı oluşmaz.
 */

const DilBaglami = createContext<Dil>(VARSAYILAN_DIL);

export function DilSaglayici({
  dil,
  children,
}: {
  dil: Dil;
  children: ReactNode;
}) {
  return <DilBaglami.Provider value={dil}>{children}</DilBaglami.Provider>;
}

/** Aktif dilin sözlüğü. */
export function useSozluk(): Sozluk {
  const dil = useContext(DilBaglami);

  return useMemo(() => SOZLUKLER[dil], [dil]);
}

/** Aktif dil kodu — tarih ve sayı biçimlendirmesi için. */
export function useDil(): Dil {
  return useContext(DilBaglami);
}

/** İstemci tarafında sunucu mesajını çeviren yardımcı. */
export function useMesajCevir(): (metin: string) => string {
  const ceviri = useSozluk();

  return (metin: string) =>
    (ceviri.mesajlar as Record<string, string>)[metin] ?? metin;
}
