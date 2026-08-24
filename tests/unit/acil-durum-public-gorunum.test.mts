import assert from "node:assert/strict";
import { after, before, describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * Public acil durum görünümü güvenlik testleri.
 *
 * Veritabanına bağlanılmaz: `@/lib/prisma` modülü sahte bir istemciyle
 * değiştirilir ve `acilDurumGorunumu` fonksiyonunun ürettiği FİLTRE ile
 * döndürdüğü ALANLAR doğrulanır. Gerçek sağlık verisi kullanılmaz.
 */

const TEST_ANAHTARI = Buffer.alloc(32, 5).toString("base64");
const oncekiAnahtar = process.env.EMERGENCY_DATA_ENCRYPTION_KEY;

/** Sahte istemcinin son aldığı sorgu; filtre doğrulaması için saklanır. */
let sonSorgu: any = null;

/** Sahte istemcinin döndüreceği profil. */
let sahteProfil: any = null;

/** Kayıt sahipliği doğrulamasının sonucu. */
let sahteKayit: any = { id: "kayit-1" };

/** Profilin kaydetme öncesi yayın durumu. */
let oncekiYayinDurumu: any = { enabled: true };

/** `profiliKaydet` sırasında emergencyProfile.upsert'e giden veri. */
let sonUpsert: any = null;

before(() => {
  process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;

  mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
    exports: {
      prisma: {
        itemRecord: {
          async findFirst() {
            return sahteKayit;
          },
        },
        emergencyProfile: {
          async findFirst(sorgu: any) {
            sonSorgu = sorgu;

            return sahteProfil;
          },
        },
        async $transaction(geriCagri: any) {
          return geriCagri({
            emergencyProfile: {
              async findUnique() {
                return oncekiYayinDurumu;
              },
              async upsert(sorgu: any) {
                sonUpsert = sorgu;

                return { id: "profil-1" };
              },
            },
            emergencyContact: {
              async deleteMany() {
                return { count: 0 };
              },
              async create() {
                return {};
              },
            },
          });
        },
      },
    },
  });
});

after(() => {
  if (oncekiAnahtar === undefined) {
    delete process.env.EMERGENCY_DATA_ENCRYPTION_KEY;
  } else {
    process.env.EMERGENCY_DATA_ENCRYPTION_KEY = oncekiAnahtar;
  }
});

const { acilDurumGorunumu, ONAY_METNI_SURUMU, profiliKaydet } = await import(
  "@/lib/acil-durum"
);
const { sifrele } = await import("@/lib/acil-durum-sifreleme");

const SAHIP = "kullanici-1";

/** Her alanı görünür, geçerli ve tutarlı bir profil üretir. */
function profilUret(degisiklik: Record<string, unknown> = {}) {
  return {
    userId: SAHIP,
    itemRecord: { userId: SAHIP },
    displayName: sifrele("A. Yılmaz"),
    bloodType: sifrele("A_RH_POZITIF"),
    allergies: sifrele("Test alerjisi"),
    medications: sifrele("Test ilacı"),
    medicalConditions: sifrele("Test durumu"),
    emergencyNote: sifrele("Test notu"),
    displayNameGorunur: true,
    bloodTypeGorunur: true,
    allergiesGorunur: true,
    medicationsGorunur: true,
    medicalConditionsGorunur: true,
    emergencyNoteGorunur: true,
    contactsGorunur: true,
    contacts: [
      {
        name: sifrele("Test Kişi"),
        relationship: "Yakını",
        phone: sifrele("05551112233"),
      },
    ],
    ...degisiklik,
  };
}

describe("public sorgu filtresi", () => {
  test("rıza sürümü yürürlükteki sürümle TAM EŞİT aranır", async () => {
    sahteProfil = profilUret();

    await acilDurumGorunumu("kayit-1");

    assert.equal(sonSorgu.where.explicitConsentVersion, ONAY_METNI_SURUMU);
  });

  test("yalnızca yayında ve rızası geri çekilmemiş profil aranır", async () => {
    sahteProfil = profilUret();

    await acilDurumGorunumu("kayit-1");

    assert.equal(sonSorgu.where.enabled, true);
    assert.equal(sonSorgu.where.consentWithdrawnAt, null);
  });

  test("etiketin AKTİF olması filtreye dahildir", async () => {
    sahteProfil = profilUret();

    await acilDurumGorunumu("kayit-1");

    assert.deepEqual(sonSorgu.where.itemRecord, {
      tag: { is: { status: "active" } },
    });
  });

  test("sorgu e-posta, adres veya onay kaydı seçmez", async () => {
    sahteProfil = profilUret();

    await acilDurumGorunumu("kayit-1");

    const secilen = Object.keys(sonSorgu.select);

    for (const yasak of [
      "email",
      "address",
      "explicitConsentAt",
      "explicitConsentVersion",
      "consentWithdrawnAt",
      "disclaimerAcceptedAt",
      "id",
    ]) {
      assert.ok(!secilen.includes(yasak), `${yasak} seçilmemeli`);
    }
  });
});

describe("sahiplik tutarlılığı", () => {
  test("profil sahibi kaydın sahibinden farklıysa hiçbir şey dönmez", async () => {
    sahteProfil = profilUret({ itemRecord: { userId: "baska-kullanici" } });

    assert.equal(await acilDurumGorunumu("kayit-1"), null);
  });

  test("kayıt ilişkisi yoksa hiçbir şey dönmez", async () => {
    sahteProfil = profilUret({ itemRecord: null });

    assert.equal(await acilDurumGorunumu("kayit-1"), null);
  });

  test("eşleşen sahiplikte bilgi döner", async () => {
    sahteProfil = profilUret();

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.equal(sonuc?.displayName, "A. Yılmaz");
  });
});

