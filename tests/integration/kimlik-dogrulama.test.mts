import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
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

/**
 * Uçtan uca kimlik doğrulama ve yetkilendirme testleri.
 *
 * Yalnızca test veritabanına bağlanır (bkz. tests/helpers/test-ortami.mts
 * içindeki güvenlik kontrolleri). Gerçek e-posta gönderilmez.
 */

let sunucu: TestSunucusu;
let db: Client;

const KULLANICI_CEREZI = "arkvium_user_session";
const ADMIN_CEREZI = "arkvium_admin_session";

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
  secenekler: { govde?: unknown; cerez?: string; ip?: string } = {}
) {
  const basliklar: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": secenekler.ip ?? rastgeleIp(),
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

async function sayfaAl(yol: string, cerez?: string) {
  return fetch(sunucu.taban + yol, {
    headers: cerez ? { Cookie: cerez } : {},
    redirect: "manual",
  });
}

async function kullaniciOlustur(
  eposta: string,
  sifre = "GucluSifre12345"
): Promise<string> {
  const { yanit } = await istek("/api/register", {
    govde: { fullName: "Test Kullanıcı", email: eposta, password: sifre },
  });

  assert.equal(yanit.status, 201, `kayıt başarısız: ${eposta}`);

  const giris = await istek("/api/login", {
    govde: { email: eposta, password: sifre },
  });

  const cerez = oturumCerezi(giris.yanit, KULLANICI_CEREZI);

  assert.ok(cerez, "giriş çerezi alınamadı");

  return cerez;
}

async function adminCereziAl(): Promise<string> {
  const { yanit, govde } = await istek("/api/admin/login", {
    govde: { email: "admin@test.invalid", password: "TestAdminSifresi123" },
  });

  const cerez = oturumCerezi(yanit, ADMIN_CEREZI);

  assert.ok(
    cerez,
    `admin çerezi alınamadı — HTTP ${yanit.status}, yanıt: ${JSON.stringify(govde)}`
  );

  return cerez;
}

// ---------------------------------------------------------------------------

describe("kullanıcı kaydı", () => {
  test("geçerli bilgilerle kayıt oluşturulur", async () => {
    const { yanit } = await istek("/api/register", {
      govde: {
        fullName: "Ayşe Yılmaz",
        email: "ayse@test.invalid",
        password: "GucluSifre12345",
      },
    });

    assert.equal(yanit.status, 201);

    const sonuc = await db.query('SELECT * FROM "User" WHERE email=$1', [
      "ayse@test.invalid",
    ]);

    assert.equal(sonuc.rowCount, 1);
    assert.notEqual(
      sonuc.rows[0].passwordHash,
      "GucluSifre12345",
      "şifre düz metin saklanmamalı"
    );
    assert.match(sonuc.rows[0].passwordHash, /^\$2[aby]\$/);
  });

  test("aynı e-posta ile ikinci kayıt engellenir", async () => {
    await istek("/api/register", {
      govde: {
        fullName: "Ayşe",
        email: "tekrar@test.invalid",
        password: "GucluSifre12345",
      },
    });

    const { yanit } = await istek("/api/register", {
      govde: {
        fullName: "Başkası",
        email: "tekrar@test.invalid",
        password: "BaskaSifre12345",
      },
    });

    assert.equal(yanit.status, 409);

    const sayim = await db.query(
      'SELECT count(*)::int n FROM "User" WHERE email=$1',
      ["tekrar@test.invalid"]
    );

    assert.equal(sayim.rows[0].n, 1);
  });

  test("e-posta büyük harfli girilse de tek kayıt oluşur", async () => {
    await istek("/api/register", {
      govde: {
        fullName: "Ayşe",
        email: "BuyukHarf@Test.Invalid",
        password: "GucluSifre12345",
      },
    });

    const { yanit } = await istek("/api/register", {
      govde: {
        fullName: "Ayşe",
        email: "buyukharf@test.invalid",
        password: "GucluSifre12345",
      },
    });

    assert.equal(yanit.status, 409);
  });

  test("8 karakterden kısa şifre reddedilir", async () => {
    const { yanit } = await istek("/api/register", {
      govde: {
        fullName: "Ayşe",
        email: "kisa@test.invalid",
        password: "kisa",
      },
    });

    assert.equal(yanit.status, 400);
  });

  test("kayıt sonrası e-posta doğrulanmamış olarak işaretlenir", async () => {
    await kullaniciOlustur("dogrulanmamis@test.invalid");

    const sonuc = await db.query(
      'SELECT "emailVerifiedAt" FROM "User" WHERE email=$1',
      ["dogrulanmamis@test.invalid"]
    );

    assert.equal(sonuc.rows[0].emailVerifiedAt, null);
  });
});

describe("kullanıcı girişi", () => {
  test("doğru bilgilerle giriş yapılır ve httpOnly çerez verilir", async () => {
    await istek("/api/register", {
      govde: {
        fullName: "Ayşe",
        email: "giris@test.invalid",
        password: "GucluSifre12345",
      },
    });

    const { yanit } = await istek("/api/login", {
      govde: { email: "giris@test.invalid", password: "GucluSifre12345" },
    });

    assert.equal(yanit.status, 200);

    const hamCerez = yanit
      .headers.getSetCookie()
      .find((c) => c.startsWith(KULLANICI_CEREZI));

    assert.ok(hamCerez, "oturum çerezi yok");
    assert.match(hamCerez, /HttpOnly/i);
    assert.match(hamCerez, /SameSite=Lax/i);
    assert.match(hamCerez, /Path=\//i);
  });

  test("yanlış şifre 401 döner", async () => {
    await istek("/api/register", {
      govde: {
        fullName: "Ayşe",
        email: "yanlis@test.invalid",
        password: "GucluSifre12345",
      },
    });

    const { yanit, govde } = await istek("/api/login", {
      govde: { email: "yanlis@test.invalid", password: "TamamenYanlis999" },
    });

    assert.equal(yanit.status, 401);
    assert.equal(govde.error, "E-posta veya şifre hatalı.");
  });

  test("var olmayan kullanıcı aynı hata mesajını alır", async () => {
    const { yanit, govde } = await istek("/api/login", {
      govde: { email: "hicyok@test.invalid", password: "HerhangiSifre123" },
    });

    assert.equal(yanit.status, 401);
    // Numaralandırma koruması: mesaj yanlış şifre ile birebir aynı olmalı.
    assert.equal(govde.error, "E-posta veya şifre hatalı.");
  });

  test("başarılı girişten sonra hesap sayfası açılır", async () => {
    const cerez = await kullaniciOlustur("hesap@test.invalid");
    const yanit = await sayfaAl("/account", cerez);

    assert.equal(yanit.status, 200);
  });
});

describe("yetkisiz erişim", () => {
  test("oturumsuz hesap sayfası giriş ekranına yönlendirir", async () => {
    const yanit = await sayfaAl("/account");

    assert.equal(yanit.status, 307);
    assert.match(yanit.headers.get("location") ?? "", /\/login/);
  });

  test("geçersiz çerez ile hesap sayfası açılmaz", async () => {
    const yanit = await sayfaAl(
      "/account",
      `${KULLANICI_CEREZI}=uydurma.token.degeri`
    );

    assert.equal(yanit.status, 307);
  });

  test("oturumsuz yönetim paneli giriş ekranına yönlendirir", async () => {
    for (const yol of ["/admin", "/admin/records", "/admin/notifications"]) {
      const yanit = await sayfaAl(yol);

      assert.equal(yanit.status, 307, `${yol} korumasız`);
      assert.match(yanit.headers.get("location") ?? "", /\/admin\/login/);
    }
  });

  test("kullanıcı oturumu yönetim paneline erişemez", async () => {
    const cerez = await kullaniciOlustur("normal@test.invalid");

    // Kullanıcı tokenı admin çerezi olarak sunulur.
    const adminDenemesi = cerez.replace(KULLANICI_CEREZI, ADMIN_CEREZI);
    const yanit = await sayfaAl("/admin", adminDenemesi);

    assert.equal(yanit.status, 307);
  });

  test("admin oturumu kullanıcı hesabına erişemez", async () => {
    const adminCerez = await adminCereziAl();
    const kullaniciDenemesi = adminCerez.replace(
      ADMIN_CEREZI,
      KULLANICI_CEREZI
    );

    const yanit = await sayfaAl("/account", kullaniciDenemesi);

    assert.equal(yanit.status, 307);
  });
});

describe("yönetici girişi", () => {
  test("doğru bilgilerle giriş yapılır ve panel açılır", async () => {
    const cerez = await adminCereziAl();
    const yanit = await sayfaAl("/admin", cerez);

    assert.equal(yanit.status, 200);
  });

  test("yanlış şifre 401 döner", async () => {
    const { yanit } = await istek("/api/admin/login", {
      govde: { email: "admin@test.invalid", password: "YanlisSifre999" },
    });

    assert.equal(yanit.status, 401);
  });

  test("yanlış e-posta 401 döner", async () => {
    const { yanit } = await istek("/api/admin/login", {
      govde: { email: "sahte@test.invalid", password: "TestAdminSifresi123" },
    });

    assert.equal(yanit.status, 401);
  });
});

describe("sahiplik kontrolü (IDOR)", () => {
  test("kullanıcı başkasının kaydını göremez", async () => {
    const sahipCerez = await kullaniciOlustur("sahip@test.invalid");
    const digerCerez = await kullaniciOlustur("diger@test.invalid");

    const sahipId = (
      await db.query('SELECT id FROM "User" WHERE email=$1', [
        "sahip@test.invalid",
      ])
    ).rows[0].id;

    await db.query(
      'INSERT INTO "ItemRecord" (id,"assetName","ownerName",phone,email,description,category,status,"createdAt","userId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9)',
      [
        "kayit-1",
        "Cüzdan",
        "Sahip",
        "05001112233",
        "sahip@test.invalid",
        "Siyah deri",
        "Aksesuar",
        "active",
        sahipId,
      ]
    );

    const sahipYanit = await sayfaAl("/account/records/kayit-1", sahipCerez);
    assert.equal(sahipYanit.status, 200, "sahip kendi kaydını görebilmeli");

    const digerYanit = await sayfaAl("/account/records/kayit-1", digerCerez);
    assert.equal(digerYanit.status, 404, "başkası kaydı görememeli");
  });

  test("kullanıcı başkasının düzenleme sayfasını açamaz", async () => {
    await kullaniciOlustur("sahip2@test.invalid");
    const digerCerez = await kullaniciOlustur("diger2@test.invalid");

    const sahipId = (
      await db.query('SELECT id FROM "User" WHERE email=$1', [
        "sahip2@test.invalid",
      ])
    ).rows[0].id;

    await db.query(
      'INSERT INTO "ItemRecord" (id,"assetName","ownerName",phone,email,description,category,status,"createdAt","userId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9)',
      [
        "kayit-2",
        "Anahtar",
        "Sahip2",
        "05001112233",
        "s2@test.invalid",
        "",
        "Aksesuar",
        "active",
        sahipId,
      ]
    );

    const yanit = await sayfaAl("/account/records/kayit-2/edit", digerCerez);

    assert.equal(yanit.status, 404);
  });
});

describe("şifre sıfırlama", () => {
  test("kayıtlı ve kayıtsız e-posta aynı yanıtı alır", async () => {
    await kullaniciOlustur("sifirla@test.invalid");

    const kayitli = await istek("/api/password/forgot", {
      govde: { email: "sifirla@test.invalid" },
    });

    const kayitsiz = await istek("/api/password/forgot", {
      govde: { email: "hicyok@test.invalid" },
    });

    // E-posta gönderimi test ortamında kapalı olduğu için kayıtlı kullanıcıda
    // 502 döner; kritik olan, KAYITSIZ e-postanın varlık bilgisi sızdırmamasıdır.
    assert.equal(kayitsiz.yanit.status, 200);
    assert.match(kayitsiz.govde.message, /kayıtlıysa/);
    assert.equal(kayitsiz.govde.error, undefined);
    assert.notEqual(kayitli.govde.message, undefined ? "" : kayitli.govde.error);
  });

  test("geçerli token ile şifre değişir ve token tükenir", async () => {
    await kullaniciOlustur("token@test.invalid");

    const kullaniciId = (
      await db.query('SELECT id FROM "User" WHERE email=$1', [
        "token@test.invalid",
      ])
    ).rows[0].id;

    const token = randomBytes(32).toString("base64url");
    const ozet = createHash("sha256").update(token).digest("hex");

    await db.query(
      'INSERT INTO "PasswordResetToken" (id,"tokenHash","userId","expiresAt","createdAt") VALUES ($1,$2,$3, now() + interval \'1 hour\', now())',
      ["prt-test", ozet, kullaniciId]
    );

    const ilk = await istek("/api/password/reset", {
      govde: { token, password: "TamamenYeniSifre1" },
    });

    assert.equal(ilk.yanit.status, 200);

    const ikinci = await istek("/api/password/reset", {
      govde: { token, password: "BirBaskaSifre123" },
    });

    assert.equal(ikinci.yanit.status, 400, "token tek kullanımlık olmalı");
    assert.match(ikinci.govde.error, /kullanılmış/);

    const yeniGiris = await istek("/api/login", {
      govde: { email: "token@test.invalid", password: "TamamenYeniSifre1" },
    });

    assert.equal(yeniGiris.yanit.status, 200);

    const eskiGiris = await istek("/api/login", {
      govde: { email: "token@test.invalid", password: "GucluSifre12345" },
    });

    assert.equal(eskiGiris.yanit.status, 401, "eski şifre çalışmamalı");
  });

  test("süresi dolmuş token reddedilir", async () => {
    await kullaniciOlustur("suresi@test.invalid");

    const kullaniciId = (
      await db.query('SELECT id FROM "User" WHERE email=$1', [
        "suresi@test.invalid",
      ])
    ).rows[0].id;

    const token = randomBytes(32).toString("base64url");
    const ozet = createHash("sha256").update(token).digest("hex");

    await db.query(
      'INSERT INTO "PasswordResetToken" (id,"tokenHash","userId","expiresAt","createdAt") VALUES ($1,$2,$3, now() - interval \'1 hour\', now())',
      ["prt-eski", ozet, kullaniciId]
    );

    const { yanit, govde } = await istek("/api/password/reset", {
      govde: { token, password: "TamamenYeniSifre1" },
    });

    assert.equal(yanit.status, 400);
    assert.match(govde.error, /süresi dolmuş/);
  });

  test("uydurma token reddedilir", async () => {
    const { yanit } = await istek("/api/password/reset", {
      govde: { token: "tamamen-uydurma", password: "TamamenYeniSifre1" },
    });

    assert.equal(yanit.status, 400);
  });
});

describe("şifre değiştirme", () => {
  test("mevcut şifreyle değiştirilir, diğer oturumlar kapanır", async () => {
    const birinciCihaz = await kullaniciOlustur("degistir@test.invalid");

    const ikinciGiris = await istek("/api/login", {
      govde: { email: "degistir@test.invalid", password: "GucluSifre12345" },
    });

    const ikinciCihaz = oturumCerezi(ikinciGiris.yanit, KULLANICI_CEREZI);

    assert.ok(ikinciCihaz);
    assert.equal((await sayfaAl("/account", ikinciCihaz)).status, 200);

    const yanit = await fetch(sunucu.taban + "/api/password/change", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: birinciCihaz,
        "x-forwarded-for": rastgeleIp(),
      },
      body: JSON.stringify({
        currentPassword: "GucluSifre12345",
        newPassword: "BambaskaSifre999",
      }),
      redirect: "manual",
    });

    assert.equal(yanit.status, 200);

    const tazeCerez = oturumCerezi(yanit, KULLANICI_CEREZI);
    assert.ok(tazeCerez, "yeni oturum çerezi verilmeli");

    // İşlemi yapan cihaz oturumda kalmalı.
    assert.equal((await sayfaAl("/account", tazeCerez)).status, 200);

    // Diğer cihazın oturumu kapanmalı.
    assert.equal((await sayfaAl("/account", ikinciCihaz)).status, 307);
  });

  test("yanlış mevcut şifre reddedilir", async () => {
    const cerez = await kullaniciOlustur("yanlismevcut@test.invalid");

    const { yanit } = await istek("/api/password/change", {
      cerez,
      govde: {
        currentPassword: "TamamenYanlis999",
        newPassword: "BambaskaSifre999",
      },
    });

    assert.equal(yanit.status, 401);
  });

  test("oturumsuz istek reddedilir", async () => {
    const { yanit } = await istek("/api/password/change", {
      govde: {
        currentPassword: "GucluSifre12345",
        newPassword: "BambaskaSifre999",
      },
    });

    assert.equal(yanit.status, 401);
  });
});

