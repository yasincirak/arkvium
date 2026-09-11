/**
 * Analitik tarih aralığı çözümü — saf fonksiyonlar, veritabanı bağımlılığı yok.
 *
 * ZAMAN DİLİMİ: Rapor "bugün", "son 7 gün" gibi ifadeleri TÜRKİYE saatine
 * göre yorumlar. Sunucu UTC çalıştığı için gün sınırı yerel saatten
 * hesaplanmaz; sabit +03:00 farkıyla üretilir. Türkiye 2016'dan beri yaz
 * saati uygulamadığı için bu fark yıl boyunca sabittir ve kayma oluşmaz.
 */

/** Türkiye saatinin UTC'ye göre farkı (dakika). */
const TR_FARKI_DAKIKA = 180;

const GUN_MS = 24 * 60 * 60 * 1000;

export type AralikAnahtari = "bugun" | "7g" | "30g" | "ozel";

export type Aralik = {
  anahtar: AralikAnahtari;
  /** Dâhil (>=). */
  baslangic: Date;
  /** Hariç (<). Böylece gün sınırında çift sayım olmaz. */
  bitis: Date;
  /** Ekranda gösterilecek Türkçe etiket. */
  etiket: string;
};

export function aralikAnahtariMi(deger: unknown): deger is AralikAnahtari {
  return (
    deger === "bugun" || deger === "7g" || deger === "30g" || deger === "ozel"
  );
}

/** Verilen anın Türkiye saatine göre gün başlangıcını (UTC olarak) verir. */
export function trGunBasi(an: Date): Date {
  const trAn = new Date(an.getTime() + TR_FARKI_DAKIKA * 60 * 1000);

  const gunBasiTr = Date.UTC(
    trAn.getUTCFullYear(),
    trAn.getUTCMonth(),
    trAn.getUTCDate()
  );

  return new Date(gunBasiTr - TR_FARKI_DAKIKA * 60 * 1000);
}

/**
 * "YYYY-AA-GG" metnini Türkiye saatine göre gün başlangıcına çevirir.
 * Biçim bozuksa veya tarih geçersizse null döner.
 */
export function tarihMetniniCoz(deger: unknown): Date | null {
  if (typeof deger !== "string") {
    return null;
  }

  const eslesme = deger.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!eslesme) {
    return null;
  }

  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const gun = Number(eslesme[3]);

  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) {
    return null;
  }

  const an = new Date(
    Date.UTC(yil, ay - 1, gun) - TR_FARKI_DAKIKA * 60 * 1000
  );

  if (Number.isNaN(an.getTime())) {
    return null;
  }

  // Ay taşmasını yakalar (ör. 2026-02-31 → 3 Mart olurdu).
  const trAn = new Date(an.getTime() + TR_FARKI_DAKIKA * 60 * 1000);

  if (
    trAn.getUTCFullYear() !== yil ||
    trAn.getUTCMonth() !== ay - 1 ||
    trAn.getUTCDate() !== gun
  ) {
    return null;
  }

  return an;
}

/** Tarihi form alanında gösterilecek "YYYY-AA-GG" biçimine çevirir. */
export function tarihMetniYaz(an: Date): string {
  const trAn = new Date(an.getTime() + TR_FARKI_DAKIKA * 60 * 1000);

  return [
    String(trAn.getUTCFullYear()).padStart(4, "0"),
    String(trAn.getUTCMonth() + 1).padStart(2, "0"),
    String(trAn.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Özel aralıkta izin verilen en fazla gün sayısı. */
export const EN_FAZLA_OZEL_GUN = 366;

/**
 * Analitik olaylarının SAKLAMA SÜRESİ (gün).
 *
 * KVKK veri minimizasyonu: kayıtlar süresiz tutulmaz, bu süreden eski
 * satırlar otomatik silinir (bkz. src/lib/analitik.ts).
 *
 * DEĞİŞMEZ KURAL: `EN_FAZLA_OZEL_GUN` değerinden KÜÇÜK OLAMAZ. Aksi
 * hâlde kullanıcının seçebildiği en geniş aralığın bir kısmı zaten
 * silinmiş olur ve rapor sessizce eksik veri gösterirdi. Bu kural birim
 * testiyle korunuyor.
 *
 * Aralık sınırıyla aynı dosyada durmasının nedeni budur: iki değer
 * birbirine bağlıdır ve ayrı dosyalarda kalırsa biri değişince diğeri
 * unutulur.
 */
export const ANALITIK_SAKLAMA_GUNU = 400;

/**
 * Adres çubuğundaki filtre parametrelerinden aralık üretir.
 *
 * Geçersiz veya eksik değerlerde sessizce "son 7 gün"e düşer; kullanıcı
 * elle adres yazarak sorguyu bozamaz.
 *
 * `simdi` parametresi testler için dışarıdan verilebilir.
 */
export function aralikCoz(
  parametreler: { aralik?: unknown; bas?: unknown; bit?: unknown },
  simdi: Date = new Date()
): Aralik {
  const anahtar = aralikAnahtariMi(parametreler?.aralik)
    ? parametreler.aralik
    : "7g";

  const bugunBasi = trGunBasi(simdi);
  const yarinBasi = new Date(bugunBasi.getTime() + GUN_MS);

  if (anahtar === "bugun") {
    return {
      anahtar: "bugun",
      baslangic: bugunBasi,
      bitis: yarinBasi,
      etiket: "Bugün",
    };
  }

  if (anahtar === "30g") {
    return {
      anahtar: "30g",
      baslangic: new Date(bugunBasi.getTime() - 29 * GUN_MS),
      bitis: yarinBasi,
      etiket: "Son 30 gün",
    };
  }

  if (anahtar === "ozel") {
    const bas = tarihMetniniCoz(parametreler?.bas);
    const bit = tarihMetniniCoz(parametreler?.bit);

    if (bas && bit) {
      // Bitiş günü DÂHİL sayılır: kullanıcı 1–1 Eylül seçtiğinde 1 Eylül
      // günü boyunca olan olaylar rapora girer.
      const bitisHaric = new Date(bit.getTime() + GUN_MS);

      if (bitisHaric > bas) {
        const gunSayisi = Math.round(
          (bitisHaric.getTime() - bas.getTime()) / GUN_MS
        );

        if (gunSayisi <= EN_FAZLA_OZEL_GUN) {
          return {
            anahtar: "ozel",
            baslangic: bas,
            bitis: bitisHaric,
            etiket: `${tarihMetniYaz(bas)} – ${tarihMetniYaz(bit)}`,
          };
        }
      }
    }

    // Geçersiz özel aralık: varsayılana düşülür, hata gösterilmez.
  }

  return {
    anahtar: anahtar === "ozel" ? "7g" : anahtar,
    baslangic: new Date(bugunBasi.getTime() - 6 * GUN_MS),
    bitis: yarinBasi,
    etiket: "Son 7 gün",
  };
}
