import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";
import type { Client } from "pg";

import {
  testVeritabaniAdresi,
  testVeritabaniIstemcisi,
  veritabaniniTemizle,
  yoneticiOturumuKur,
} from "../helpers/test-ortami.mts";

/**
 * Analitik olay ucu — GÜVENLİK VE FİLTRE TESTLERİ.
 *
 * Doğrulanan kurallar:
 *  - Tarayıcı SATIŞ, ödeme başlatma veya başarısız ödeme olayı yazamaz.
 *  - YÖNETİCİ ZİYARETLERİ müşteri istatistiğine katılmaz.
 *  - Yönetim ve hesap yolları kaydedilmez.
 *  - Ziyaretçi kimliği sunucuda üretilir; istemcinin uydurduğu değer
 *    kullanılmaz.
 *  - Kaydedilen satırda IP, e-posta ve tarayıcı bilgisi bulunmaz.
 *
 * Uç doğrudan çağrılır (HTTP sunucusu başlatılmaz); `next/headers`
 * yalnızca çerez okuma için taklit edilir, oturum imzası ve rol kontrolü
 * gerçek koddan geçer.
 */

const testVeritabani = testVeritabaniAdresi();

process.env.DATABASE_URL = testVeritabani;
process.env.DIRECT_URL = testVeritabani;
process.env.USER_SESSION_SECRET = "test-kullanici-anahtari-" + "u".repeat(32);

const { prisma } = await import("../../src/lib/prisma.ts");
const { POST } = await import("../../src/app/api/analitik/olay/route.ts");
const { SIPARIS_URUNLERI } = await import("../../src/lib/siparis.ts");
const { ZIYARETCI_COOKIE } = await import(
  "../../src/lib/analitik-ziyaretci.ts"
);
const { cerezAyarla, cerezleriTemizle } = await import(
  "../helpers/next-taklit.mjs"
);

const db: Client = await testVeritabaniIstemcisi();

after(async () => {
  await prisma.$disconnect();
  await db?.end();
});

const URUN = SIPARIS_URUNLERI[0];

beforeEach(async () => {
  await veritabaniniTemizle(db);
  cerezleriTemizle();
});

/** Uca istek gönderir. Her çağrı farklı IP kullanır (hız sınırı için). */
function istek(
  govde: unknown,
  secenekler: { ziyaretciCerezi?: string; ip?: string } = {}
): Request {
  const basliklar: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for":
      secenekler.ip ??
      `198.51.100.${1 + Math.floor(Math.random() * 250)}`,
  };

  if (secenekler.ziyaretciCerezi) {
    basliklar.cookie = `${ZIYARETCI_COOKIE}=${secenekler.ziyaretciCerezi}`;
  }

  return new Request("http://localhost/api/analitik/olay", {
    method: "POST",
    headers: basliklar,
    body: JSON.stringify(govde),
  });
}

