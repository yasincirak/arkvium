import assert from "node:assert/strict";
import { after, before, describe, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

/**
 * İPTAL EDİLEN ETİKET HİÇBİR SAHİP VERİSİ AÇMAZ.
 *
 * Bu dosya, iptal/yenileme akışının en kritik güvenlik vaadini doğrular:
 * bir etiket iptal edildikten sonra eski QR adresi okutulsa bile sahibinin
 * acil durum bilgisi (veya herhangi bir kişisel verisi) DÖNMEZ.
 *
 * Gerçek anahtar, gerçek sağlık verisi ve gerçek etiket kullanılmaz;
 * hepsi burada üretilir ve test sonunda geri alınır.
 */

const TEST_ANAHTARI = Buffer.alloc(32, 5).toString("base64");
const oncekiAnahtar = process.env.EMERGENCY_DATA_ENCRYPTION_KEY;

/** Sahte veritabanının etiket durumu — testler arasında değiştirilir. */
let etiketDurumu = "active";

/** Prisma'ya giden son sorgu; filtre denetimi için saklanır. */
let sonSorgu: any = null;

before(() => {
  process.env.EMERGENCY_DATA_ENCRYPTION_KEY = TEST_ANAHTARI;

  mock.module(pathToFileURL(resolve("src/lib/prisma.ts")).href, {
    exports: {
      prisma: {
        emergencyProfile: {
          async findFirst(sorgu: any) {
            sonSorgu = sorgu;

            /*
              GERÇEK VERİTABANI DAVRANIŞINI TAKLİT EDER.

              Uç, sorguya `itemRecord.tag.status = "active"` filtresini
              koyar. Burada o filtre GERÇEKTEN uygulanır: etiket aktif
              değilse satır bulunamaz ve null döner — Postgres'in
              yapacağının aynısı.
            */
            const beklenenDurum =
              sorgu?.where?.itemRecord?.tag?.is?.status ?? null;

            if (beklenenDurum && beklenenDurum !== etiketDurumu) {
              return null;
            }

            const { sifrele } = await import("@/lib/acil-durum-sifreleme");

            return {
              userId: "kullanici-1",
              itemRecord: { userId: "kullanici-1" },
              displayName: sifrele("TEST AD"),
              bloodType: sifrele("A_RH_POZITIF"),
              allergies: sifrele("TEST-ALERJI"),
              medications: null,
              medicalConditions: null,
              emergencyNote: null,
              displayNameGorunur: true,
              bloodTypeGorunur: true,
              allergiesGorunur: true,
              medicationsGorunur: false,
              medicalConditionsGorunur: false,
              emergencyNoteGorunur: false,
              contactsGorunur: true,
              contacts: [
                {
                  name: sifrele("TEST KISI"),
                  relationship: "Test",
                  phone: sifrele("+900000000000"),
                },
              ],
            };
          },
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

async function gorunumAl() {
  const { acilDurumGorunumu } = await import("@/lib/acil-durum");

  return acilDurumGorunumu;
}

describe("iptal edilen etiket", () => {
  test("aktif etikette bilgi döner (temel doğrulama)", async () => {
    etiketDurumu = "active";

    const acilDurumGorunumu = await gorunumAl();
    const gorunum = await acilDurumGorunumu("kayit-1");

    assert.ok(gorunum, "aktif etikette bilgi dönmeliydi");
    assert.equal(gorunum.displayName, "TEST AD");
  });

  test("iptal edilmiş (revoked) etikette HİÇBİR bilgi dönmez", async () => {
    etiketDurumu = "revoked";

    const acilDurumGorunumu = await gorunumAl();
    const gorunum = await acilDurumGorunumu("kayit-1");

    assert.equal(gorunum, null);
  });

  test("pasif ve kullanılmamış etikette de bilgi dönmez", async () => {
    const acilDurumGorunumu = await gorunumAl();

    for (const durum of ["inactive", "unused"]) {
      etiketDurumu = durum;

      assert.equal(await acilDurumGorunumu("kayit-1"), null, durum);
    }
  });

  test("sorgu etiketin AKTİF olmasını filtreye koyar", async () => {
    etiketDurumu = "active";

    const acilDurumGorunumu = await gorunumAl();
    await acilDurumGorunumu("kayit-1");

    assert.equal(sonSorgu.where.itemRecord.tag.is.status, "active");
  });

  test("iptal sonrası dönen görünümde ad, kişi ve sağlık verisi yoktur", async () => {
    etiketDurumu = "revoked";

    const acilDurumGorunumu = await gorunumAl();
    const gorunum = await acilDurumGorunumu("kayit-1");

    // Görünüm null olduğu için sayfada bölüm HİÇ çizilmez.
    assert.equal(gorunum, null);

    const metin = JSON.stringify(gorunum);

    assert.ok(!metin.includes("TEST AD"));
    assert.ok(!metin.includes("TEST-ALERJI"));
    assert.ok(!metin.includes("TEST KISI"));
  });
});
