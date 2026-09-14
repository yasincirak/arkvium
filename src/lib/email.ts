import nodemailer from "nodemailer";
import { VARSAYILAN_DIL, type Dil } from "./i18n/diller";
import { sozlukAl } from "./i18n/sozlukler";

/**
 * E-posta gönderim katmanı.
 *
 * Uygulama kodu doğrudan nodemailer'a bağlanmaz; ileride başka bir sağlayıcıya
 * (Resend, Postmark vb.) geçilmesi gerektiğinde yalnızca bu dosya değişir.
 *
 * Sağlayıcı yapılandırılmamışsa gönderim BAŞARILI gibi davranılmaz;
 * `gonderildi: false` döner ve çağıran taraf durumu kaydeder.
 */

export type EpostaSonucu = {
  gonderildi: boolean;
  hataSebebi?: string;
};

export type EpostaIcerigi = {
  alici: string;
  konu: string;
  metin: string;
};

/**
 * Testlerde e-posta gönderimini tamamen kapatmak için kullanılır.
 *
 * Boş string yeterli değildir: Next.js `next start` sırasında .env
 * dosyalarını yükler ve boş değerlerin üzerine yazar; bu durumda testler
 * gerçek Gmail hesabıyla gerçek e-posta gönderebilirdi.
 */
function epostaKapaliMi(): boolean {
  return process.env.EPOSTA_GONDERIMI_KAPALI === "1";
}

function tasiyiciOlustur() {
  if (epostaKapaliMi()) {
    return null;
  }

  const kullanici = process.env.GMAIL_USER;
  const sifre = process.env.GMAIL_APP_PASSWORD;

  if (!kullanici || !sifre) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: kullanici, pass: sifre },
  });
}

export function epostaYapilandirilmisMi(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function epostaGonder(
  icerik: EpostaIcerigi
): Promise<EpostaSonucu> {
  const tasiyici = tasiyiciOlustur();

  if (!tasiyici) {
    // Sahte başarı üretilmez; eksik yapılandırma açıkça bildirilir.
    if (!epostaKapaliMi()) {
      console.error(
        "E-posta gönderilemedi: GMAIL_USER veya GMAIL_APP_PASSWORD tanımlı değil."
      );
    }

    return {
      gonderildi: false,
      hataSebebi: epostaKapaliMi()
        ? "E-posta gönderimi kapalı."
        : "E-posta sağlayıcısı yapılandırılmamış.",
    };
  }

  try {
    await tasiyici.sendMail({
      from: `"ARKVIUM" <${process.env.GMAIL_USER}>`,
      to: icerik.alici,
      subject: icerik.konu,
      text: icerik.metin,
    });

    return { gonderildi: true };
  } catch (hata) {
    // Hata mesajı loglanır; kullanıcıya sistem detayı gösterilmez.
    console.error("E-posta gönderilemedi:", hata);

    return {
      gonderildi: false,
      hataSebebi: hata instanceof Error ? hata.message : "Bilinmeyen hata",
    };
  }
}

/** Uygulamanın genel adresi. Bağlantı üretiminde kullanılır. */
export function uygulamaAdresi(): string | null {
  const adres = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!adres) {
    console.error(
      "NEXT_PUBLIC_APP_URL tanımlı değil; e-posta bağlantıları üretilemiyor."
    );

    return null;
  }

  return adres.replace(/\/+$/, "");
}

export function sifreSifirlamaEpostasi(
  adSoyad: string | null,
  baglanti: string,
  gecerlilikDakika: number,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.sifreSifirlama.konu,
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.sifreSifirlama.giris}

${c.sifreSifirlama.yonerge}

${baglanti}

${c.sifreSifirlama.gecerlilik.replace("{sure}", String(gecerlilikDakika))}

${c.sifreSifirlama.uyari}

${c.imza}
    `.trim(),
  };
}

export function epostaDogrulamaEpostasi(
  adSoyad: string | null,
  baglanti: string,
  gecerlilikSaat: number,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.dogrulama.konu,
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.dogrulama.giris}

${c.dogrulama.yonerge}

${baglanti}

${c.dogrulama.gecerlilik.replace("{sure}", String(gecerlilikSaat))}

${c.dogrulama.uyari}

${c.imza}
    `.trim(),
  };
}

/**
 * Ürün sahipliği devri daveti.
 * Devir yalnızca alıcı bu bağlantıdan onay verirse gerçekleşir.
 */
/**
 * Kayıp olarak işaretli bir eşyanın etiketi okutulduğunda sahibine gider.
 * Bulan kişi form doldurmasa bile sahibi haberdar olur.
 */
export function taramaBildirimiEpostasi(
  adSoyad: string | null,
  urunAdi: string,
  zaman: string,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.tarama.konu.replace("{urun}", urunAdi),
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.tarama.giris.replace("{urun}", urunAdi)}

${c.tarama.zaman.replace("{zaman}", zaman)}

${c.tarama.aciklama}

${c.tarama.siklik}

${c.imza}
    `.trim(),
  };
}

export function devirDavetiEpostasi(
  gonderenAdSoyad: string | null,
  urunAdi: string,
  baglanti: string,
  gecerlilikSaat: number,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.devir.konu,
    metin: `