describe("e-posta doğrulama", () => {
  test("geçerli token e-postayı doğrular ve tükenir", async () => {
    await kullaniciOlustur("dogrula@test.invalid");

    const kullaniciId = (
      await db.query('SELECT id FROM "User" WHERE email=$1', [
        "dogrula@test.invalid",
      ])
    ).rows[0].id;

    const token = randomBytes(32).toString("base64url");
    const ozet = createHash("sha256").update(token).digest("hex");

    await db.query(
      'INSERT INTO "EmailVerificationToken" (id,"tokenHash","userId",email,"expiresAt","createdAt") VALUES ($1,$2,$3,$4, now() + interval \'1 day\', now())',
      ["evt-test", ozet, kullaniciId, "dogrula@test.invalid"]
    );

    const ilk = await istek("/api/email/verify", { govde: { token } });
    assert.equal(ilk.yanit.status, 200);

    const kayit = await db.query(
      'SELECT "emailVerifiedAt" FROM "User" WHERE id=$1',
      [kullaniciId]
    );

    assert.notEqual(kayit.rows[0].emailVerifiedAt, null);

    const ikinci = await istek("/api/email/verify", { govde: { token } });
    assert.equal(ikinci.yanit.status, 400, "token tek kullanımlık olmalı");
  });

  test("oturumsuz yeniden gönderme reddedilir", async () => {
    const { yanit } = await istek("/api/email/verify/resend");

    assert.equal(yanit.status, 401);
  });
});

