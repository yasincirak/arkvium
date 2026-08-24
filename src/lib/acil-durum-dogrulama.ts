/**
 * Acil Durum Profili doğrulama kuralları ve sabitleri.
 *
 * Bu dosya BİLEREK veritabanına bağımlı DEĞİLDİR: saf doğrulama mantığı
 * bağlantı gerektirmeden test edilebilsin diye ayrılmıştır.
 */

/** Onay metinlerinin sürümü. Metin değişirse bu değer de değişmelidir. */
export const ONAY_METNI_SURUMU = "taslak-v0";

/** Doğrulama sınırları (brief ile birebir). */
export const SINIRLAR = {
  displayName: 80,
  allergies: 500,
  medications: 500,
  medicalConditions: 500,
  emergencyNote: 750,
  contactName: 80,
  contactRelationship: 60,
  enFazlaKisi: 2,
} as const;

export const KAN_GRUPLARI = [
  "A_RH_POZITIF",
  "A_RH_NEGATIF",
  "B_RH_POZITIF",
  "B_RH_NEGATIF",
  "AB_RH_POZITIF",
  "AB_RH_NEGATIF",
  "SIFIR_RH_POZITIF",
  "SIFIR_RH_NEGATIF",
  "BILINMIYOR",
] as const;

export type KanGrubuDegeri = (typeof KAN_GRUPLARI)[number];

/** Kullanıcıya gösterilebilir doğrulama/yetki hatası. */
export class AcilDurumHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "AcilDurumHatasi";
  }
}

export function metniTemizle(deger: unknown): string {
  return typeof deger === "string" ? deger.trim() : "";
}

/**
 * Serbest metni doğrular.
 *
 * HTML/script kabul edilmez: `<` ve `>` içeren girdi reddedilir. React zaten
 * kaçış yapar; bu ek katman veritabanına işaretleme yazılmasını engeller.
 */
export function serbestMetin(
  deger: unknown,
  alanAdi: string,
  sinir: number
): string | null {
  const metin = metniTemizle(deger);

  if (!metin) {
    return null;
  }

  if (metin.length > sinir) {
    throw new AcilDurumHatasi(`${alanAdi} en fazla ${sinir} karakter olabilir.`);
  }

  if (/[<>]/.test(metin)) {
    throw new AcilDurumHatasi(`${alanAdi} alanında < ve > karakterleri kullanılamaz.`);
  }

  return metin;
}

/** Telefonu normalleştirir: yalnızca rakam ve baştaki artı korunur. */
export function telefonNormalize(deger: unknown): string {
  const ham = metniTemizle(deger);
  const artiVar = ham.startsWith("+");
  const rakamlar = ham.replace(/\D/g, "");

  if (rakamlar.length < 7 || rakamlar.length > 15) {
    throw new AcilDurumHatasi("Geçerli bir telefon numarası giriniz.");
  }

  return artiVar ? `+${rakamlar}` : rakamlar;
}

export function kanGrubuDogrula(deger: unknown): KanGrubuDegeri | null {
  const metin = metniTemizle(deger);

  if (!metin) {
    return null;
  }

  if (!(KAN_GRUPLARI as readonly string[]).includes(metin)) {
    throw new AcilDurumHatasi("Geçersiz kan grubu seçimi.");
  }

  return metin as KanGrubuDegeri;
}

export function bool(deger: unknown): boolean {
  return deger === true;
}

/**
 * Şifresi çözülmüş kan grubu değerini güvenle doğrular.
 *
 * `kanGrubuDogrula`'dan farkı: HATA FIRLATMAZ. Okuma yolunda kullanılır —
 * kurcalanmış, eski veya çözülemeyen bir değer sessizce `null` olur, yani
 * gösterilmez. Güvenli varsayılan göstermemektir.
 */
export function gecerliKanGrubu(deger: unknown): KanGrubuDegeri | null {
  const metin = metniTemizle(deger);

  return (KAN_GRUPLARI as readonly string[]).includes(metin)
    ? (metin as KanGrubuDegeri)
    : null;
}

/** Kan grubu enum değerinin ekranda gösterilecek karşılığı. */
export const KAN_GRUBU_ETIKETLERI: Record<KanGrubuDegeri, string> = {
  A_RH_POZITIF: "A Rh+",
  A_RH_NEGATIF: "A Rh−",
  B_RH_POZITIF: "B Rh+",
  B_RH_NEGATIF: "B Rh−",
  AB_RH_POZITIF: "AB Rh+",
  AB_RH_NEGATIF: "AB Rh−",
  SIFIR_RH_POZITIF: "0 Rh+",
  SIFIR_RH_NEGATIF: "0 Rh−",
  BILINMIYOR: "Bilinmiyor",
};
