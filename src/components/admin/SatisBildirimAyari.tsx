"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Satış bildirimlerini aç/kapat" + telefona bildirim (web push) kurulumu.
 *
 * ANAHTAR DİSİPLİNİ: VAPID genel anahtarı derlemeye gömülmez; yönetici
 * oturumuyla korunan `/api/admin/push/anahtar` ucundan alınır. Gizli
 * anahtar tarayıcıya HİÇ gelmez.
 *
 * Bildirim izni yalnızca kullanıcı düğmeye bastığında istenir; sayfa
 * açılışında izin istenmez.
 */

type PushDurumu = "kapali" | "acik" | "desteklenmiyor" | "izin-yok";

/**
 * base64url VAPID anahtarını tarayıcının beklediği bayt dizisine çevirir.
 *
 * Dönüş tipi `ArrayBuffer` üzerinde kurulu bir `Uint8Array`'dir:
 * `pushManager.subscribe` paylaşımlı bellek (SharedArrayBuffer) kabul
 * etmediği için tampon açıkça `ArrayBuffer` olarak oluşturulur.
 */
function anahtariBaytaCevir(base64Url: string): Uint8Array<ArrayBuffer> {
  const dolgu = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + dolgu).replace(/-/g, "+").replace(/_/g, "/");
  const ham = window.atob(base64);
  const bayt = new Uint8Array(new ArrayBuffer(ham.length));

  for (let i = 0; i < ham.length; i += 1) {
    bayt[i] = ham.charCodeAt(i);
  }

  return bayt;
}