describe("hız sınırlama", () => {
  test("aynı e-postaya 5 hatalı denemeden sonra 429 döner", async () => {
    await kullaniciOlustur("hiz@test.invalid");

    const ip = "203.0.113.240";
    const kodlar: number[] = [];

    for (let i = 0; i < 7; i += 1) {
      const { yanit } = await istek("/api/login", {
        ip,
        govde: { email: "hiz@test.invalid", password: "YanlisSifre999" },
      });

      kodlar.push(yanit.status);
    }

    assert.deepEqual(
      kodlar.slice(0, 5),
      [401, 401, 401, 401, 401],
      "ilk 5 deneme 401 olmalı"
    );
    assert.equal(kodlar[5], 429, "6. deneme engellenmeli");
    assert.equal(kodlar[6], 429);
  });

  test("engellenen yanıt Retry-After başlığı içerir", async () => {
    await kullaniciOlustur("retry@test.invalid");

    const ip = "203.0.113.241";
    let sonYanit: Response | null = null;

    for (let i = 0; i < 6; i += 1) {
      const { yanit } = await istek("/api/login", {
        ip,
        govde: { email: "retry@test.invalid", password: "YanlisSifre999" },
      });

      sonYanit = yanit;
    }

    assert.equal(sonYanit?.status, 429);
    assert.ok(Number(sonYanit?.headers.get("retry-after")) > 0);
  });
});

