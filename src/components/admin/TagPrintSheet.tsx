"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ETIKET_ARALIK_MM,
  ETIKET_IC_BOSLUK_MM,
  ETIKET_MM,
  ETIKET_SUTUN,
  KART_ARALIK_MM,
  KART_BOY_MM,
  KART_EN_MM,
  KART_SUTUN,
  SAYFADA_ETIKET,
  SESSIZ_ALAN_MODUL,
  etiketSayfaSayisi,
  modulBoyutuMm,
  sessizAlanMm,
  yerlesimAl,
} from "./EtiketBaskiOlculeri";
import { baskiYapilandirmasi } from "@/lib/baski-yapilandirmasi";

/**
 * 30x30 mm etiket ve eşleştirilmiş aktivasyon kartı baskısı.
 *
 * EŞLEŞME GARANTİSİ
 * Etiket ızgarası ve kart ızgarası AYNI `etiketler` dizisini, aynı sırayla
 * dolaşır ve her ikisi de `publicToken` ile anahtarlanır. Ayrı bir eşleme
 * tablosu, ayrı bir sorgu veya ayrı bir sıralama YOKTUR; bu yüzden bir
 * QR'ın yanlış aktivasyon kartıyla eşleşmesi yapısal olarak imkânsızdır.
 *
 * ÖLÇÜ
 * Tüm ölçüler `mm` cinsindendir ve tek kaynaktan (EtiketBaskiOlculeri)
 * gelir. Kesim çizgisi `outline` ile çizilir; `border` kutuya eklenip
 * 30 mm'yi bozardı.
 *
 * AKTİVASYON KODU
 * Etiketin ÖN YÜZÜNDE aktivasyon kodu asla bulunmaz. Kod yalnızca ayrı
 * aktivasyon kartında, kazınacak alanın altında yer alır.
 *
 * BASKI ALANI NEDEN PORTAL İLE <body> ALTINA TAŞINIYOR?
 * Baskıda yönetim panelinin tamamı gizlenmelidir. `visibility: hidden`
 * yetmiyordu: gizlenen kutular düzende yer kaplamaya devam ediyor ve
 * 495 mm'lik panel yüksekliği A4'te ikinci bir BOŞ sayfa açıyordu.
 * Çözüm `display: none`, ama baskı alanı panelin içinde kalsaydı atasıyla
 * birlikte o da kaybolurdu. Portal sayesinde baskı alanı body'nin doğrudan
 * çocuğu olur ve globals.css içindeki
 * `body > *:not(#baski-alani) { display: none }` kuralı yazılabilir.
 */

type UretilenEtiket = {
  code: string;
  activationCode: string;
  publicToken: string;
};

type BaskiTuru = "etiket" | "kart";

function mm(deger: number): string {
  return `${deger}mm`;
}