${c.merhaba},

${c.devir.giris
  .replace("{gonderen}", gonderenAdSoyad || c.devir.birKullanici)
  .replace("{urun}", urunAdi)}

${c.devir.yonerge}

${baglanti}

${c.devir.gecerlilik.replace("{sure}", String(gecerlilikSaat))}

${c.devir.uyari}

${c.imza}
    `.trim(),
  };
}

/**
 * Ödemesi tamamlanan siparişin müşteriye gönderilen onayı.
 *
 * Kart bilgisi, ödeme sağlayıcısı token'ı veya adres detayı İÇERMEZ:
 * yalnızca sipariş numarası, tutar ve takip bağlantısı yer alır.
 */
export function siparisOnayEpostasi(
  adSoyad: string | null,
  siparisNumarasi: string,
  tutarMetni: string,
  takipAdresi: string | null,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.siparisOnay.konu.replace("{numara}", siparisNumarasi),
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.siparisOnay.giris}

${c.siparisOnay.numara.replace("{numara}", siparisNumarasi)}
${c.siparisOnay.tutar.replace("{tutar}", tutarMetni)}

${c.siparisOnay.kargo}
${takipAdresi ? `\n${c.siparisOnay.takip}\n${takipAdresi}\n` : ""}
${c.siparisOnay.hatirlatma}

${c.imza}
    `.trim(),
  };
}

/**
 * Sipariş iptal bildirimi.
 *
 * Adres, telefon, kart verisi veya ödeme sağlayıcısı anahtarı İÇERMEZ.
 * Para iadesinin yapılıp yapılmayacağı ÇAĞIRAN tarafından bildirilir;
 * bu şablon kendi başına iade taahhüdü üretmez.
 */
export function siparisIptalEpostasi(
  adSoyad: string | null,
  siparisNumarasi: string,
  tutarMetni: string,
  paraIadesiGerekir: boolean,
  takipAdresi: string | null,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.siparisIptal.konu.replace("{numara}", siparisNumarasi),
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.siparisIptal.giris}

${c.siparisIptal.numara.replace("{numara}", siparisNumarasi)}
${c.siparisIptal.tutar.replace("{tutar}", tutarMetni)}

${paraIadesiGerekir ? c.siparisIptal.iadeBaslatilacak : c.siparisIptal.iadeYok}
${takipAdresi ? `\n${c.siparisIptal.takip}\n${takipAdresi}\n` : ""}
${c.imza}
    `.trim(),
  };
}

/**
 * Kargoya verildi bildirimi.
 *
 * Kargo firması, takip numarası ve takip bağlantısı YALNIZCA sunucuda
 * doğrulanmış değerlerden gelir (bkz. src/lib/kargo.ts). Bilgi yoksa
 * uydurulmaz: müşteriye bilginin sonradan görüneceği söylenir.
 */
export function siparisKargoEpostasi(
  adSoyad: string | null,
  siparisNumarasi: string,
  kargo: {
    firmaAdi: string | null;
    takipNo: string | null;
    takipUrl: string | null;
  },
  takipAdresi: string | null,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  // Yarım bilgi gösterilmez; ikisi de yoksa bilgi satırı hiç yazılmaz.
  const kargoVar = Boolean(kargo.firmaAdi && kargo.takipNo);

  const kargoBolumu = kargoVar
    ? [
        c.siparisKargo.firma.replace("{firma}", kargo.firmaAdi as string),
        c.siparisKargo.takipNo.replace("{takipNo}", kargo.takipNo as string),
        kargo.takipUrl
          ? `\n${c.siparisKargo.kargoTakip}\n${kargo.takipUrl}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : c.siparisKargo.bilgiYok;

  return {
    konu: c.siparisKargo.konu.replace("{numara}", siparisNumarasi),
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.siparisKargo.giris}

${c.siparisKargo.numara.replace("{numara}", siparisNumarasi)}

${kargoBolumu}
${takipAdresi ? `\n${c.siparisKargo.takip}\n${takipAdresi}\n` : ""}
${c.imza}
    `.trim(),
  };
}

/**
 * İade tamamlandı bildirimi.
 *
 * YALNIZCA gerçekten tamamlanmış iade için gönderilir. Sağlayıcı işlem
 * kimliği, ödeme anahtarı veya kart verisi İÇERMEZ.
 */
export function siparisIadeEpostasi(
  adSoyad: string | null,
  siparisNumarasi: string,
  tutarMetni: string,
  takipAdresi: string | null,
  dil: Dil = VARSAYILAN_DIL
): Omit<EpostaIcerigi, "alici"> {
  const c = sozlukAl(dil).eposta;

  return {
    konu: c.siparisIade.konu.replace("{numara}", siparisNumarasi),
    metin: `
${c.merhaba} ${adSoyad || ""},

${c.siparisIade.giris}

${c.siparisIade.numara.replace("{numara}", siparisNumarasi)}
${c.siparisIade.tutar.replace("{tutar}", tutarMetni)}

${c.siparisIade.sure}
${takipAdresi ? `\n${c.siparisIade.takip}\n${takipAdresi}\n` : ""}
${c.imza}
    `.trim(),
  };
}
