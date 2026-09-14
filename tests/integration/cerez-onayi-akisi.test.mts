import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
} from "../helpers/test-ortami.mts";

/**
 * Çerez onayı akışları — KABUL, RET ve TERCİH DEĞİŞTİRME.
 *
 * Doğrulanan kurallar:
 *  - Onay YOKKEN hiçbir analitik satır yazılmaz ve `arkvium_va` /
 *    `arkvium_vo` çerezleri OLUŞMAZ. Bu, istemci kapısı atlatılsa bile
 *    geçerli olan asıl garantidir (istekler uca doğrudan gönderiliyor).
 *  - Kabul edildikten sonra olaylar kaydedilir ve çerezler verilir.
 *  - Reddedildiğinde daha önce oluşmuş analitik çerezleri SİLİNİR.
 *  - Tercih her iki yönde de değiştirilebilir.
 *
 * Uçlar doğrudan çağrılır; HTTP sunucusu başlatılmaz.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.USER_SESSION_SECRET = "test-kullanici-anahtari-" + "u".repeat(32);

const { prisma } = await import("../../src/lib/prisma.ts");
const { POST: olayUcu } = await import(
  "../../src/app/api/analitik/olay/route.ts"
);
const { POST: onayUcu } = await import(
  "../../src/app/api/cerez-onayi/route.ts"
);
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { CEREZ_ONAY_COOKIE, onayDegeriYaz } = await import(
  "../../src/lib/cerez-onayi.ts"
);
const { ZIYARETCI_COOKIE, ZIYARET_COOKIE } = await import(
  "../../src/lib/analitik-ziyaretci.ts"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const URUN = SIPARIS_URUNLERI[0];

beforeEach(async () => {
  await veritabaniniTemizle(db);
});

/** Verilen çerezlerle analitik olay isteği üretir. */
function olayIstegi(cerezler: Record<string, string> = {}): Request {
  const basliklar: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": `198.51.100.${1 + Math.floor(Math.random() * 250)}`,
  };

  const parcalar = Object.entries(cerezler).map(
    ([ad, deger]) => `${ad}=${deger}`
  );

  if (parcalar.length > 0) {
    basliklar.cookie = parcalar.join("; ");
  }

  return new Request("http://localhost/api/analitik/olay", {
    method: "POST",
    headers: basliklar,
    body: JSON.stringify({ tur: "page_view", yol: "/" }),
  });
}