describe("alan bazlı görünürlük", () => {
  test("görünür işaretlenmemiş alan dönmez", async () => {
    sahteProfil = profilUret({
      allergiesGorunur: false,
      medicationsGorunur: false,
    });

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.equal(sonuc?.allergies, null);
    assert.equal(sonuc?.medications, null);
    assert.equal(sonuc?.medicalConditions, "Test durumu");
  });

  test("kişiler görünür değilse liste boş döner", async () => {
    sahteProfil = profilUret({ contactsGorunur: false });

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.deepEqual(sonuc?.kisiler, []);
  });

  test("hiçbir alan görünür değilse null döner", async () => {
    sahteProfil = profilUret({
      displayNameGorunur: false,
      bloodTypeGorunur: false,
      allergiesGorunur: false,
      medicationsGorunur: false,
      medicalConditionsGorunur: false,
      emergencyNoteGorunur: false,
      contactsGorunur: false,
    });

    assert.equal(await acilDurumGorunumu("kayit-1"), null);
  });

  test("profil bulunamazsa null döner", async () => {
    sahteProfil = null;

    assert.equal(await acilDurumGorunumu("kayit-1"), null);
  });
});

describe("kan grubu şifreli saklanır", () => {
  test("şifreli kan grubu çözülüp gösterilir", async () => {
    sahteProfil = profilUret();

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.equal(sonuc?.bloodType, "A_RH_POZITIF");
  });

  test("kan grubu görünür değilse dönmez", async () => {
    sahteProfil = profilUret({ bloodTypeGorunur: false });

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.equal(sonuc?.bloodType, null);
  });

  test("çözülemeyen veya kurcalanmış kan grubu gösterilmez", async () => {
    sahteProfil = profilUret({ bloodType: "A_RH_POZITIF" });

    const sonuc = await acilDurumGorunumu("kayit-1");

    // Düz metin (şifresiz) değer geçerli sayılmaz: güvenli varsayılan gizlemek.
    assert.equal(sonuc?.bloodType, null);
  });

  test("geçersiz koda çözülen değer gösterilmez", async () => {
    sahteProfil = profilUret({ bloodType: sifrele("UYDURMA_GRUP") });

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.equal(sonuc?.bloodType, null);
  });
});

describe("dönen nesne sözleşmesi", () => {
  test("yalnızca beklenen alanlar döner, kimlik bilgisi yok", async () => {
    sahteProfil = profilUret();

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.deepEqual(Object.keys(sonuc!).sort(), [
      "allergies",
      "bloodType",
      "displayName",
      "emergencyNote",
      "kisiler",
      "medicalConditions",
      "medications",
    ]);
  });

  test("kişi kaydı yalnızca ad, yakınlık ve telefon içerir", async () => {
    sahteProfil = profilUret();

    const sonuc = await acilDurumGorunumu("kayit-1");

    assert.deepEqual(Object.keys(sonuc!.kisiler[0]).sort(), [
      "name",
      "phone",
      "relationship",
    ]);
    assert.equal(sonuc!.kisiler[0].phone, "05551112233");
  });
});

describe("içerik güncellenince rıza tazelenir", () => {
  const veri = {
    allergies: "Yeni alerji",
    allergiesGorunur: true,
  };

  test("yayındaki profil kaydetme sonrası yayından kaldırılır", async () => {
    oncekiYayinDurumu = { enabled: true };

    const sonuc = await profiliKaydet({
      itemRecordId: "kayit-1",
      userId: SAHIP,
      veri,
    });

    assert.equal(sonuc.yayindanKaldirildi, true);
    assert.equal(sonUpsert.update.enabled, false);
  });

  test("eski onay kayıtları temizlenir", async () => {
    oncekiYayinDurumu = { enabled: true };

    await profiliKaydet({ itemRecordId: "kayit-1", userId: SAHIP, veri });

    assert.equal(sonUpsert.update.explicitConsentAt, null);
    assert.equal(sonUpsert.update.explicitConsentVersion, null);
    assert.equal(sonUpsert.update.disclaimerAcceptedAt, null);
    assert.equal(
      sonUpsert.update.emergencyContactDeclarationAcceptedAt,
      null
    );
  });

  test("yeni profil oluşturulurken yayına alınmaz", async () => {
    oncekiYayinDurumu = null;

    const sonuc = await profiliKaydet({
      itemRecordId: "kayit-1",
      userId: SAHIP,
      veri,
    });

    assert.equal(sonuc.yayindanKaldirildi, false);
    // Şema varsayılanı `enabled: false`; create yolunda açıkça yayına alınmaz.
    assert.equal(sonUpsert.create.enabled, undefined);
  });

  test("sağlık alanları düz metin yazılmaz", async () => {
    oncekiYayinDurumu = null;

    await profiliKaydet({
      itemRecordId: "kayit-1",
      userId: SAHIP,
      veri: { allergies: "Penisilin", bloodType: "A_RH_POZITIF" },
    });

    assert.ok(!String(sonUpsert.create.allergies).includes("Penisilin"));
    assert.ok(String(sonUpsert.create.allergies).startsWith("v1."));
    assert.ok(!String(sonUpsert.create.bloodType).includes("A_RH_POZITIF"));
    assert.ok(String(sonUpsert.create.bloodType).startsWith("v1."));
  });
});
