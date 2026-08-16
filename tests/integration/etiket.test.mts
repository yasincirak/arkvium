import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  oturumCerezi,
  rastgeleIp,
  testSunucusuBaslat,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
  type TestSunucusu,
} from "../helpers/test-ortami.mts";

import {
  aktivasyonKoduOzetle,
  etiketUret,
} from "../../src/lib/tags.ts";

/**
 * Etiket sistemi testleri.
 *
 * İki akış ayrı ayrı doğrulanır:
 * - LEGACY: /item/<kayıt-id> — eski basılmış QR kodları
 * - YENİ:   /t/<publicToken> — etiket tabanlı akış
 */

let sunucu: TestSunucusu;
let db: Client;

const KULLANICI_CEREZI = "arkvium_user_session";

before(async () => {
  db = await testVeritabaniIstemcisi();
  sunucu = await testSunucusuBaslat();
});

after(async () => {
  await sunucu?.kapat();
  await db?.end();
});

beforeEach(async () => {
  await veritabaniniTemizle(db);
});

async function istek(
  yol: string,
  secenekler: { govde?: unknown; cerez?: string } = {}
) {
  const basliklar: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": rastgeleIp(),
  };

  if (secenekler.cerez) {
    basliklar.Cookie = secenekler.cerez;
  }

  const yanit = await fetch(sunucu.taban + yol, {
    method: "POST",
    headers: basliklar,
    body: JSON.stringify(secenekler.govde ?? {}),
    redirect: "manual",
  });

  return { yanit, govde: await yanit.json() };
}

async function sayfa(yol: string) {
  const yanit = await fetch(sunucu.taban + yol, { redirect: "manual" });

  return { yanit, icerik: await yanit.text() };
}

async function kullaniciOlustur(eposta: string): Promise<string> {
  await istek("/api/register", {
    govde: { fullName: "Etiket Test", email: eposta, password: "GucluSifre12345" },
  });

  const giris = await istek("/api/login", {
    govde: { email: eposta, password: "GucluSifre12345" },
  });

  const cerez = oturumCerezi(giris.yanit, KULLANICI_CEREZI);

  assert.ok(cerez, "giriş çerezi alınamadı");

  return cerez;
}

async function kullaniciIdAl(eposta: string): Promise<string> {
  const sonuc = await db.query('SELECT id FROM "User" WHERE email=$1', [eposta]);

  return sonuc.rows[0].id;
}

async function urunOlustur(
  id: string,
  userId: string | null,
  assetName = "Test Eşya"
): Promise<string> {
  await db.query(
    'INSERT INTO "ItemRecord" (id,"assetName","ownerName",phone,email,description,category,status,"createdAt","userId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9)',
    [
      id,
      assetName,
      "Sahip Adı",
      "05551112233",
      "sahip@test.invalid",
      "Açıklama",
      "Kategori",
      "active",
      userId,
    ]
  );

  return id;
}

/** Veritabanına doğrudan bir etiket ekler ve düz metin kodları döndürür. */
async function etiketEkle(
  durum: string,
  ekler: { userId?: string | null; itemRecordId?: string | null } = {}
) {
  const etiket = etiketUret();
  const id = `tag-${Math.random().toString(36).slice(2, 10)}`;

  await db.query(
    'INSERT INTO "Tag" (id,code,"publicToken",status,"activationCodeHash","userId","itemRecordId","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())',
    [
      id,
      etiket.code,
      etiket.publicToken,
      durum,
      etiket.activationCodeHash,
      ekler.userId ?? null,
      ekler.itemRecordId ?? null,
    ]
  );

  return { id, ...etiket };
}

// ---------------------------------------------------------------------------