export default function TagPrintSheet({
  etiketler,
  urunAdi,
  urunKod,
}: {
  etiketler: UretilenEtiket[];
  /** Baskı sayfasının üstünde hangi ürüne ait olduğu yazar. */
  urunAdi?: string;
  /**
   * Ürün kodu. 30x30 mm sayfasının gösterilip gösterilmeyeceğine bu değer
   * karar verir; tanımlı değilse hiçbir etiket baskısı sunulmaz.
   */
  urunKod?: string;
}) {
  const [tabanAdres, setTabanAdres] = useState("");
  const [kodGoster, setKodGoster] = useState(true);
  const [baskiTuru, setBaskiTuru] = useState<BaskiTuru>("etiket");
  const [yazdirilacak, setYazdirilacak] = useState(false);

  /** Portal yalnızca istemcide kurulabilir; sunucuda `document` yoktur. */
  const [baglandi, setBaglandi] = useState(false);

  useEffect(() => {
    const adres = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    setTabanAdres(adres.replace(/\/+$/, ""));
    setBaglandi(true);
  }, []);

  /*
    Yazdırma, doğru bölüm DOM'a girdikten SONRA açılmalı. Aynı tıklamada
    window.print() çağrılırsa tarayıcı bir önceki bölümü basar.
  */
  useEffect(() => {
    if (!yazdirilacak) {
      return;
    }

    const zamanlayici = window.setTimeout(() => {
      window.print();
      setYazdirilacak(false);
    }, 50);

    return () => window.clearTimeout(zamanlayici);
  }, [yazdirilacak]);

  if (etiketler.length === 0) {
    return null;
  }

  const yapilandirma = baskiYapilandirmasi(urunKod);
  const etiketYazdirmaVar = yapilandirma.etiketYazdirma;

  const yerlesim = yerlesimAl(kodGoster);
  const modul = modulBoyutuMm(kodGoster);
  const sessiz = sessizAlanMm(kodGoster);
  const sayfaSayisi = etiketSayfaSayisi(etiketler.length);

  function yazdir(tur: BaskiTuru) {
    setBaskiTuru(tur);
    setYazdirilacak(true);
  }

  /*
    Ekranda `display: none`. Yazdırmada globals.css içindeki kural onu
    `display: block` yapar. Kapsayıcıya HİÇBİR kenar boşluğu, dolgu veya
    yükseklik verilmez: tek bir artık boşluk ikinci sayfayı geri getirir.
  */
  const baskiAlani = (
    <div id="baski-alani" style={{ display: "none" }}>
      {baskiTuru === "etiket" ? (
        <div
          className="baski-izgara"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${ETIKET_SUTUN}, ${mm(ETIKET_MM)})`,
            gap: mm(ETIKET_ARALIK_MM),
            /*
              Genişlik SÜTUNLARDAN çıkar (5x30 + 4x6 = 174 mm). Basılabilir
              alanla (190 mm) birebir eşit sabit bir genişlik vermek,
              yuvarlamada yatay taşmaya ve fazladan sayfaya yol açabilir.
            */
            width: "max-content",
            justifyContent: "start",
            alignContent: "start",
          }}
        >
          {etiketler.map((etiket) => (
            <div
              key={etiket.publicToken}
              className="baski-parca"
              style={{
                width: mm(ETIKET_MM),
                height: mm(ETIKET_MM),
                boxSizing: "border-box",
                padding: mm(ETIKET_IC_BOSLUK_MM),
                background: "#ffffff",
                color: "#000000",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: mm(yerlesim.satirArasiMm),
                // outline kutu ölçüsüne eklenmez; etiket tam 30 mm kalır.
                outline: "0.1mm solid #c9c9c9",
                outlineOffset: 0,
              }}
            >
              <QRCodeSVG
                value={`${tabanAdres}/t/${etiket.publicToken}`}
                // Ölçü mm cinsinden verilir; piksel yuvarlaması olmaz.
                style={{
                  width: mm(yerlesim.qrKutuMm),
                  height: mm(yerlesim.qrKutuMm),
                  display: "block",
                }}
                level="M"
                marginSize={SESSIZ_ALAN_MODUL}
                bgColor="#ffffff"
                fgColor="#000000"
              />

              <span
                style={{
                  fontSize: mm(yerlesim.arkviumSatirMm * 0.78),
                  lineHeight: mm(yerlesim.arkviumSatirMm),
                  fontWeight: 700,
                  letterSpacing: "0.12mm",
                }}
              >
                ARKVIUM
              </span>

              {yerlesim.kodSatirMm !== null && (
                <span
                  style={{
                    fontSize: mm(yerlesim.kodSatirMm * 0.78),
                    lineHeight: mm(yerlesim.kodSatirMm),
                    fontFamily: "ui-monospace, monospace",
                    letterSpacing: "0.04mm",
                  }}
                >
                  {etiket.code}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="baski-izgara"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${KART_SUTUN}, ${mm(KART_EN_MM)})`,
            gap: mm(KART_ARALIK_MM),
            width: "max-content",
            justifyContent: "start",
            alignContent: "start",
          }}
        >
          {etiketler.map((etiket) => (
            <div
              key={etiket.publicToken}
              className="baski-parca"
              style={{
                width: mm(KART_EN_MM),
                height: mm(KART_BOY_MM),
                boxSizing: "border-box",
                padding: "3mm",
                background: "#ffffff",
                color: "#000000",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                outline: "0.1mm solid #c9c9c9",
                outlineOffset: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "2.6mm",
                    fontWeight: 700,
                    letterSpacing: "0.2mm",
                  }}
                >
                  ARKVIUM
                </span>

                {urunAdi && (
                  <span style={{ fontSize: "2mm", color: "#555555" }}>
                    {urunAdi}
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: "2mm", color: "#555555" }}>
                  Etiket kodu
                </span>

                <div
                  style={{
                    fontSize: "3.4mm",
                    fontFamily: "ui-monospace, monospace",
                    fontWeight: 700,
                    letterSpacing: "0.2mm",
                  }}
                >
                  {etiket.code}
                </div>
              </div>

              {/*
                Kazınacak alan. Aktivasyon kodu bu çerçevenin ALTINDA kalır;
                üzerine kazıma etiketi yapıştırılır. Kod yalnızca burada
                bulunur — QR etiketinin ön yüzünde asla yer almaz.
              */}
              <div
                style={{
                  border: "0.2mm dashed #777777",
                  borderRadius: "1mm",
                  padding: "1.4mm 2mm",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.8mm", color: "#777777" }}>
                  Kazınacak alan — aktivasyon kodu
                </div>

                <div
                  style={{
                    marginTop: "0.6mm",
                    fontSize: "3.6mm",
                    fontFamily: "ui-monospace, monospace",
                    fontWeight: 700,
                    letterSpacing: "0.3mm",
                  }}
                >
                  {etiket.activationCode}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/*
            30x30 mm sayfası YALNIZCA ölçüsü bu şekilde tanımlanmış üründe
            görünür. Karar `baski-yapilandirmasi` dosyasından gelir; ürün
            bilinmiyorsa düğme hiç basılmaz (güvenli varsayılan).
          */}
          {etiketYazdirmaVar && (
            <button
              type="button"
              onClick={() => yazdir("etiket")}
              disabled={!tabanAdres}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              30×30 mm QR etiketlerini yazdır
            </button>
          )}

          <button
            type="button"
            onClick={() => yazdir("kart")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Aktivasyon kartlarını yazdır
          </button>

          {etiketYazdirmaVar && (
            <label className="flex items-center gap-2 text-sm text-white/60">
              <input
                type="checkbox"
                checked={kodGoster}
                onChange={(e) => setKodGoster(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Etiket kodunu ön yüze bas
            </label>
          )}
        </div>

        {!etiketYazdirmaVar && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100/80">
            <p className="font-semibold text-amber-200">
              Baskı ölçüsü henüz tanımlanmadı
            </p>

            <p className="mt-1">{yapilandirma.aciklama}</p>
          </div>
        )}

        {etiketYazdirmaVar && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/60">
          <p className="font-semibold text-white">
            Yazdırma ayarları — ölçünün tutması için zorunlu
          </p>

          <p className="mt-1">
            Kâğıt <strong className="text-white/80">A4</strong> · Ölçek{" "}
            <strong className="text-white/80">%100</strong> · &quot;Sayfaya
            sığdır&quot; / &quot;Kenarlığa sığdır&quot;{" "}
            <strong className="text-white/80">KAPALI</strong>
          </p>

          <p className="mt-2 text-white/45">
            Sayfa başına {SAYFADA_ETIKET} etiket ({ETIKET_SUTUN} sütun) —{" "}
            {etiketler.length} etiket için {sayfaSayisi} sayfa. QR modül
            boyutu {modul.toFixed(3)} mm, sessiz alan {sessiz.toFixed(2)} mm (
            {SESSIZ_ALAN_MODUL} modül).
            {kodGoster
              ? " Etiket kodu ön yüzde olduğu için QR 1.8 mm küçüktür."
              : " Etiket kodu ön yüzde yok; QR en büyük hâlinde."}
          </p>

          <p className="mt-2 text-white/45">
            İlk baskıdan sonra cetvelle ölçün: bir etiket tam 30 mm olmalı.
            Tutmuyorsa ölçek %100 değildir.
          </p>
        </div>
        )}
      </div>

      {baglandi && createPortal(baskiAlani, document.body)}
    </>
  );
}
