/**
 * Hukuki belgelerin TEK KAYNAĞI.
 *
 * Adres, başlık ve sürüm burada tanımlanır; footer, sipariş formu ve
 * belgeler arası bağlantılar bu listeden üretilir. Elle yazılan adres
 * kalmaz, bir belge taşınırsa tüm bağlantılar birlikte güncellenir.
 *
 * `onayBelgeKodu` alanı `OrderConsent.belge` ile eşleşir (şemadaki
 * değerler: mesafeli_satis | on_bilgilendirme | kvkk_aydinlatma |
 * iade_kosullari). Sipariş sırasında hangi belgenin hangi SÜRÜMÜNÜN
 * onaylandığı ileride bu kodlarla kaydedilecektir.
 *
 * ────────────────────────────────────────────────────────────
 * SÜRÜM DİSİPLİNİ
 *
 * Bir belgenin METNİ değişirse `surum` ARTIRILIR. `OrderConsent` hangi
 * sürümün onaylandığını saklar; sürüm artırılmazsa geçmiş onaylar
 * yanlış metne işaret eder ve hukuki kanıt değerini yitirir.
 * ────────────────────────────────────────────────────────────
 */

export type HukukiBelge = {
  /** Sayfa adresi (baştaki "/" dâhil). */
  yol: string;
  baslik: string;
  /** Metin değişince artırılır. */
  surum: string;
  /**
   * `OrderConsent.belge` karşılığı. Sipariş onayına konu OLMAYAN
   * belgelerde (ör. gizlilik politikası) null'dur.
   */
  onayBelgeKodu: string | null;
  /** Sipariş formunda onay kutusunda gösterilecek mi. */
  siparisOnayinaDahil: boolean;
};

export const HUKUKI_BELGELER = {
  kvkkAydinlatma: {
    yol: "/kvkk-aydinlatma",
    baslik: "KVKK Aydınlatma Metni",
    // 2.0: metin koddaki gerçek veri akışlarına göre yeniden yazıldı.
    surum: "2.0",
    onayBelgeKodu: "kvkk_aydinlatma",
    siparisOnayinaDahil: true,
  },
  gizlilikPolitikasi: {
    yol: "/gizlilik-politikasi",
    baslik: "Gizlilik Politikası",
    // 2.0: metin koddaki gerçek davranışlara göre yeniden yazıldı.
    surum: "2.0",
    // Sipariş onayına konu değildir; bilgilendirme belgesidir.
    onayBelgeKodu: null,
    siparisOnayinaDahil: false,
  },
  onBilgilendirme: {
    yol: "/on-bilgilendirme-formu",
    baslik: "Ön Bilgilendirme Formu",
    surum: "1.0",
    onayBelgeKodu: "on_bilgilendirme",
    siparisOnayinaDahil: true,
  },
  mesafeliSatis: {
    yol: "/mesafeli-satis-sozlesmesi",
    baslik: "Mesafeli Satış Sözleşmesi",
    // 2.0: metin koddaki gerçek ürün ve işlemlere göre yeniden yazıldı.
    // OrderConsent bu sürümü kaydeder; geçmiş onaylar 1.0 olarak kalır.
    surum: "2.0",
    onayBelgeKodu: "mesafeli_satis",
    siparisOnayinaDahil: true,
  },
  teslimatIade: {
    yol: "/teslimat-iade-kosullari",
    baslik: "Teslimat, İptal ve İade Koşulları",
    surum: "1.0",
    onayBelgeKodu: "iade_kosullari",
    siparisOnayinaDahil: true,
  },
} as const satisfies Record<string, HukukiBelge>;

export const HUKUKI_BELGE_LISTESI: HukukiBelge[] =
  Object.values(HUKUKI_BELGELER);

/** Sipariş formunda onaylanması gereken belgeler. */
export const SIPARIS_ONAY_BELGELERI: HukukiBelge[] =
  HUKUKI_BELGE_LISTESI.filter((belge) => belge.siparisOnayinaDahil);

/**
 * Çerez politikası ayrı bir sayfadır ve hukuki belge listesine
 * DÂHİL DEĞİLDİR: sipariş onayına konu olmaz, çerez bildiriminden ve
 * footer'dan erişilir.
 */
export const CEREZ_POLITIKASI_YOLU = "/cerez-politikasi";

/**
 * Yayın öncesi doldurulması gereken alanların ortak işareti.
 *
 * Satıcı unvanı, adres, vergi bilgisi, iletişim kanalları ve yasal
 * saklama süreleri KODDAN DOĞRULANAMAZ. Uydurulmaları hukuken
 * yanıltıcı olur; bu yüzden metinlerde bu işaretle bırakılırlar.
 */
export const DOLDURULACAK = "[YAYIN ÖNCESİ DOLDURULACAK]";

/** Sipariş onayı çözümünün sonucu. */
export type SiparisOnayCozumu = {
  /** Kaydedilecek onaylar (belge kodu + SUNUCUDAKİ sürüm). */
  onaylar: Array<{ belge: string; surum: string }>;
  /** Onaylanmamış zorunlu belgelerin başlıkları. */
  eksikBaslikar: string[];
};

/**
 * İstemciden gelen onay kodlarını doğrular ve kaydedilecek listeyi üretir.
 *
 * ────────────────────────────────────────────────────────────
 * SÜRÜM İSTEMCİDEN ALINMAZ
 *
 * İstemci yalnızca HANGİ belgeyi onayladığını bildirir. Onaylanan metnin
 * SÜRÜMÜ her zaman buradaki kayıt defterinden okunur. Aksi hâlde istemci
 * "1.0'ı onayladım" diyerek yürürlükteki metinden farklı bir sürüme
 * onay verilmiş gibi gösterebilir ve kayıt hukuki kanıt değerini
 * yitirirdi.
 * ────────────────────────────────────────────────────────────
 *
 * Tanınmayan kodlar sessizce yok sayılır: kayıt defteri tek doğruluk
 * kaynağıdır ve bilinmeyen bir kod hiçbir belgeye karşılık gelmez.
 */
export function siparisOnaylariniCoz(kodlar: unknown): SiparisOnayCozumu {
  const gelen = new Set(
    Array.isArray(kodlar)
      ? kodlar
          .map((kod) => (typeof kod === "string" ? kod.trim() : ""))
          .filter(Boolean)
      : []
  );

  const onaylar: Array<{ belge: string; surum: string }> = [];
  const eksikBaslikar: string[] = [];

  for (const belge of SIPARIS_ONAY_BELGELERI) {
    if (!belge.onayBelgeKodu) {
      continue;
    }

    if (gelen.has(belge.onayBelgeKodu)) {
      onaylar.push({ belge: belge.onayBelgeKodu, surum: belge.surum });
    } else {
      eksikBaslikar.push(belge.baslik);
    }
  }

  return { onaylar, eksikBaslikar };
}

/** Zorunlu belgelerin tamamı onaylanmışsa true. */
export function siparisOnaylariTamMi(kodlar: unknown): boolean {
  return siparisOnaylariniCoz(kodlar).eksikBaslikar.length === 0;
}