function onayIstegi(govde: unknown): Request {
  return new Request("http://localhost/api/cerez-onayi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
}

/** Yanıttaki tüm Set-Cookie satırlarını tek metne çevirir. */
function cerezMetni(yanit: Response): string {
  return yanit.headers.getSetCookie().join("\n");
}

describe("onay verilmeden analitik çalışmaz", () => {
  test("çerez onayı yokken satır yazılmaz", async () => {
    const yanit = await olayUcu(olayIstegi());

    assert.equal(yanit.status, 200);

    const veri = await yanit.json();

    assert.equal(veri.kaydedildi, false);
    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("çerez onayı yokken ANALİTİK ÇEREZ OLUŞMAZ", async () => {
    const yanit = await olayUcu(olayIstegi());

    const cerezler = cerezMetni(yanit);

    assert.ok(
      !cerezler.includes(`${ZIYARETCI_COOKIE}=`),
      "ziyaretçi çerezi oluşmamalı"
    );

    assert.ok(
      !cerezler.includes(`${ZIYARET_COOKIE}=`),
      "ziyaret çerezi oluşmamalı"
    );
  });

  test("REDDEDİLMİŞKEN satır yazılmaz ve çerez oluşmaz", async () => {
    const yanit = await olayUcu(
      olayIstegi({ [CEREZ_ONAY_COOKIE]: onayDegeriYaz("red") })
    );

    assert.equal((await yanit.json()).kaydedildi, false);
    assert.equal(await prisma.analyticsEvent.count(), 0);
    assert.equal(cerezMetni(yanit), "", "hiçbir çerez ayarlanmamalı");
  });

  test("ESKİ SÜRÜMLÜ onay geçerli sayılmaz", async () => {
    await olayUcu(olayIstegi({ [CEREZ_ONAY_COOKIE]: "kabul:0" }));

    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("bozuk onay değeri geçerli sayılmaz", async () => {
    await olayUcu(olayIstegi({ [CEREZ_ONAY_COOKIE]: "evet" }));

    assert.equal(await prisma.analyticsEvent.count(), 0);
  });
});

describe("KABUL akışı", () => {
  test("kabul tercihi kaydedilir", async () => {
    const yanit = await onayUcu(onayIstegi({ durum: "kabul" }));

    assert.equal(yanit.status, 200);

    const cerezler = cerezMetni(yanit);

    assert.ok(cerezler.includes(`${CEREZ_ONAY_COOKIE}=kabul%3A1`) ||
      cerezler.includes(`${CEREZ_ONAY_COOKIE}=kabul:1`),
      "onay çerezi yazılmalı");

    // Banner'ın sunucuya sormadan okuyabilmesi için httpOnly OLMAMALI.
    assert.ok(
      !cerezler.toLowerCase().includes("httponly"),
      "onay çerezi httpOnly olmamalı"
    );
  });

  test("kabul edildikten sonra olay kaydedilir ve çerezler verilir", async () => {
    const yanit = await olayUcu(
      olayIstegi({ [CEREZ_ONAY_COOKIE]: onayDegeriYaz("kabul") })
    );

    assert.equal((await yanit.json()).kaydedildi, true);
    assert.equal(await prisma.analyticsEvent.count(), 1);

    const cerezler = cerezMetni(yanit);

    assert.ok(cerezler.includes(`${ZIYARETCI_COOKIE}=`), "ziyaretçi çerezi");
    assert.ok(cerezler.includes(`${ZIYARET_COOKIE}=`), "ziyaret çerezi");
  });
});

describe("RET akışı", () => {
  test("ret tercihi kaydedilir ve analitik çerezler SİLİNİR", async () => {
    const yanit = await onayUcu(onayIstegi({ durum: "red" }));

    assert.equal(yanit.status, 200);

    const cerezler = cerezMetni(yanit);

    assert.ok(
      cerezler.includes(`${CEREZ_ONAY_COOKIE}=`),
      "onay çerezi yazılmalı"
    );

    /*
      Silme, süresi geçmiş bir Set-Cookie ile yapılır. Daha önce kabul
      edilmişse takip kimliği tarayıcıda kalmamalıdır.
    */
    assert.ok(
      cerezler.includes(`${ZIYARETCI_COOKIE}=`),
      "ziyaretçi çerezi silinmeli"
    );

    assert.ok(
      cerezler.includes(`${ZIYARET_COOKIE}=`),
      "ziyaret çerezi silinmeli"
    );

    assert.ok(
      cerezler.includes("Max-Age=0") || cerezler.includes("Expires=Thu, 01 Jan 1970"),
      "silme çerezleri süresi dolmuş olmalı"
    );
  });

  test("geçersiz tercih değeri reddedilir", async () => {
    for (const durum of ["belirsiz", "evet", "", null, 1]) {
      const yanit = await onayUcu(onayIstegi({ durum }));

      assert.equal(yanit.status, 400, `reddedilmeli: ${String(durum)}`);
    }
  });

  test("gövdesiz istek reddedilir", async () => {
    const yanit = await onayUcu(
      new Request("http://localhost/api/cerez-onayi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bozuk",
      })
    );

    assert.equal(yanit.status, 400);
  });
});

describe("TERCİH DEĞİŞTİRME akışı", () => {
  test("kabul → ret: analitik durur", async () => {
    // Önce kabul edip bir olay yaz.
    await olayUcu(olayIstegi({ [CEREZ_ONAY_COOKIE]: onayDegeriYaz("kabul") }));

    assert.equal(await prisma.analyticsEvent.count(), 1);

    // Sonra reddet.
    const retYaniti = await onayUcu(onayIstegi({ durum: "red" }));

    assert.equal(retYaniti.status, 200);

    // Yeni olay artık yazılmamalı.
    await olayUcu(olayIstegi({ [CEREZ_ONAY_COOKIE]: onayDegeriYaz("red") }));

    assert.equal(
      await prisma.analyticsEvent.count(),
      1,
      "ret sonrası yeni satır yazılmamalı"
    );
  });

  test("ret → kabul: analitik yeniden başlar", async () => {
    await olayUcu(olayIstegi({ [CEREZ_ONAY_COOKIE]: onayDegeriYaz("red") }));

    assert.equal(await prisma.analyticsEvent.count(), 0);

    const kabulYaniti = await onayUcu(onayIstegi({ durum: "kabul" }));

    assert.equal(kabulYaniti.status, 200);

    await olayUcu(olayIstegi({ [CEREZ_ONAY_COOKIE]: onayDegeriYaz("kabul") }));

    assert.equal(
      await prisma.analyticsEvent.count(),
      1,
      "kabul sonrası satır yazılmalı"
    );
  });

  test("tercih değiştirmek veritabanına dokunmaz", async () => {
    const oncekiKullanici = await prisma.user.count();

    await onayUcu(onayIstegi({ durum: "kabul" }));
    await onayUcu(onayIstegi({ durum: "red" }));

    assert.equal(await prisma.user.count(), oncekiKullanici);
    assert.equal(
      await prisma.analyticsEvent.count(),
      0,
      "tercih kaydı analitik satırı üretmez"
    );
  });
});

describe("ürün olayları da onaya bağlıdır", () => {
  test("onaysız sepete ekleme kaydedilmez", async () => {
    const istek = new Request("http://localhost/api/analitik/olay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.7",
      },
      body: JSON.stringify({
        tur: "cart_add",
        yol: "/",
        urunKodu: URUN.kod,
      }),
    });

    await olayUcu(istek);

    assert.equal(await prisma.analyticsEvent.count(), 0);
  });
});