describe("LEGACY akış — eski QR kodları", () => {
  test("eski /item/<kayıt-id> adresi çalışmaya devam eder", async () => {
    await urunOlustur("legacy-kayit-1", null, "Eski Cüzdan");

    const { yanit, icerik } = await sayfa("/item/legacy-kayit-1");

    assert.equal(yanit.status, 200, "eski QR bağlantısı kırılmamalı");
    assert.ok(icerik.includes("Eski Cüzdan"));
  });

  test("etiketi olmayan eski kayıt yeni sisteme zorlanmaz", async () => {
    await urunOlustur("legacy-kayit-2", null);

    const etiketSayisi = await db.query(
      'SELECT count(*)::int n FROM "Tag" WHERE "itemRecordId"=$1',
      ["legacy-kayit-2"]
    );

    assert.equal(etiketSayisi.rows[0].n, 0, "kendiliğinden etiket oluşmamalı");
    assert.equal((await sayfa("/item/legacy-kayit-2")).yanit.status, 200);
  });

  test("eski sayfada sahibin telefonu ve e-postası görünmez", async () => {
    await db.query(
      'INSERT INTO "ItemRecord" (id,"assetName","ownerName",phone,email,description,category,status,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())',
      [
        "legacy-gizlilik",
        "Valiz",
        "Mehmet Demir",
        "05559998877",
        "gizli@test.invalid",
        "",
        "",
        "lost",
      ]
    );

    const { icerik } = await sayfa("/item/legacy-gizlilik");

    assert.ok(!icerik.includes("05559998877"), "telefon sızmamalı");
    assert.ok(!icerik.includes("gizli@test.invalid"), "e-posta sızmamalı");
  });

  test("var olmayan eski kayıt 404 döner", async () => {
    assert.equal((await sayfa("/item/olmayan-kayit")).yanit.status, 404);
  });

  test("etiket bağlandıktan sonra eski adres de çalışmaya devam eder", async () => {
    const cerez = await kullaniciOlustur("hibrit@test.invalid");
    const userId = await kullaniciIdAl("hibrit@test.invalid");

    await urunOlustur("hibrit-kayit", userId, "Hibrit Çanta");

    const etiket = await etiketEkle("unused");

    const sonuc = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        itemRecordId: "hibrit-kayit",
      },
    });

    assert.equal(sonuc.yanit.status, 200);

    // Her iki adres de aynı ürüne erişim vermeli.
    assert.equal((await sayfa("/item/hibrit-kayit")).yanit.status, 200);
    assert.equal((await sayfa(`/t/${etiket.publicToken}`)).yanit.status, 200);
  });
});

describe("YENİ akış — /t/<publicToken>", () => {
  test("aktif etiket ürün sayfasını gösterir", async () => {
    const userId = await (async () => {
      await kullaniciOlustur("yeniakis@test.invalid");
      return kullaniciIdAl("yeniakis@test.invalid");
    })();

    await urunOlustur("yeni-kayit", userId, "Yeni Sırt Çantası");

    const etiket = await etiketEkle("active", {
      userId,
      itemRecordId: "yeni-kayit",
    });

    const { yanit, icerik } = await sayfa(`/t/${etiket.publicToken}`);

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes("Yeni Sırt Çantası"));
  });

  test("genel adres veritabanı ID'si içermez", async () => {
    const userId = await (async () => {
      await kullaniciOlustur("idsizlik@test.invalid");
      return kullaniciIdAl("idsizlik@test.invalid");
    })();

    await urunOlustur("gizli-kayit-id", userId);

    const etiket = await etiketEkle("active", {
      userId,
      itemRecordId: "gizli-kayit-id",
    });

    assert.ok(
      !etiket.publicToken.includes("gizli-kayit-id"),
      "token kayıt ID'si içermemeli"
    );
    assert.ok(
      !etiket.publicToken.includes(etiket.id),
      "token etiket ID'si içermemeli"
    );
  });

  test("public token veritabanında benzersizdir", async () => {
    const a = await etiketEkle("unused");

    await assert.rejects(
      () =>
        db.query(
          'INSERT INTO "Tag" (id,code,"publicToken",status,"activationCodeHash","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())',
          ["tag-cakisma", "ARK-9999-9999", a.publicToken, "unused", "x"]
        ),
      /duplicate key|unique/i
    );
  });

  test("etiket kodu veritabanında benzersizdir", async () => {
    const a = await etiketEkle("unused");

    await assert.rejects(
      () =>
        db.query(
          'INSERT INTO "Tag" (id,code,"publicToken",status,"activationCodeHash","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())',
          ["tag-cakisma-2", a.code, "baska-token-degeri", "unused", "x"]
        ),
      /duplicate key|unique/i
    );
  });

  test("var olmayan token 404 döner", async () => {
    const { yanit } = await sayfa("/t/tamamen-uydurma-token-degeri");

    assert.equal(yanit.status, 404);
  });

  test("robots.txt yeni etiket adreslerini de engeller", async () => {
    const { icerik } = await sayfa("/robots.txt");

    assert.ok(icerik.includes("Disallow: /t"), "/t engellenmemiş");
  });
});

