import assert from "node:assert/strict";
import { describe, test } from "node:test";

/**
 * TEST VERİTABANI GÜVENLİK KİLİDİ.
 *
 * Bu dosya, entegrasyon testlerinin ve migration'ın YANLIŞLIKLA
 * production veritabanına uygulanmasını engelleyen kuralı doğrular.
 *
 * KİLİT NEDEN GENİŞLETİLDİ: Eski kural yalnızca
 * `host:port/veritabanı@kullanıcı` kimliğini karşılaştırıyordu. Gerçek
 * bir vakada `.env.test` ile `.env` aynı Supabase projesini gösteriyor
 * ama FARKLI PORT kullanıyordu (transaction pooler 6543 / session pooler
 * 5432). Kimlikler farklı olduğu için eski kilit geçirdi. Geçirseydi
 * entegrasyon testleri production verisi üzerinde `TRUNCATE ... CASCADE`
 * çalıştıracak, tüm siparişler ve ödemeler silinecekti.
 *
 * Aşağıdaki "REGRESYON" testleri tam olarak o vakayı temsil eder.
 *
 * Adresler UYDURMADIR; gerçek hiçbir bağlantı bilgisi içermez ve
 * hiçbir veritabanına bağlanılmaz.
 *
 * DİKKAT — mesaj eşleştirmesinde `i` bayrağı kullanılmaz: JavaScript
 * "I" harfini "i" olarak küçültür, Türkçedeki "ı" olarak değil. Bu yüzden
 * `/aynı/i` deseni "AYNI" metniyle EŞLEŞMEZ. Desenler metindeki harfleri
 * olduğu gibi yazar.
 */

const {
  baglantiKimligi,
  supabaseProjeReferansi,
  testAdresiniDenetle,
} = await import("../../scripts/veritabani-kilidi.mjs");

/** Uydurma proje referansları (gerçek değil). */
const REF_A = "aaaabbbbccccddddeeee";
const REF_B = "zzzzyyyyxxxxwwwwvvvv";

/** Supabase transaction pooler biçimi (port 6543). */
const poolerIslem = (ref: string) =>
  `postgresql://postgres.${ref}:parola@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

/** Supabase session pooler biçimi — AYNI proje, farklı port (5432). */
const poolerOturum = (ref: string) =>
  `postgresql://postgres.${ref}:parola@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`;

/** Supabase doğrudan bağlantı biçimi — AYNI proje, farklı host. */
const dogrudan = (ref: string) =>
  `postgresql://postgres:parola@db.${ref}.supabase.co:5432/postgres`;

describe("proje referansı çıkarımı", () => {
  test("pooler adresinde referans kullanıcı adından okunur", () => {
    assert.equal(supabaseProjeReferansi(poolerIslem(REF_A)), REF_A);
    assert.equal(supabaseProjeReferansi(poolerOturum(REF_A)), REF_A);
  });

  test("doğrudan adreste referans host'tan okunur", () => {
    assert.equal(supabaseProjeReferansi(dogrudan(REF_A)), REF_A);
  });

  test("aynı projenin üç erişim biçimi aynı referansı verir", () => {
    const referanslar = new Set([
      supabaseProjeReferansi(poolerIslem(REF_A)),
      supabaseProjeReferansi(poolerOturum(REF_A)),
      supabaseProjeReferansi(dogrudan(REF_A)),
    ]);

    assert.equal(referanslar.size, 1, "üçü de aynı projeyi göstermeli");
  });

  test("Supabase olmayan adreste referans boştur", () => {
    assert.equal(
      supabaseProjeReferansi("postgresql://kullanici:p@localhost:5432/arkvium"),
      ""
    );

    assert.equal(
      supabaseProjeReferansi("postgresql://kullanici:p@10.0.0.5:5432/veri"),
      ""
    );
  });
});

