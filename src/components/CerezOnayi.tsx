"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";
import { cerezOnayiKaydet, cerezOnayiOku } from "@/lib/analitik-istemci";
import type { OnayDurumu } from "@/lib/cerez-onayi";

/**
 * Çerez bildirimi ve tercih paneli.
 *
 * ────────────────────────────────────────────────────────────
 * DAVRANIŞ
 *
 * - Karar verilmemişse (veya politika sürümü değiştiyse) bildirim
 *   gösterilir. Karar verilene kadar HİÇBİR analitik çerez oluşmaz ve
 *   hiçbir olay gönderilmez (bkz. src/lib/cerez-onayi.ts).
 * - "Kabul Et" ve "Reddet" tek tıkla karar verdirir; ikisi de AYNI
 *   görsel ağırlıktadır. Reddetmeyi zorlaştırmak (koyu "kabul", silik
 *   "reddet") mevzuata aykırıdır.
 * - "Tercihler" kategori panelini açar: zorunlu çerezler kapatılamaz,
 *   analitik çerezler açılıp kapatılabilir.
 * - Karar verilmişse bildirim gösterilmez; kullanıcı footer'daki
 *   bağlantıdan paneli açıp tercihini değiştirebilir.
 *
 * Bildirim SAYFAYI ENGELLEMEZ: altta bir şerit olarak durur. Zorunlu
 * çerezler zaten çalıştığı için gezinme kilitlenmez.
 * ────────────────────────────────────────────────────────────
 *
 * Tercih sunucuya kaydedilir: reddetme, daha önce oluşmuş `httpOnly`
 * analitik çerezlerinin silinmesini de gerektirir ve bunu yalnızca
 * sunucu yapabilir.
 */

/** Footer bağlantısının paneli açmak için gönderdiği olay. */
export const CEREZ_PANELI_AC = "arkvium:cerez-panelini-ac";

export default function CerezOnayi() {
  const s = useSozluk();

  const [durum, setDurum] = useState<OnayDurumu | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);
  const [analitikSecili, setAnalitikSecili] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);

  // İlk okuma yalnızca tarayıcıda yapılır: sunucu render'ında çerez
  // bilinmediği için `null` kalır ve hiçbir şey çizilmez (hidrasyon
  // uyuşmazlığı oluşmaz).
  useEffect(() => {
    const mevcut = cerezOnayiOku();

    setDurum(mevcut);
    setAnalitikSecili(mevcut === "kabul");
  }, []);

  // Footer bağlantısı paneli açar.
  useEffect(() => {
    function ac() {
      const mevcut = cerezOnayiOku();

      setAnalitikSecili(mevcut === "kabul");
      setPanelAcik(true);
    }

    window.addEventListener(CEREZ_PANELI_AC, ac);

    return () => window.removeEventListener(CEREZ_PANELI_AC, ac);
  }, []);

  const karar = useCallback(async (yeni: "kabul" | "red") => {
    setCalisiyor(true);

    const basarili = await cerezOnayiKaydet(yeni);

    setCalisiyor(false);

    if (!basarili) {
      // Kaydedilemezse bildirim açık kalır; sessizce "kabul edildi"
      // sayılmaz.
      return;
    }

    setDurum(yeni);
    setAnalitikSecili(yeni === "kabul");
    setPanelAcik(false);
  }, []);

  // Karar verilmiş ve panel kapalıysa hiçbir şey gösterilmez.
  if (durum === null || (durum !== "belirsiz" && !panelAcik)) {
    return null;
  }

  const dugmeTemel =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition disabled:opacity-50";

  return (
    <div
      role="dialog"
      aria-label={s.cerez.baslik}
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgba(16,26,61,0.12)]"
    >
      <div className="mx-auto max-w-5xl px-5 py-5 sm:px-8 sm:py-6">
        <h2 className="text-base font-semibold text-[#101a3d]">
          {s.cerez.baslik}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {s.cerez.metin}
        </p>

        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link
            href="/cerez-politikasi"
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            {s.cerez.politikayiGor}
          </Link>

          <a
            href="/#guvenlik"
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
          >
            {s.cerez.gizliligiGor}
          </a>
        </p>

        {panelAcik && (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#101a3d]">
                    {s.cerez.zorunluBaslik}
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {s.cerez.zorunluMetin}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                  {s.cerez.zorunluDurum}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold text-[#101a3d]">
                    {s.cerez.analitikBaslik}
                  </span>

                  <span className="mt-1 block text-sm text-slate-600">
                    {s.cerez.analitikMetin}
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={analitikSecili}
                  onChange={(e) => setAnalitikSecili(e.target.checked)}
                  aria-label={s.cerez.analitikAc}
                  className="mt-1 h-5 w-5 shrink-0 accent-indigo-600"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {panelAcik ? (
            <>
              <button
                type="button"
                disabled={calisiyor}
                onClick={() => karar(analitikSecili ? "kabul" : "red")}
                className={`${dugmeTemel} bg-[#101a3d] text-white hover:bg-[#1b2a5e]`}
              >
                {s.cerez.tercihleriKaydet}
              </button>

              {durum !== "belirsiz" && (
                <button
                  type="button"
                  disabled={calisiyor}
                  onClick={() => setPanelAcik(false)}
                  className={`${dugmeTemel} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                >
                  {s.cerez.kapat}
                </button>
              )}
            </>
          ) : (
            <>
              {/*
                "Kabul Et" ve "Reddet" AYNI görsel ağırlıktadır; reddetmek
                kabul etmek kadar kolaydır.
              */}
              <button
                type="button"
                disabled={calisiyor}
                onClick={() => karar("kabul")}
                className={`${dugmeTemel} bg-[#101a3d] text-white hover:bg-[#1b2a5e]`}
              >
                {s.cerez.kabulEt}
              </button>

              <button
                type="button"
                disabled={calisiyor}
                onClick={() => karar("red")}
                className={`${dugmeTemel} bg-[#101a3d] text-white hover:bg-[#1b2a5e]`}
              >
                {s.cerez.reddet}
              </button>

              <button
                type="button"
                disabled={calisiyor}
                onClick={() => setPanelAcik(true)}
                className={`${dugmeTemel} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              >
                {s.cerez.tercihler}
              </button>
            </>
          )}
        </div>

        {panelAcik && durum !== "belirsiz" && (
          <p className="mt-3 text-xs text-slate-500">
            {durum === "kabul" ? s.cerez.mevcutKabul : s.cerez.mevcutRed}
          </p>
        )}
      </div>
    </div>
  );
}