describe("etiket durum davranışları", () => {
  test("kullanılmamış etiket ürün bilgisi göstermez", async () => {
    const etiket = await etiketEkle("unused");
    const { yanit, icerik } = await sayfa(`/t/${etiket.publicToken}`);

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes("etkinleştirilmemiş"));
    assert.ok(!icerik.includes("Bu eşyayı buldum"), "form gösterilmemeli");
  });

  test("pasif etiket bildirim formu göstermez", async () => {
    const userId = await (async () => {
      await kullaniciOlustur("pasif@test.invalid");
      return kullaniciIdAl("pasif@test.invalid");
    })();

    await urunOlustur("pasif-kayit", userId, "Pasif Eşya");

    const etiket = await etiketEkle("inactive", {
      userId,
      itemRecordId: "pasif-kayit",
    });

    const { yanit, icerik } = await sayfa(`/t/${etiket.publicToken}`);

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes("pasif"));
    assert.ok(!icerik.includes("Pasif Eşya"), "ürün adı sızmamalı");
    assert.ok(!icerik.includes("Bu eşyayı buldum"), "form gösterilmemeli");
  });

  test("iptal edilmiş etiket ürün bilgisi göstermez", async () => {
    const userId = await (async () => {
      await kullaniciOlustur("iptal@test.invalid");
      return kullaniciIdAl("iptal@test.invalid");
    })();

    await urunOlustur("iptal-kayit", userId, "İptal Edilmiş Eşya");

    const etiket = await etiketEkle("revoked", {
      userId,
      itemRecordId: "iptal-kayit",
    });

    const { yanit, icerik } = await sayfa(`/t/${etiket.publicToken}`);

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes("iptal"));
    assert.ok(!icerik.includes("İptal Edilmiş Eşya"), "ürün adı sızmamalı");
    assert.ok(!icerik.includes("Bu eşyayı buldum"), "form gösterilmemeli");
  });
});

