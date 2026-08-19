import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { sepetHesapla, type SepetGirdisi } from "./sepet";
import {
  kalemIcinEtiketAyir,
  REZERVASYON_CAKISMASI_MESAJI,
  StokHatasi,
  stoktakiEtiketSayisi,
  STOK_YETERSIZ_MESAJI,
  suresiDolanRezervasyonlariTemizle,
} from "./qr-rezervasyon";
import { publicTokenUret } from "./tags";

/**
 * Sipariş oluşturma servisi.
 *
 * Bu katman ÖDEME YAPMAZ: yalnızca `pending` durumda sipariş kaydı üretir
 * ve gereken QR etiketlerini ödeme başlatılmadan ÖNCE rezerve eder.
 * `Payment` kaydı sonraki aşamaya aittir.
 *
 * Rezervasyon `Tag` kayıtlarını değiştirmez (bkz. qr-rezervasyon.ts):
 * etiketler `unused` ve sahipsiz kalır, sahiplik yalnızca aktivasyonda kurulur.
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
  /**
   * Rezervasyonun son geçerlilik anı.
   *
   * Süre değeri koda gömülmez: doğrulanmış ödeme oturumu süresinden veya
   * doğrulanmış sunucu ayarından üretilip buraya verilir.
   */
  rezervasyonSonGecerlilik: Date;
};

export type OlusturulanSiparis = {
  id: string;
  orderNumber: string;
  publicToken: string;
  subtotalKurus: number;
  shippingKurus: number;
  totalKurus: number;
  kalemSayisi: number;
  /** Bu sipariş için rezerve edilen toplam etiket sayısı. */
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
 * Siparişi oluşturur ve gereken QR etiketlerini rezerve eder.
 *
 * Tamamı tek `Serializable` transaction içindedir (ownership-transfer.ts ile
 * aynı kalıp): süresi dolmuş rezervasyonların temizliği, stok kontrolü,
 * `Order` + `OrderItem` yazımı, etiket ayırma ve olay kayıtları ya hep
 * birlikte gerçekleşir ya da hiçbiri kalmaz.
 *
 * Stok yetersizse sipariş HİÇ oluşmaz; ön sipariş alınmaz.
 */
export async function siparisOlustur(
  girdi: SiparisOlusturGirdisi
): Promise<OlusturulanSiparis> {
  // Tutarlar yalnızca sunucudaki ürün kaynağından hesaplanır.
  const toplam = sepetHesapla(girdi?.sepet);
  const teslimat = teslimatDogrula(girdi?.teslimat);
  const userId = girdi?.userId ?? null;
  const sonGecerlilik = girdi?.rezervasyonSonGecerlilik;

  if (!(sonGecerlilik instanceof Date) || Number.isNaN(sonGecerlilik.getTime())) {
    throw new Error("Rezervasyon süresi belirtilmedi.");
  }

  const toplamQrAdedi = toplam.kalemler.reduce(
    (say, kalem) => say + kalem.adet * kalem.qrAdedi,
    0
  );

  for (let deneme = 1; deneme <= EN_FAZLA_DENEME; deneme += 1) {
    try {
      const siparis = await prisma.$transaction(
        async (islem) => {
          // 1) Süresi dolmuş rezervasyonlar stoğa döner.
          await suresiDolanRezervasyonlariTemizle(islem);

          // 2) Stok kontrolü: yetmiyorsa hiçbir kayıt yazılmadan durulur.
          const stok = await stoktakiEtiketSayisi(islem);

          if (stok < toplamQrAdedi) {
            throw new StokHatasi(STOK_YETERSIZ_MESAJI);
          }

          // 3) Sipariş başlığı.
          const olusan = await islem.order.create({
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
            },
            select: { id: true, orderNumber: true, publicToken: true },
          });

          // 4) Kalemler ve her kalemin etiketleri.
          for (const kalem of toplam.kalemler) {
            const satir = await islem.orderItem.create({
              data: {
                orderId: olusan.id,
                productKod: kalem.kod,
                productAdi: kalem.ad,
                quantity: kalem.adet,
                qrAdedi: kalem.qrAdedi,
                unitPriceKurus: kalem.unitPriceKurus,
                lineTotalKurus: kalem.lineTotalKurus,
              },
              select: { id: true },
            });

            await kalemIcinEtiketAyir(islem, {
              orderId: olusan.id,
              orderItemId: satir.id,
              adet: kalem.adet * kalem.qrAdedi,
              sonGecerlilik,
            });
          }

          // 5) Denetim izi.
          await islem.orderEvent.createMany({
            data: [
              { orderId: olusan.id, type: "created" },
              { orderId: olusan.id, type: "tags_reserved" },
            ],
          });

          return olusan;
        },
        { isolationLevel: "Serializable" }
      );

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
      if (hata instanceof StokHatasi) {
        throw hata;
      }

      const kod = (hata as { code?: string })?.code;
      const hedef = String(
        (hata as { meta?: { target?: unknown } })?.meta?.target ?? ""
      );

      // Sipariş numarası çakışması yeniden denenebilir.
      if (kod === "P2002" && hedef.includes("orderNumber")) {
        if (deneme === EN_FAZLA_DENEME) {
          throw hata;
        }

        continue;
      }

      // Aynı etiketi iki siparişin ayırmaya çalışması (unique kısıt) veya
      // Serializable seviyesinde yarışın kaybedilmesi. Veritabanı ayrıntısı
      // kullanıcıya gösterilmez.
      if (
        (kod === "P2002" && hedef.includes("tagId")) ||
        kod === "P2034"
      ) {
        throw new StokHatasi(REZERVASYON_CAKISMASI_MESAJI);
      }

      throw hata;
    }
  }

  throw new Error("Sipariş numarası üretilemedi. Lütfen tekrar deneyin.");
}
