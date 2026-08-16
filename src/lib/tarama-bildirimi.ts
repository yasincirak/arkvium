import { epostaGonder, taramaBildirimiEpostasi } from "./email";
import { hizSiniriKontrol } from "./rate-limit";

/**
 * Etiket okutulduğunda ürün sahibine bildirim.
 *
 * Yalnızca **kayıp** olarak işaretlenmiş eşyalarda çalışır: normal bir
 * eşyanın her okutulmasında mail göndermek hem gereksiz hem rahatsız edici
 * olurdu.
 *
 * Bildirim, genel erişim sayfası render edilirken çağrılır. Bu yüzden iki
 * kural vardır:
 *   1. Hiçbir hata sayfayı bozmamalıdır — her şey try/catch içindedir.
 *   2. Aynı eşya için saatte en fazla bir bildirim gider; yoksa sayfayı
 *      birkaç kez yenileyen biri sahibin posta kutusunu doldurur.
 */

type TaramaKaydi = {
  id: string;
  assetName: string;
  ownerName: string;
  email: string;
  status: string;
  userId?: string | null;
};

/** Aynı eşya için iki bildirim arası en az bu süre geçmelidir. */
const PENCERE_SANIYE = 60 * 60;

export async function taramaBildirimiGonder(
  record: TaramaKaydi,
  izleyenKullaniciId: string | null
): Promise<void> {
  if (record.status !== "lost" || !record.email) {
    return;
  }

  // Sahibi kendi ürün sayfasını açtığında (veya bağlantıyı önden yüklediğinde)
  // kendine "etiketiniz okutuldu" bildirimi gitmemelidir.
  if (izleyenKullaniciId && izleyenKullaniciId === record.userId) {
    return;
  }

  try {
    const sinir = await hizSiniriKontrol({
      kapsam: "tarama-bildirimi",
      tanimlayici: record.id,
      limit: 1,
      pencereSaniye: PENCERE_SANIYE,
    });

    if (!sinir.izinli) {
      return;
    }

    const zaman = new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
    });

    await epostaGonder({
      alici: record.email,
      ...taramaBildirimiEpostasi(record.ownerName, record.assetName, zaman),
    });
  } catch (hata) {
    // Bildirim gönderilemese bile bulan kişinin gördüğü sayfa çalışmaya devam eder.
    console.error("Tarama bildirimi gönderilemedi:", hata);
  }
}