describe("etiket aktivasyonu", () => {
  test("oturumsuz aktivasyon reddedilir", async () => {
    const etiket = await etiketEkle("unused");

    const { yanit } = await istek("/api/tags/activate", {
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Yeni Eşya",
      },
    });

    assert.equal(yanit.status, 401);

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "unused", "durum değişmemeli");
  });

  test("geçerli kod ile aktive edilir ve yeni ürün oluşur", async () => {
    const cerez = await kullaniciOlustur("aktivasyon@test.invalid");
    const userId = await kullaniciIdAl("aktivasyon@test.invalid");
    const etiket = await etiketEkle("unused");

    const { yanit, govde } = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Yeni Anahtarlık",
      },
    });

    assert.equal(yanit.status, 200, JSON.stringify(govde));

    const kayit = await db.query(
      'SELECT status, "userId", "itemRecordId", "activatedAt" FROM "Tag" WHERE id=$1',
      [etiket.id]
    );

    assert.equal(kayit.rows[0].status, "active");
    assert.equal(kayit.rows[0].userId, userId);
    assert.ok(kayit.rows[0].itemRecordId);
    assert.ok(kayit.rows[0].activatedAt);

    const urun = await db.query(
      'SELECT "assetName","userId" FROM "ItemRecord" WHERE id=$1',
      [kayit.rows[0].itemRecordId]
    );

    assert.equal(urun.rows[0].assetName, "Yeni Anahtarlık");
    assert.equal(urun.rows[0].userId, userId);
  });

  test("aktivasyon kaydı TagEvent'e yazılır", async () => {
    const cerez = await kullaniciOlustur("olay@test.invalid");
    const userId = await kullaniciIdAl("olay@test.invalid");
    const etiket = await etiketEkle("unused");

    await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Olaylı Eşya",
      },
    });

    const olaylar = await db.query(
      'SELECT type, "actorUserId", "toUserId" FROM "TagEvent" WHERE "tagId"=$1',
      [etiket.id]
    );

    assert.equal(olaylar.rowCount, 1);
    assert.equal(olaylar.rows[0].type, "activated");
    assert.equal(olaylar.rows[0].actorUserId, userId);
    assert.equal(olaylar.rows[0].toUserId, userId);
  });

  test("yanlış aktivasyon kodu reddedilir", async () => {
    const cerez = await kullaniciOlustur("yanliskod@test.invalid");
    const etiket = await etiketEkle("unused");

    const { yanit } = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: "ZZZZ-ZZZZ-ZZZZ",
        assetName: "Eşya",
      },
    });

    assert.equal(yanit.status, 400);

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "unused");
  });

  test("var olmayan etiket kodu, yanlış kodla aynı yanıtı verir", async () => {
    const cerez = await kullaniciOlustur("ayniyanit@test.invalid");
    const etiket = await etiketEkle("unused");

    const olmayan = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: "ARK-0000-0000",
        activationCode: "ZZZZ-ZZZZ-ZZZZ",
        assetName: "Eşya",
      },
    });

    const yanlisKod = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: "ZZZZ-ZZZZ-ZZZZ",
        assetName: "Eşya",
      },
    });

    // Hangi etiket kodlarının var olduğu sızdırılmamalı.
    assert.equal(olmayan.yanit.status, yanlisKod.yanit.status);
    assert.equal(olmayan.govde.error, yanlisKod.govde.error);
  });

  test("aynı etiket ikinci kez aktive edilemez", async () => {
    const cerez = await kullaniciOlustur("ilkkullanici@test.invalid");
    const etiket = await etiketEkle("unused");

    const ilk = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "İlk Eşya",
      },
    });

    assert.equal(ilk.yanit.status, 200);

    const ikinci = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "İkinci Eşya",
      },
    });

    assert.equal(ikinci.yanit.status, 409);
    assert.match(ikinci.govde.error, /zaten etkinleştirilmiş/);
  });

  test("başka kullanıcı aktif etiketi ele geçiremez", async () => {
    const sahipCerez = await kullaniciOlustur("gercek-sahip@test.invalid");
    const sahipId = await kullaniciIdAl("gercek-sahip@test.invalid");
    const etiket = await etiketEkle("unused");

    await istek("/api/tags/activate", {
      cerez: sahipCerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Sahibin Eşyası",
      },
    });

    // Saldırgan aktivasyon kodunu bilse bile aktive edemez.
    const saldirganCerez = await kullaniciOlustur("saldirgan@test.invalid");

    const { yanit } = await istek("/api/tags/activate", {
      cerez: saldirganCerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Çalınmış Eşya",
      },
    });

    assert.equal(yanit.status, 409);

    const kontrol = await db.query('SELECT "userId" FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].userId, sahipId, "sahip değişmemeli");
  });

  test("iptal edilmiş etiket aktive edilemez", async () => {
    const cerez = await kullaniciOlustur("iptalaktivasyon@test.invalid");
    const etiket = await etiketEkle("revoked");

    const { yanit, govde } = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Eşya",
      },
    });

    assert.equal(yanit.status, 409);
    assert.match(govde.error, /iptal/);
  });

  test("başkasının ürününe etiket bağlanamaz", async () => {
    await kullaniciOlustur("urun-sahibi@test.invalid");
    const sahipId = await kullaniciIdAl("urun-sahibi@test.invalid");

    await urunOlustur("baskasinin-urunu", sahipId);

    const digerCerez = await kullaniciOlustur("diger-kisi@test.invalid");
    const etiket = await etiketEkle("unused");

    const { yanit } = await istek("/api/tags/activate", {
      cerez: digerCerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        itemRecordId: "baskasinin-urunu",
      },
    });

    assert.equal(yanit.status, 404);

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "unused");
  });

  test("zaten etiketi olan ürüne ikinci etiket bağlanamaz", async () => {
    const cerez = await kullaniciOlustur("ciftetiket@test.invalid");
    const userId = await kullaniciIdAl("ciftetiket@test.invalid");

    await urunOlustur("tek-etiketli-urun", userId);

    const birinci = await etiketEkle("unused");
    const ikinci = await etiketEkle("unused");

    const ilkSonuc = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: birinci.code,
        activationCode: birinci.activationCode,
        itemRecordId: "tek-etiketli-urun",
      },
    });

    assert.equal(ilkSonuc.yanit.status, 200);

    const ikinciSonuc = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: ikinci.code,
        activationCode: ikinci.activationCode,
        itemRecordId: "tek-etiketli-urun",
      },
    });

    assert.equal(ikinciSonuc.yanit.status, 409);
  });

  test("kod yazımındaki küçük farklar tolere edilir", async () => {
    const cerez = await kullaniciOlustur("tolerans@test.invalid");
    const etiket = await etiketEkle("unused");

    const { yanit } = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code.toLowerCase().replace(/-/g, " "),
        activationCode: etiket.activationCode.toLowerCase(),
        assetName: "Toleranslı Eşya",
      },
    });

    assert.equal(yanit.status, 200);
  });

  test("aktivasyon kodu veritabanında düz metin saklanmaz", async () => {
    const etiket = await etiketEkle("unused");

    const kayit = await db.query(
      'SELECT "activationCodeHash" FROM "Tag" WHERE id=$1',
      [etiket.id]
    );

    const saklanan = kayit.rows[0].activationCodeHash;

    assert.notEqual(saklanan, etiket.activationCode);
    assert.equal(saklanan, aktivasyonKoduOzetle(etiket.activationCode));
    assert.equal(saklanan.length, 64);
  });
});