describe("satış tarayıcıdan üretilemez", () => {
  test("purchase olayı 400 ile reddedilir ve satır yazılmaz", async () => {
    const yanit = await POST(
      istek({ tur: "purchase", yol: "/", urunKodu: URUN.kod })
    );

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("checkout_started ve payment_failed reddedilir", async () => {
    for (const tur of ["checkout_started", "payment_failed"]) {
      const yanit = await POST(istek({ tur, yol: "/", urunKodu: URUN.kod }));

      assert.equal(yanit.status, 400, `${tur} reddedilmeli`);
    }

    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("uydurma tür reddedilir", async () => {
    const yanit = await POST(istek({ tur: "satis", yol: "/" }));

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.analyticsEvent.count(), 0);
  });
});

describe("yönetici ziyaretleri sayılmaz", () => {
  test("ADMIN oturumunda hiçbir satır yazılmaz", async () => {
    await yoneticiOturumuKur({ prisma, cerezAyarla });

    const yanit = await POST(istek({ tur: "page_view", yol: "/" }));

    assert.equal(yanit.status, 200);

    const veri = await yanit.json();

    assert.equal(veri.kaydedildi, false);
    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("CUSTOMER oturumundaki ziyaret sayılır", async () => {
    await yoneticiOturumuKur({
      prisma,
      cerezAyarla,
      eposta: "musteri@test.invalid",
      rol: "CUSTOMER",
    });

    const yanit = await POST(istek({ tur: "page_view", yol: "/" }));

    assert.equal(yanit.status, 200);
    assert.equal(await prisma.analyticsEvent.count(), 1);
  });

  test("oturumsuz ziyaret sayılır", async () => {
    await POST(istek({ tur: "page_view", yol: "/" }));

    assert.equal(await prisma.analyticsEvent.count(), 1);
  });
});

describe("yol filtresi", () => {
  test("yönetim ve hesap yolları kaydedilmez", async () => {
    for (const yol of ["/admin", "/admin/orders", "/account"]) {
      await POST(istek({ tur: "page_view", yol }));
    }

    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("sorgu dizesi kaydedilmez", async () => {
    await POST(
      istek({
        tur: "product_view",
        yol: "/siparis?urun=sticker-seti&token=gizli",
        urunKodu: URUN.kod,
      })
    );

    const olay = await prisma.analyticsEvent.findFirst();

    assert.equal(olay?.path, "/siparis");
  });
});

describe("ürün doğrulaması", () => {
  test("katalogda olmayan ürün kodu reddedilir", async () => {
    const yanit = await POST(
      istek({ tur: "product_view", yol: "/siparis", urunKodu: "sahte-urun" })
    );

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.analyticsEvent.count(), 0);
  });

  test("ürün kodu olmadan sepete ekleme reddedilir", async () => {
    const yanit = await POST(istek({ tur: "cart_add", yol: "/" }));

    assert.equal(yanit.status, 400);
    assert.equal(await prisma.analyticsEvent.count(), 0);
  });
});

describe("ziyaretçi kimliği", () => {
  test("çerez yoksa sunucu üretir ve yanıtta gönderir", async () => {
    const yanit = await POST(istek({ tur: "page_view", yol: "/" }));

    const cerez = yanit.headers.get("set-cookie");

    assert.ok(cerez?.includes(`${ZIYARETCI_COOKIE}=`), "çerez ayarlanmalı");
    assert.ok(cerez?.includes("HttpOnly"), "çerez betikten okunamamalı");

    const olay = await prisma.analyticsEvent.findFirst();

    assert.ok(olay?.visitorId, "ziyaretçi kimliği yazılmalı");
    assert.equal(olay?.visitorId?.length, 32);
  });

  test("geçerli çerez korunur, yeni kimlik üretilmez", async () => {
    const kimlik = "a".repeat(32);

    const yanit = await POST(
      istek({ tur: "page_view", yol: "/" }, { ziyaretciCerezi: kimlik })
    );

    assert.equal(
      yanit.headers.get("set-cookie"),
      null,
      "mevcut kimlik varken çerez yeniden yazılmamalı"
    );

    const olay = await prisma.analyticsEvent.findFirst();

    assert.equal(olay?.visitorId, kimlik);
  });

  test("bozuk çerez kabul edilmez, yerine yenisi üretilir", async () => {
    await POST(
      istek(
        { tur: "page_view", yol: "/" },
        { ziyaretciCerezi: "yonetici-taklidi" }
      )
    );

    const olay = await prisma.analyticsEvent.findFirst();

    assert.notEqual(olay?.visitorId, "yonetici-taklidi");
    assert.equal(olay?.visitorId?.length, 32);
  });
});

describe("paylaşılan IP eksik sayıma yol açmaz", () => {
  test("aynı IP'deki farklı ziyaretçilerin olayları ayrı ayrı kaydedilir", async () => {
    /*
      Kurumsal ağ veya mobil operatör NAT'ı arkasındaki ziyaretçiler tek
      IP olarak görünür. Sınır yalnızca IP'ye bağlı olsaydı bu ziyaretçiler
      birbirinin kotasını tüketirdi. Asıl sınır artık tarayıcı (ziyaretçi)
      başına uygulanıyor; IP yalnızca yüksek bir kötüye kullanım tavanı.
    */
    const paylasilanIp = "203.0.113.10";

    const ziyaretciler = ["1", "2", "3"].map((n) => n.repeat(32));

    for (const ziyaretci of ziyaretciler) {
      const yanit = await POST(
        istek(
          { tur: "page_view", yol: "/" },
          { ziyaretciCerezi: ziyaretci, ip: paylasilanIp }
        )
      );

      assert.equal(yanit.status, 200);
    }

    assert.equal(
      await prisma.analyticsEvent.count(),
      ziyaretciler.length,
      "aynı IP'deki her ziyaretçi ayrı sayılmalı"
    );

    const kayitliKimlikler = await prisma.analyticsEvent.findMany({
      select: { visitorId: true },
    });

    assert.deepEqual(
      kayitliKimlikler.map((s) => s.visitorId).sort(),
      [...ziyaretciler].sort()
    );
  });

  test("tek ziyaretçi sınırsız olay yazamaz", async () => {
    const ziyaretci = "7".repeat(32);

    // Ziyaretçi sınırı 200/saat. Sınırı aşana kadar gönderilir.
    let sonDurum = 200;

    for (let i = 0; i < 205; i += 1) {
      const yanit = await POST(
        istek({ tur: "page_view", yol: "/" }, { ziyaretciCerezi: ziyaretci })
      );

      sonDurum = yanit.status;

      if (sonDurum === 429) {
        break;
      }
    }

    assert.equal(sonDurum, 429, "ziyaretçi sınırı devreye girmeli");
  });
});

describe("kişisel veri saklanmaz", () => {
  test("kaydedilen satırda IP ve tarayıcı bilgisi bulunmaz", async () => {
    await POST(
      istek({ tur: "page_view", yol: "/" }, { ip: "203.0.113.55" })
    );

    const olay = await prisma.analyticsEvent.findFirst();

    assert.ok(olay);

    const metin = JSON.stringify(olay);

    assert.ok(!metin.includes("203.0.113.55"), "IP adresi yazılmamalı");
    assert.ok(!metin.includes("Mozilla"), "tarayıcı bilgisi yazılmamalı");

    // Tabloda böyle bir alan hiç yoktur.
    assert.equal("ip" in (olay as Record<string, unknown>), false);
    assert.equal("userAgent" in (olay as Record<string, unknown>), false);
  });
});