describe("REGRESYON — aynı proje, farklı erişim yolu engellenir", () => {
  test("aynı proje + FARKLI PORT engellenir (gerçek vaka)", () => {
    const karar = testAdresiniDenetle(poolerIslem(REF_A), {
      DATABASE_URL: poolerOturum(REF_A),
      DIRECT_URL: poolerOturum(REF_A),
    });

    assert.equal(karar.guvenli, false, "aynı proje geçirilmemeli");
    assert.match(karar.sebep, /Supabase projesini/);
    assert.equal(karar.anahtar, "DATABASE_URL");
  });

  test("eski kural bu vakayı kaçırıyordu (kimlikler farklı)", () => {
    /*
      Bu test, düzeltmenin neden gerektiğini kanıtlar: iki adresin
      bağlantı kimliği FARKLIDIR, yani yalnızca kimliğe bakan eski kural
      "güvenli" derdi. Yeni kural referansa da baktığı için engelliyor.
    */
    assert.notEqual(
      baglantiKimligi(poolerIslem(REF_A)),
      baglantiKimligi(poolerOturum(REF_A)),
      "kimlikler farklı olmalı — eski kuralın kör noktası"
    );

    assert.equal(
      testAdresiniDenetle(poolerIslem(REF_A), {
        DATABASE_URL: poolerOturum(REF_A),
      }).guvenli,
      false
    );
  });

  test("aynı proje + FARKLI HOST (pooler / doğrudan) engellenir", () => {
    const karar = testAdresiniDenetle(poolerIslem(REF_A), {
      DATABASE_URL: dogrudan(REF_A),
    });

    assert.equal(karar.guvenli, false);
    assert.match(karar.sebep, /Supabase projesini/);
  });

  test("çakışma yalnızca DIRECT_URL ile olsa bile engellenir", () => {
    const karar = testAdresiniDenetle(poolerIslem(REF_A), {
      DATABASE_URL: poolerIslem(REF_B),
      DIRECT_URL: dogrudan(REF_A),
    });

    assert.equal(karar.guvenli, false);
    assert.equal(karar.anahtar, "DIRECT_URL");
  });
});

describe("birebir aynı adres engellenir (eski kural korunuyor)", () => {
  test("tamamen aynı bağlantı dizesi engellenir", () => {
    const karar = testAdresiniDenetle(poolerIslem(REF_A), {
      DATABASE_URL: poolerIslem(REF_A),
    });

    assert.equal(karar.guvenli, false);
    assert.match(karar.sebep, /AYNI veritabanını/);
  });
});

describe("gerçekten ayrı veritabanı geçer", () => {
  test("farklı Supabase projesi güvenlidir", () => {
    const karar = testAdresiniDenetle(poolerIslem(REF_B), {
      DATABASE_URL: poolerIslem(REF_A),
      DIRECT_URL: dogrudan(REF_A),
    });

    assert.equal(karar.guvenli, true, "ayrı proje engellenmemeli");
    assert.equal(karar.sebep, "");
  });

  test("yerel iki farklı veritabanı güvenlidir", () => {
    /*
      İkisinin de proje referansı boştur. Boş referanslar EŞLEŞMİŞ
      sayılsaydı, Supabase kullanmayan kurulumlarda testler hiç
      çalıştırılamazdı.
    */
    const karar = testAdresiniDenetle(
      "postgresql://kullanici:p@localhost:5432/arkvium_test",
      { DATABASE_URL: "postgresql://kullanici:p@localhost:5432/arkvium" }
    );

    assert.equal(karar.guvenli, true);
  });

  test("production değişkeni tanımsızsa karşılaştırma atlanır", () => {
    const karar = testAdresiniDenetle(poolerIslem(REF_B), {
      DATABASE_URL: null,
      DIRECT_URL: undefined,
    });

    assert.equal(karar.guvenli, true);
  });
});

describe("güvenli tarafta hata verme", () => {
  test("test adresi yoksa engellenir", () => {
    assert.equal(testAdresiniDenetle(null, {}).guvenli, false);
    assert.equal(testAdresiniDenetle("", {}).guvenli, false);
  });

  test("test adresi bozuksa engellenir", () => {
    const karar = testAdresiniDenetle("bu-bir-adres-degil", {
      DATABASE_URL: poolerIslem(REF_A),
    });

    assert.equal(karar.guvenli, false);
    assert.match(karar.sebep, /geçerli bir bağlantı adresi değil/i);
  });

  test("production adresi bozuksa engellenir", () => {
    /*
      Karşılaştırma yapılamıyorsa "farklı" varsayılmaz. Bozuk bir
      production değeri yüzünden testlerin geçmesine izin vermek,
      kilidin tamamen atlanması demektir.
    */
    const karar = testAdresiniDenetle(poolerIslem(REF_B), {
      DATABASE_URL: "postgres//bozuk-adres",
    });

    assert.equal(karar.guvenli, false);
    assert.match(karar.sebep, /karşılaştırma yapılamadı/i);
  });

  test("production adresleri hiç verilmezse çökmez", () => {
    assert.equal(
      testAdresiniDenetle(poolerIslem(REF_B), undefined as never).guvenli,
      true
    );
  });
});
