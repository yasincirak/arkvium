import webpush from "web-push";
import { prisma } from "./prisma";

/**
 * Web push gönderimi (yönetici telefonuna bildirim).
 *
 * ────────────────────────────────────────────────────────────
 * ANAHTAR DİSİPLİNİ
 *
 * VAPID GİZLİ ANAHTARI YALNIZCA SUNUCUDA DURUR. Bu dosya hiçbir zaman
 * istemci bundle'ına girmez (`prisma` importu zaten sunucuya bağlar) ve
 * gizli anahtar hiçbir yanıta, loga veya hataya yazılmaz.
 *
 * Genel (public) anahtar `NEXT_PUBLIC_` öneki ile YAYINLANMAZ: tarayıcıya
 * yalnızca yönetici oturumuyla korunan `/api/admin/push/anahtar` ucundan
 * verilir. Böylece anahtar istemci derlemesine gömülmez.
 * ────────────────────────────────────────────────────────────
 *
 * ────────────────────────────────────────────────────────────
 * GECİKME DİSİPLİNİ
 *
 * Push gönderimi ÖDEME DÖNÜŞÜNÜ BEKLETMEZ. Üç kural birlikte çalışır:
 *
 *  1. Gönderimler PARALEL yapılır (`Promise.allSettled`); cihaz sayısı
 *     arttıkça gecikme çarpan etkisi yapmaz.
 *  2. Her gönderimin kendi süre sınırı vardır: soket zaman aşımı
 *     (`timeout`) tek başına yetmez — o yalnızca soketin sessiz kaldığı
 *     süreyi ölçer, yavaş ama akan bir yanıtı kesmez. Bu yüzden ayrıca
 *     mutlak bir süre sınırı uygulanır.
 *  3. Çağıran taraf `pushGonderiminiBaslat` ile EN FAZLA
 *     `PUSH_BEKLEME_SINIRI_MS` bekler. Gönderim bu süreden uzun sürerse
 *     arka planda devam eder, çağıran akış beklemeden ilerler.
 *
 * BİLDİRİM HATASI SİPARİŞİ BOZMAZ: bu dosyadaki hiçbir fonksiyon hata
 * fırlatmaz. Push gönderilemese bile ödeme, sipariş ve panel bildirimi
 * olduğu gibi kalır.
 * ────────────────────────────────────────────────────────────
 */

/**
 * Tek bir push isteğinin soket zaman aşımı (ms).
 *
 * `web-push` bu değeri soketin sessiz kalabileceği süre olarak kullanır.
 */
const PUSH_SOKET_ZAMAN_ASIMI_MS = 4000;

/**
 * Tek bir push isteğinin MUTLAK süre sınırı (ms).
 *
 * Soket zaman aşımından farklıdır: yanıt yavaş yavaş aksa bile istek bu
 * süreden uzun süre kaynak tutamaz.
 */
const PUSH_ISTEK_SINIRI_MS = 5000;

/**
 * Çağıran akışın (ödeme dönüşü) push için bekleyeceği EN FAZLA süre (ms).
 *
 * Bu süre dolduğunda gönderim iptal EDİLMEZ, arka planda sürer; yalnızca
 * çağıran beklemeyi bırakır ve müşteri sonuç sayfasına yönlendirilir.
 */
export const PUSH_BEKLEME_SINIRI_MS = 1500;

/**
 * Bir sözü belirtilen süreden uzun beklemez.
 *
 * Zamanlayıcı `unref` edilir: bekleme dolmadan iş biterse zamanlayıcı
 * Node sürecini ayakta tutmaz (testlerde askıda kalmayı önler).
 */
function sinirliBekle(soz: Promise<unknown>, sureMs: number): Promise<void> {
  return new Promise<void>((cozumle) => {
    const zamanlayici = setTimeout(cozumle, sureMs);

    (zamanlayici as unknown as { unref?: () => void }).unref?.();

    void soz.then(
      () => {
        clearTimeout(zamanlayici);
        cozumle();
      },
      () => {
        clearTimeout(zamanlayici);
        cozumle();
      }
    );
  });
}

/** Tek gönderimi mutlak süre sınırına bağlar. */
function sureSinirli<T>(soz: Promise<T>, sureMs: number): Promise<T> {
  return new Promise<T>((cozumle, reddet) => {
    const zamanlayici = setTimeout(() => {
      reddet(new Error("push-sure-asimi"));
    }, sureMs);

    (zamanlayici as unknown as { unref?: () => void }).unref?.();

    void soz.then(
      (deger) => {
        clearTimeout(zamanlayici);
        cozumle(deger);
      },
      (hata) => {
        clearTimeout(zamanlayici);
        reddet(hata);
      }
    );
  });
}

export type PushYapilandirmasi = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/**
 * Ortam değişkenlerini okur.
 *
 * Eksikse null döner ve push sessizce KAPALI kalır; sabit yedek anahtar
 * kullanılmaz (oturum anahtarlarındaki kalıbın aynısı).
 */
export function pushYapilandirmasi(): PushYapilandirmasi | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  // `subject` iletişim adresidir; push servisleri "mailto:" veya "https://"
  // ister. Biçim bozuksa gönderim yapılmaz.
  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function pushEtkinMi(): boolean {
  return pushYapilandirmasi() !== null;
}

/** Tarayıcıya verilecek genel anahtar (gizli anahtar ASLA verilmez). */
export function pushGenelAnahtari(): string | null {
  return pushYapilandirmasi()?.publicKey ?? null;
}