describe("etiket yönetimi", () => {
  /** Aktive edilmiş bir etiket ve sahibinin oturumunu hazırlar. */
  async function aktifEtiketHazirla(eposta: string) {
    const cerez = await kullaniciOlustur(eposta);
    const userId = await kullaniciIdAl(eposta);
    const etiket = await etiketEkle("unused");

    const sonuc = await istek("/api/tags/activate", {
      cerez,
      govde: {
        tagCode: etiket.code,
        activationCode: etiket.activationCode,
        assetName: "Yönetilen Eşya",
      },
    });

    assert.equal(sonuc.yanit.status, 200, JSON.stringify(sonuc.govde));

    return { cerez, userId, etiket, itemRecordId: sonuc.govde.itemRecordId };
  }

  test("oturumsuz yönetim isteği reddedilir", async () => {
    const { etiket } = await aktifEtiketHazirla("yonetim-oturumsuz@test.invalid");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      govde: { islem: "pasiflestir" },
    });

    assert.equal(yanit.status, 401);

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "active", "durum değişmemeli");
  });

  test("başka kullanıcı etiketi yönetemez", async () => {
    const { etiket } = await aktifEtiketHazirla("gercek-sahibi@test.invalid");
    const yabanciCerez = await kullaniciOlustur("yabanci@test.invalid");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez: yabanciCerez,
      govde: { islem: "pasiflestir" },
    });

    assert.equal(yanit.status, 404, "sahip olmayan 404 almalı");

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "active");
  });

  test("pasife alınan etiket genel sayfada ürün göstermez", async () => {
    const { cerez, etiket } = await aktifEtiketHazirla("pasifleme@test.invalid");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "pasiflestir" },
    });

    assert.equal(yanit.status, 200);

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "inactive");

    const genel = await sayfa(`/t/${etiket.publicToken}`);

    assert.ok(genel.icerik.includes("pasif"));
    assert.ok(!genel.icerik.includes("Yönetilen Eşya"), "ürün adı sızmamalı");
  });

  test("pasif etiket yeniden etkinleştirilebilir", async () => {
    const { cerez, etiket } = await aktifEtiketHazirla("yeniden@test.invalid");

    await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "pasiflestir" },
    });

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "etkinlestir" },
    });

    assert.equal(yanit.status, 200);

    const kontrol = await db.query('SELECT status FROM "Tag" WHERE id=$1', [
      etiket.id,
    ]);

    assert.equal(kontrol.rows[0].status, "active");
    assert.equal((await sayfa(`/t/${etiket.publicToken}`)).yanit.status, 200);
  });

  test("zaten aktif etiket tekrar etkinleştirilemez", async () => {
    const { cerez, etiket } = await aktifEtiketHazirla("zatenaktif@test.invalid");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "etkinlestir" },
    });

    assert.equal(yanit.status, 409);
  });

  test("iptal edilen etiket geri alınamaz", async () => {
    const { cerez, etiket } = await aktifEtiketHazirla("iptaledilen@test.invalid");

    const iptal = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "iptal" },
    });

    assert.equal(iptal.yanit.status, 200);

    const kayit = await db.query(
      'SELECT status, "revokedAt" FROM "Tag" WHERE id=$1',
      [etiket.id]
    );

    assert.equal(kayit.rows[0].status, "revoked");
    assert.ok(kayit.rows[0].revokedAt, "revokedAt damgalanmalı");

    // Yeniden etkinleştirme denemesi reddedilmeli.
    const geriAlma = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "etkinlestir" },
    });

    assert.equal(geriAlma.yanit.status, 409);

    const genel = await sayfa(`/t/${etiket.publicToken}`);

    assert.ok(genel.icerik.includes("iptal"));
    assert.ok(!genel.icerik.includes("Yönetilen Eşya"));
  });

  test("etiket sahibin başka ürününe taşınabilir ve kayıt altına alınır", async () => {
    const { cerez, userId, etiket, itemRecordId } =
      await aktifEtiketHazirla("tasima@test.invalid");

    await urunOlustur("tasima-hedefi", userId, "Hedef Ürün");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "tasi", itemRecordId: "tasima-hedefi" },
    });

    assert.equal(yanit.status, 200);

    const kayit = await db.query(
      'SELECT "itemRecordId" FROM "Tag" WHERE id=$1',
      [etiket.id]
    );

    assert.equal(kayit.rows[0].itemRecordId, "tasima-hedefi");

    const olay = await db.query(
      'SELECT type, "fromItemRecordId", "toItemRecordId", "actorUserId" FROM "TagEvent" WHERE "tagId"=$1 AND type=$2',
      [etiket.id, "moved"]
    );

    assert.equal(olay.rowCount, 1, "taşıma TagEvent'e yazılmalı");
    assert.equal(olay.rows[0].fromItemRecordId, itemRecordId);
    assert.equal(olay.rows[0].toItemRecordId, "tasima-hedefi");
    assert.equal(olay.rows[0].actorUserId, userId);

    // Yeni adres yeni ürünü göstermeli.
    const genel = await sayfa(`/t/${etiket.publicToken}`);

    assert.ok(genel.icerik.includes("Hedef Ürün"));
  });

  test("etiket başkasının ürününe taşınamaz", async () => {
    const { cerez, etiket, itemRecordId } =
      await aktifEtiketHazirla("tasima-sahibi@test.invalid");

    await kullaniciOlustur("tasima-yabanci@test.invalid");
    const yabanciId = await kullaniciIdAl("tasima-yabanci@test.invalid");

    await urunOlustur("yabanci-urun", yabanciId, "Yabancı Ürün");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "tasi", itemRecordId: "yabanci-urun" },
    });

    assert.equal(yanit.status, 404);

    const kayit = await db.query(
      'SELECT "itemRecordId" FROM "Tag" WHERE id=$1',
      [etiket.id]
    );

    assert.equal(kayit.rows[0].itemRecordId, itemRecordId, "bağlantı değişmemeli");
  });

  test("etiketi olan ürüne taşıma reddedilir", async () => {
    const { cerez, userId, etiket } =
      await aktifEtiketHazirla("cift-tasima@test.invalid");

    await urunOlustur("dolu-hedef", userId, "Dolu Hedef");

    const ikinciEtiket = await etiketEkle("active", {
      userId,
      itemRecordId: "dolu-hedef",
    });

    assert.ok(ikinciEtiket);

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "tasi", itemRecordId: "dolu-hedef" },
    });

    assert.equal(yanit.status, 409);
  });

  test("durum değişiklikleri TagEvent'e yazılır", async () => {
    const { cerez, etiket } = await aktifEtiketHazirla("olaykaydi@test.invalid");

    await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "pasiflestir" },
    });
    await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "etkinlestir" },
    });
    await istek(`/api/tags/${etiket.id}`, { cerez, govde: { islem: "iptal" } });

    const olaylar = await db.query(
      'SELECT type FROM "TagEvent" WHERE "tagId"=$1 ORDER BY "createdAt", id',
      [etiket.id]
    );

    const tipler = olaylar.rows.map((r) => r.type);

    assert.ok(tipler.includes("activated"));
    assert.ok(tipler.includes("deactivated"));
    assert.ok(tipler.includes("reactivated"));
    assert.ok(tipler.includes("revoked"));
  });

  test("geçersiz işlem adı reddedilir", async () => {
    const { cerez, etiket } = await aktifEtiketHazirla("gecersizislem@test.invalid");

    const { yanit } = await istek(`/api/tags/${etiket.id}`, {
      cerez,
      govde: { islem: "her-neyse" },
    });

    assert.equal(yanit.status, 400);
  });

  test("var olmayan etiket 404 döner", async () => {
    const cerez = await kullaniciOlustur("olmayanetiket@test.invalid");

    const { yanit } = await istek("/api/tags/olmayan-etiket-id", {
      cerez,
      govde: { islem: "pasiflestir" },
    });

    assert.equal(yanit.status, 404);
  });
});