export default function SatisBildirimAyari() {
  const [acik, setAcik] = useState(true);
  const [pushYapilandirildi, setPushYapilandirildi] = useState(false);
  const [pushDurumu, setPushDurumu] = useState<PushDurumu>("kapali");
  const [calisiyor, setCalisiyor] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);

  const pushDestekleniyor = useCallback(
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    []
  );

  useEffect(() => {
    let iptal = false;

    async function yukle() {
      try {
        const yanit = await fetch("/api/admin/bildirim-ayari", {
          cache: "no-store",
        });

        if (yanit.ok) {
          const veri = await yanit.json();

          if (!iptal) {
            setAcik(Boolean(veri?.acik));
            setPushYapilandirildi(Boolean(veri?.pushYapilandirildi));
          }
        }

        if (!pushDestekleniyor()) {
          if (!iptal) {
            setPushDurumu("desteklenmiyor");
          }

          return;
        }

        const kayit = await navigator.serviceWorker.getRegistration("/sw.js");
        const abonelik = await kayit?.pushManager.getSubscription();

        if (!iptal) {
          setPushDurumu(abonelik ? "acik" : "kapali");
        }
      } catch {
        // Sessiz: ayar okunamazsa varsayılan gösterilir.
      } finally {
        if (!iptal) {
          setYukleniyor(false);
        }
      }
    }

    void yukle();

    return () => {
      iptal = true;
    };
  }, [pushDestekleniyor]);

  async function anahtarDegistir(yeniDeger: boolean) {
    setCalisiyor(true);
    setHata("");
    setMesaj("");

    try {
      const yanit = await fetch("/api/admin/bildirim-ayari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acik: yeniDeger }),
      });

      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri?.error || "Ayar kaydedilemedi.");

        return;
      }

      setAcik(yeniDeger);
      setMesaj(
        yeniDeger
          ? "Satış bildirimleri açıldı."
          : "Satış bildirimleri kapatıldı."
      );
    } catch {
      setHata("Bağlantı kurulamadı.");
    } finally {
      setCalisiyor(false);
    }
  }

  async function telefonaBildirimAc() {
    setCalisiyor(true);
    setHata("");
    setMesaj("");

    try {
      if (!pushDestekleniyor()) {
        setPushDurumu("desteklenmiyor");
        setHata("Bu tarayıcı web push bildirimini desteklemiyor.");

        return;
      }

      const izin = await Notification.requestPermission();

      if (izin !== "granted") {
        setPushDurumu("izin-yok");
        setHata("Bildirim izni verilmedi.");

        return;
      }

      const anahtarYanit = await fetch("/api/admin/push/anahtar", {
        cache: "no-store",
      });

      const anahtarVeri = await anahtarYanit.json();

      if (!anahtarYanit.ok || !anahtarVeri?.publicKey) {
        setHata(anahtarVeri?.error || "Sunucu anahtarı alınamadı.");

        return;
      }

      const kayit = await navigator.serviceWorker.register("/sw.js");

      await navigator.serviceWorker.ready;

      const abonelik = await kayit.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: anahtariBaytaCevir(
          String(anahtarVeri.publicKey)
        ),
      });

      const ham = abonelik.toJSON();

      const kayitYanit = await fetch("/api/admin/push/abone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: ham.endpoint,
          keys: ham.keys,
        }),
      });

      if (!kayitYanit.ok) {
        const kayitVeri = await kayitYanit.json();

        setHata(kayitVeri?.error || "Abonelik kaydedilemedi.");

        return;
      }

      setPushDurumu("acik");
      setMesaj("Bu cihaza satış bildirimi gönderilecek.");
    } catch {
      setHata("Bildirim açılamadı.");
    } finally {
      setCalisiyor(false);
    }
  }

  async function telefonaBildirimKapat() {
    setCalisiyor(true);
    setHata("");
    setMesaj("");

    try {
      const kayit = await navigator.serviceWorker.getRegistration("/sw.js");
      const abonelik = await kayit?.pushManager.getSubscription();

      if (abonelik) {
        await fetch("/api/admin/push/abone", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: abonelik.endpoint }),
        });

        await abonelik.unsubscribe();
      }

      setPushDurumu("kapali");
      setMesaj("Bu cihaza bildirim gönderilmeyecek.");
    } catch {
      setHata("Bildirim kapatılamadı.");
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Satış bildirimleri
            </h2>

            <p className="mt-1 text-sm text-white/50">
              Kapatıldığında bu hesabın cihazlarına yeni sipariş bildirimi
              gönderilmez. Panel bildirim listesi etkilenmez.
            </p>
          </div>

          <button
            type="button"
            disabled={calisiyor || yukleniyor}
            onClick={() => anahtarDegistir(!acik)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              acik
                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {acik ? "Açık — kapat" : "Kapalı — aç"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">
          Telefona bildirim (web push)
        </h2>

        <p className="mt-1 text-sm text-white/50">
          Bu cihazda açtığınızda, ödeme onaylandığı anda telefonunuza
          bildirim düşer. Her cihaz için ayrı açılır.
        </p>

        {!pushYapilandirildi && !yukleniyor && (
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">
            Sunucuda VAPID anahtarları tanımlı değil. Push bildirimi
            kapalıdır; ortam değişkenleri eklendikten sonra açılabilir.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {pushDurumu === "acik" ? (
            <button
              type="button"
              disabled={calisiyor}
              onClick={telefonaBildirimKapat}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              Bu cihazda kapat
            </button>
          ) : (
            <button
              type="button"
              disabled={
                calisiyor ||
                yukleniyor ||
                !pushYapilandirildi ||
                pushDurumu === "desteklenmiyor"
              }
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              onClick={telefonaBildirimAc}
            >
              Bu cihazda aç
            </button>
          )}

          <span className="text-sm text-white/50">
            {pushDurumu === "acik"
              ? "Durum: açık"
              : pushDurumu === "desteklenmiyor"
                ? "Bu tarayıcı desteklemiyor"
                : pushDurumu === "izin-yok"
                  ? "Bildirim izni verilmedi"
                  : "Durum: kapalı"}
          </span>
        </div>

        <p className="mt-4 text-xs text-white/40">
          iPhone&apos;da çalışması için siteyi Safari&apos;de açıp &quot;Ana
          Ekrana Ekle&quot; ile yükledikten sonra bu düğmeye basın; iOS web
          push yalnızca ana ekrana eklenmiş sitelerde çalışır.
        </p>
      </div>

      {mesaj && (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {mesaj}
        </p>
      )}

      {hata && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          {hata}
        </p>
      )}
    </div>
  );
}
