import nodemailer from "nodemailer";

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

function tasiyiciOlustur() {
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
    console.error(
      "E-posta gönderilemedi: GMAIL_USER veya GMAIL_APP_PASSWORD tanımlı değil."
    );

    return {
      gonderildi: false,
      hataSebebi: "E-posta sağlayıcısı yapılandırılmamış.",
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
  gecerlilikDakika: number
): Omit<EpostaIcerigi, "alici"> {
  return {
    konu: "ARKVIUM şifre sıfırlama talebi",
    metin: `
Merhaba ${adSoyad || ""},

ARKVIUM hesabınız için şifre sıfırlama talebi aldık.

Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı kullanın:

${baglanti}

Bu bağlantı ${gecerlilikDakika} dakika boyunca geçerlidir ve yalnızca bir kez kullanılabilir.

Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.

ARKVIUM
Dijital Sahiplik Platformu
    `.trim(),
  };
}

export function epostaDogrulamaEpostasi(
  adSoyad: string | null,
  baglanti: string,
  gecerlilikSaat: number
): Omit<EpostaIcerigi, "alici"> {
  return {
    konu: "ARKVIUM e-posta adresinizi doğrulayın",
    metin: `
Merhaba ${adSoyad || ""},

ARKVIUM hesabınızı oluşturduğunuz için teşekkür ederiz.

E-posta adresinizi doğrulamak için aşağıdaki bağlantıyı kullanın:

${baglanti}

Bu bağlantı ${gecerlilikSaat} saat boyunca geçerlidir ve yalnızca bir kez kullanılabilir.

Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.

ARKVIUM
Dijital Sahiplik Platformu
    `.trim(),
  };
}