export type PushIcerigi = {
  baslik: string;
  metin: string;
  /** Tıklanınca açılacak uygulama içi yol (ör. /admin/orders/<id>). */
  yol: string;
  /** Aynı siparişin bildirimi cihazda tekrarlanmasın diye kullanılır. */
  etiket: string;
};

/**
 * Yöneticinin tüm cihazlarına bildirim gönderir.
 *
 * Abonelik geçersizse (404/410) kayıt SİLİNİR: push servisi o cihazı
 * tanımıyorsa kaydı tutmak her satışta boşuna deneme üretirdi.
 */
export async function yoneticilerePushGonder(
  icerik: PushIcerigi
): Promise<{ gonderilen: number; basarisiz: number }> {
  const yapilandirma = pushYapilandirmasi();

  if (!yapilandirma) {
    return { gonderilen: 0, basarisiz: 0 };
  }

  try {
    webpush.setVapidDetails(
      yapilandirma.subject,
      yapilandirma.publicKey,
      yapilandirma.privateKey
    );
  } catch {
    // Anahtar biçimi geçersiz. Ayrıntı LOGLANMAZ: anahtar değerini
    // hata mesajıyla birlikte açığa çıkarabilir.
    console.error("VAPID anahtarları geçersiz; push gönderilmedi.");

    return { gonderilen: 0, basarisiz: 0 };
  }

  let abonelikler: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }> = [];

  try {
    abonelikler = await prisma.pushSubscription.findMany({
      where: {
        user: {
          role: "ADMIN",
          // Bildirimi KAPATMIŞ yöneticiye gönderilmez. Ayar satırı yoksa
          // varsayılan açıktır, bu yüzden `is: null` da kabul edilir.
          OR: [
            { notificationSetting: { is: null } },
            { notificationSetting: { satisBildirimleriAcik: true } },
          ],
        },
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
  } catch (hata) {
    console.error("Push abonelikleri okunamadı:", (hata as Error)?.name);

    return { gonderilen: 0, basarisiz: 0 };
  }

  const govde = JSON.stringify({
    baslik: icerik.baslik,
    metin: icerik.metin,
    yol: icerik.yol,
    etiket: icerik.etiket,
  });

  /*
    Gönderimler PARALEL yapılır. Sıralı döngüde bir cihazın yavaşlığı
    diğerlerinin süresine EKLENİYORDU; cihaz sayısı arttıkça toplam
    gecikme çarpan etkisi yapıyordu.
  */
  const sonuclar = await Promise.allSettled(
    abonelikler.map(async (abonelik) => {
      try {
        await sureSinirli(
          webpush.sendNotification(
            {
              endpoint: abonelik.endpoint,
              keys: { p256dh: abonelik.p256dh, auth: abonelik.auth },
            },
            govde,
            { TTL: 60 * 60 * 24, timeout: PUSH_SOKET_ZAMAN_ASIMI_MS }
          ),
          PUSH_ISTEK_SINIRI_MS
        );
      } catch (hata) {
        const durum = (hata as { statusCode?: number })?.statusCode;

        try {
          if (durum === 404 || durum === 410) {
            // Push servisi cihazı tanımıyor: kaydı tutmak her satışta
            // boşuna deneme üretirdi.
            await prisma.pushSubscription.delete({
              where: { id: abonelik.id },
            });
          } else {
            await prisma.pushSubscription.update({
              where: { id: abonelik.id },
              data: { failureCount: { increment: 1 } },
            });
          }
        } catch {
          // Temizlik başarısız olsa bile diğer gönderimler sürmelidir.
        }

        // Sağlayıcı yanıtının gövdesi LOGLANMAZ; yalnızca durum kodu.
        console.error("Push gönderilemedi. Durum:", durum ?? "bilinmeyen");

        throw hata;
      }

      try {
        await prisma.pushSubscription.update({
          where: { id: abonelik.id },
          data: { lastSuccessAt: new Date(), failureCount: 0 },
        });
      } catch {
        // Başarı damgası yazılamaması gönderimi başarısız yapmaz.
      }
    })
  );

  const gonderilen = sonuclar.filter(
    (sonuc) => sonuc.status === "fulfilled"
  ).length;

  return { gonderilen, basarisiz: sonuclar.length - gonderilen };
}

/**
 * Push gönderimini başlatır ve çağıran akışı BEKLETMEZ.
 *
 * En fazla `PUSH_BEKLEME_SINIRI_MS` beklenir; gönderim daha uzun sürerse
 * arka planda devam eder ve çağıran (ödeme dönüşü) ilerler. Hata hiçbir
 * koşulda dışarı sızmaz: reddedilen söz daha oluşturulduğu anda
 * yakalanır, bu yüzden "unhandled rejection" oluşmaz.
 */
export async function pushGonderiminiBaslat(
  icerik: PushIcerigi
): Promise<void> {
  // `.catch` ZİNCİRİN BAŞINDA bağlanır: bekleme sınırı dolup çağıran
  // ilerlese bile arka plandaki hata sahipsiz kalmaz.
  const gonderim = yoneticilerePushGonder(icerik).catch((hata) => {
    console.error("Push gönderimi başarısız:", (hata as Error)?.name);

    return { gonderilen: 0, basarisiz: 0 };
  });

  await sinirliBekle(gonderim, PUSH_BEKLEME_SINIRI_MS);
}
