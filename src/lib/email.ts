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
  zaman: string
): Omit<EpostaIcerigi, "alici"> {
  return {
    konu: `ARKVIUM: "${urunAdi}" etiketiniz okutuldu`,
    metin: `
Merhaba ${adSoyad || ""},

Kayıp olarak işaretlediğiniz "${urunAdi}" adlı eşyanızın QR etiketi az önce okutuldu.

Okutulma zamanı: ${zaman}

Eşyayı bulan kişi iletişim formunu doldurursa bilgileri ayrı bir e-posta ile size ulaşacaktır.
Bu bildirim yalnızca etiketin okutulduğunu gösterir; eşyanın kesin konumunu içermez.

Aynı eşya için bu bildirim saatte en fazla bir kez gönderilir.

ARKVIUM
Dijital Sahiplik Platformu
    `.trim(),
  };
}

export function devirDavetiEpostasi(
  gonderenAdSoyad: string | null,
  urunAdi: string,
  baglanti: string,
  gecerlilikSaat: number
): Omit<EpostaIcerigi, "alici"> {
  return {
    konu: "ARKVIUM ürün sahipliği devri daveti",
    metin: `
Merhaba,

${gonderenAdSoyad || "Bir ARKVIUM kullanıcısı"} "${urunAdi}" adlı ürünün sahipliğini size devretmek istiyor.

Daveti incelemek ve onaylamak için aşağıdaki bağlantıyı kullanın:

${baglanti}

Bu bağlantı ${gecerlilikSaat} saat boyunca geçerlidir ve yalnızca bir kez kullanılabilir.
Ürün, siz onaylamadan hesabınıza geçmez.

Bu daveti beklemiyorsanız bu e-postayı yok sayabilirsiniz.

ARKVIUM
Dijital Sahiplik Platformu
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
  takipAdresi: string | null
): Omit<EpostaIcerigi, "alici"> {
  return {
    konu: `ARKVIUM siparişiniz alındı (${siparisNumarasi})`,
    metin: `
Merhaba ${adSoyad || ""},

Ödemeniz alındı ve siparişiniz oluşturuldu.

Sipariş numarası: ${siparisNumarasi}
Toplam tutar: ${tutarMetni}

Siparişiniz hazırlanıp kargoya verildiğinde bilgilendirileceksiniz.
${takipAdresi ? `\nSipariş durumunuzu buradan izleyebilirsiniz:\n${takipAdresi}\n` : ""}
Ürününüz elinize ulaştığında QR etiketini ARKVIUM hesabınızdan
etkinleştirmeyi unutmayın.

ARKVIUM
Dijital Sahiplik Platformu
    `.trim(),
  };
}