describe("toplu etiket üretimi (yönetici)", () => {
  test("oturumsuz üretim reddedilir", async () => {
    const { yanit } = await istek("/api/admin/tags/generate", {
      govde: { adet: 5 },
    });

    assert.equal(yanit.status, 401);

    const sayim = await db.query('SELECT count(*)::int n FROM "Tag"');

    assert.equal(sayim.rows[0].n, 0, "etiket üretilmemeli");
  });

  test("kullanıcı oturumu yönetici ucunu kullanamaz", async () => {
    const cerez = await kullaniciOlustur("normalkullanici@test.invalid");

    const { yanit } = await istek("/api/admin/tags/generate", {
      cerez,
      govde: { adet: 5 },
    });

    assert.equal(yanit.status, 401);
  });
});

describe("kayıp modu", () => {
  const KAYIP_METNI = "Bu eşya kayıp olarak bildirildi";

  async function kayipUrunEtiketi(eposta: string, kayitId: string) {
    await kullaniciOlustur(eposta);
    const userId = await kullaniciIdAl(eposta);

    await urunOlustur(kayitId, userId, "Kayıp Cüzdan");

    const etiket = await etiketEkle("active", {
      userId,
      itemRecordId: kayitId,
    });

    return { userId, etiket };
  }

  test("kayıp işaretli üründe QR sayfası uyarı gösterir", async () => {
    const { etiket } = await kayipUrunEtiketi("kayip@test.invalid", "kayip-kayit");

    await db.query('UPDATE "ItemRecord" SET status=$1 WHERE id=$2', [
      "lost",
      "kayip-kayit",
    ]);

    const { yanit, icerik } = await sayfa(`/t/${etiket.publicToken}`);

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes(KAYIP_METNI), "kayıp uyarısı görünmeli");
    assert.ok(icerik.includes("Kayıp Cüzdan"));
  });

  test("normal üründe kayıp uyarısı çıkmaz", async () => {
    const { etiket } = await kayipUrunEtiketi("normal@test.invalid", "normal-kayit");

    const { icerik } = await sayfa(`/t/${etiket.publicToken}`);

    assert.ok(!icerik.includes(KAYIP_METNI), "uyarı yalnızca kayıpta çıkmalı");
  });

  test("eski (legacy) /item adresinde de uyarı gösterilir", async () => {
    await kayipUrunEtiketi("legacykayip@test.invalid", "legacy-kayip");

    await db.query('UPDATE "ItemRecord" SET status=$1 WHERE id=$2', [
      "lost",
      "legacy-kayip",
    ]);

    const { yanit, icerik } = await sayfa("/item/legacy-kayip");

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes(KAYIP_METNI), "kayıp uyarısı görünmeli");
  });

  test("kayıp işareti kaldırılınca uyarı kaybolur", async () => {
    const { etiket } = await kayipUrunEtiketi("bulundu@test.invalid", "bulundu-kayit");

    await db.query('UPDATE "ItemRecord" SET status=$1 WHERE id=$2', [
      "lost",
      "bulundu-kayit",
    ]);

    assert.ok((await sayfa(`/t/${etiket.publicToken}`)).icerik.includes(KAYIP_METNI));

    await db.query('UPDATE "ItemRecord" SET status=$1 WHERE id=$2', [
      "active",
      "bulundu-kayit",
    ]);

    assert.ok(
      !(await sayfa(`/t/${etiket.publicToken}`)).icerik.includes(KAYIP_METNI)
    );
  });
});