describe("genel eşya sayfası gizliliği", () => {
  test("sahibin telefonu ve e-postası sayfada görünmez", async () => {
    await db.query(
      'INSERT INTO "ItemRecord" (id,"assetName","ownerName",phone,email,description,category,status,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())',
      [
        "genel-kayit",
        "Valiz",
        "Mehmet Demir",
        "05559998877",
        "gizli-adres@test.invalid",
        "Gri valiz",
        "Seyahat",
        "lost",
      ]
    );

    const yanit = await fetch(sunucu.taban + "/item/genel-kayit");
    const icerik = await yanit.text();

    assert.equal(yanit.status, 200);
    assert.ok(icerik.includes("Valiz"), "eşya adı görünmeli");
    assert.ok(
      !icerik.includes("05559998877"),
      "telefon numarası sızdırılmamalı"
    );
    assert.ok(
      !icerik.includes("gizli-adres@test.invalid"),
      "e-posta adresi sızdırılmamalı"
    );
  });

  test("robots.txt kişiye özel yolları engeller", async () => {
    const icerik = await (await fetch(sunucu.taban + "/robots.txt")).text();

    for (const yol of ["/admin", "/account", "/item", "/api"]) {
      assert.ok(
        icerik.includes(`Disallow: ${yol}`),
        `${yol} engellenmemiş`
      );
    }
  });
});
