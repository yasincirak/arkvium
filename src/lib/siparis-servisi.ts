import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { sepetHesapla, type SepetGirdisi } from "./sepet";
import { publicTokenUret } from "./tags";

/**
 * Sipariş oluşturma servisi.
 *
 * Bu katman ÖDEME YAPMAZ ve QR ETİKETİ AYIRMAZ: yalnızca `pending` durumda
 * sipariş kaydı üretir. QR rezervasyonu (`OrderTag`) ve ödeme (`Payment`)
 * sonraki aşamalara aittir; bu dosya `Tag` kayıtlarına hiç dokunmaz.
 *
 * GÜVENLİK:
 * - İstemciden yalnızca ürün kodu, adet ve teslimat bilgisi kabul edilir.
 *   Tutarların tamamı `sepetHesapla` ile sunucuda üretilir.
 * - Misafir sipariş desteklenir: oturum zorunlu değildir, `userId` boş kalır.
 * - `publicToken` kriptografiktir; sipariş takip adresi veritabanı ID'si
 *   içermez (etiket sisteminde kullanılan aynı üretici).
 */

/** Sipariş anında saklanan teslimat ve iletişim bilgileri. */
export type TeslimatBilgisi = {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode?: string;
};

export type SiparisOlusturGirdisi = {
  sepet: SepetGirdisi[];
  teslimat: TeslimatBilgisi;
  /** Oturum açmış kullanıcı varsa kimliği; misafir siparişte null. */
  userId?: string | null;
};

export type OlusturulanSiparis = {
  id: string;
  orderNumber: string;
  publicToken: string;
  subtotalKurus: number;
  shippingKurus: number;
  totalKurus: number;
  kalemSayisi: number;
  /** Sonraki aşamada rezerve edilecek toplam etiket sayısı. */
  toplamQrAdedi: number;
};

/** Alan uzunluk sınırları — actions.ts ile aynı yaklaşım. */
const ALAN_SINIRI = {
  ad: 100,
  eposta: 254,
  telefon: 30,
  adres: 300,
  ilce: 100,
  il: 100,
  postaKodu: 20,
} as const;

/** Sipariş numarası çakışırsa bu kadar kez yeniden denenir. */
const EN_FAZLA_DENEME = 3;

function metniTemizle(deger: unknown): string {
  return typeof deger === "string" ? deger.trim() : "";
}

/**
 * Teslimat ve iletişim alanlarını sunucu tarafında doğrular.
 * Hata mesajları Türkçedir ve sistem detayı içermez.
 */
function teslimatDogrula(girdi: TeslimatBilgisi): TeslimatBilgisi {
  const fullName = metniTemizle(girdi?.fullName);
  const email = metniTemizle(girdi?.email).toLowerCase();
  const phone = metniTemizle(girdi?.phone);
  const addressLine = metniTemizle(girdi?.addressLine);
  const district = metniTemizle(girdi?.district);
  const city = metniTemizle(girdi?.city);
  const postalCode = metniTemizle(girdi?.postalCode);

  if (!fullName || !email || !phone || !addressLine || !district || !city) {
    throw new Error(
      "Ad soyad, e-posta, telefon, adres, ilçe ve il alanları zorunludur."
    );
  }

  if (
    fullName.length > ALAN_SINIRI.ad ||
    email.length > ALAN_SINIRI.eposta ||
    phone.length > ALAN_SINIRI.telefon ||
    addressLine.length > ALAN_SINIRI.adres ||
    district.length > ALAN_SINIRI.ilce ||
    city.length > ALAN_SINIRI.il ||
    postalCode.length > ALAN_SINIRI.postaKodu
  ) {
    throw new Error("Girilen bilgiler izin verilen uzunluğu aşıyor.");
  }

  if (!email.includes("@") || !email.includes(".")) {
    throw new Error("Geçerli bir e-posta adresi giriniz.");
  }

  const rakamlar = phone.replace(/\D/g, "");

  if (rakamlar.length < 7 || rakamlar.length > 15) {
    throw new Error("Geçerli bir telefon numarası giriniz.");
  }

  return {
    fullName,
    email,
    phone,
    addressLine,
    district,
    city,
    postalCode: postalCode || undefined,
  };
}

/** İnsan tarafından okunabilen, tekil sipariş numarası. */
function siparisNumarasiUret(): string {
  const yil = new Date().getFullYear();
  const rastgele = randomBytes(4).toString("hex").toUpperCase();

  return `ARK-${yil}-${rastgele}`;
}

/**
 * Siparişi oluşturur.
 *
 * `Order`, `OrderItem` satırları ve `OrderEvent(type: "created")` tek bir
 * iç içe yazma ile üretilir; Prisma bunu tek transaction'da çalıştırır.
 * Doğrulama hatasında hiçbir kayıt yazılmaz, kısmi sipariş kalmaz.
 */
export async function siparisOlustur(
  girdi: SiparisOlusturGirdisi
): Promise<OlusturulanSiparis> {
  // Tutarlar yalnızca sunucudaki ürün kaynağından hesaplanır.
  const toplam = sepetHesapla(girdi?.sepet);
  const teslimat = teslimatDogrula(girdi?.teslimat);
  const userId = girdi?.userId ?? null;

  const toplamQrAdedi = toplam.kalemler.reduce(
    (say, kalem) => say + kalem.adet * kalem.qrAdedi,
    0
  );

  for (let deneme = 1; deneme <= EN_FAZLA_DENEME; deneme += 1) {
    try {
      const siparis = await prisma.order.create({
        data: {
          orderNumber: siparisNumarasiUret(),
          publicToken: publicTokenUret(),
          userId,
          fullName: teslimat.fullName,
          email: teslimat.email,
          phone: teslimat.phone,
          addressLine: teslimat.addressLine,
          district: teslimat.district,
          city: teslimat.city,
          postalCode: teslimat.postalCode ?? null,
          subtotalKurus: toplam.subtotalKurus,
          shippingKurus: toplam.shippingKurus,
          totalKurus: toplam.totalKurus,
          status: "pending",
          items: {
            create: toplam.kalemler.map((kalem) => ({
              productKod: kalem.kod,
              productAdi: kalem.ad,
              quantity: kalem.adet,
              qrAdedi: kalem.qrAdedi,
              unitPriceKurus: kalem.unitPriceKurus,
              lineTotalKurus: kalem.lineTotalKurus,
            })),
          },
          events: {
            create: { type: "created" },
          },
        },
        select: { id: true, orderNumber: true, publicToken: true },
      });

      return {
        id: siparis.id,
        orderNumber: siparis.orderNumber,
        publicToken: siparis.publicToken,
        subtotalKurus: toplam.subtotalKurus,
        shippingKurus: toplam.shippingKurus,
        totalKurus: toplam.totalKurus,
        kalemSayisi: toplam.kalemler.length,
        toplamQrAdedi,
      };
    } catch (hata) {
      // Sipariş numarası çakışması dışındaki hatalar yükseltilir.
      const kod = (hata as { code?: string })?.code;

      if (kod !== "P2002" || deneme === EN_FAZLA_DENEME) {
        throw hata;
      }
    }
  }

  throw new Error("Sipariş numarası üretilemedi. Lütfen tekrar deneyin.");
}
