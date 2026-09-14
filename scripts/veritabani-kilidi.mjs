/**
 * TEST VERİTABANI GÜVENLİK KİLİDİ — tek kaynak.
 *
 * Hem `scripts/test-db-migrate.mjs` hem `tests/helpers/test-ortami.mts`
 * bu dosyayı kullanır. Kural iki yerde ayrı ayrı yazılırsa biri
 * güncellenip diğeri unutulur; bu yüzden tek dosyada tutuluyor.
 *
 * Saf fonksiyonlardır: dosya okumaz, veritabanına BAĞLANMAZ. Bu sayede
 * birim testleriyle doğrulanabilir (tests/unit/test-veritabani-kilidi.test.mts).
 *
 * ────────────────────────────────────────────────────────────
 * NEDEN PROJE REFERANSI DA KARŞILAŞTIRILIYOR
 *
 * Eski kilit yalnızca `host:port/veritabanı@kullanıcı` kimliğini
 * karşılaştırıyordu. Bu YETERSİZDİ: Supabase aynı veritabanına birden
 * çok yoldan erişim sunar —
 *
 *   - transaction pooler ile session pooler FARKLI PORT kullanır,
 *   - pooler bağlantısı ile doğrudan bağlantı FARKLI HOST kullanır.
 *
 * Bu yüzden aynı veritabanı, farklı kimlik üretebiliyordu ve kilit
 * "farklı veritabanı" sanıp geçiriyordu. Gerçek bir vakada
 * `.env.test` ile `.env` yalnızca port bakımından farklıydı; kilit
 * geçirseydi entegrasyon testleri production verisi üzerinde
 * `TRUNCATE ... CASCADE` çalıştıracaktı.
 *
 * Supabase PROJE REFERANSI ise erişim yolundan bağımsızdır ve projeyi
 * tekil olarak tanımlar. İki adres aynı referansı taşıyorsa aynı
 * veritabanıdır — port ve host farklı olsa bile.
 * ────────────────────────────────────────────────────────────
 *
 * ────────────────────────────────────────────────────────────
 * `.env` PRODUCTION VARSAYILMAZ — ÖNEMLİ
 *
 * Bu kilidin ilk sürümü "production" adresini `.env` dosyasından
 * çıkarıyordu. Bu VARSAYIM YANLIŞTI: `.env` yerel geliştirme dosyasıdır
 * ve pekâlâ TEST projesini gösterebilir (bu projede öyle).
 *
 * Sonuç tehlikeliydi: `.env` test projesini tutarken `.env.test` CANLI
 * veritabanını gösterdi ve kilit "güvenli" dedi — çünkü ikisi gerçekten
 * farklı projelerdi. Kilit doğru soruyu sormuyordu.
 *
 * Doğru soru "birbirlerinden farklı mı" değil, "hedef GERÇEKTEN test
 * veritabanı mı" sorusudur. Bu ancak AÇIK BEYANLA yanıtlanabilir:
 *
 *   TEST_SUPABASE_PROJECT_REF      — izin verilen TEK hedef
 *   YASAK_SUPABASE_PROJECT_REFS    — asla dokunulmayacaklar (virgülle)
 *
 * Bu iki değer `.env.test` içinde durur (Git'e girmez); bu dosya
 * yalnızca kuralı içerir, hiçbir gerçek referans veya bağlantı bilgisi
 * İÇERMEZ.
 *
 * Beyan varsa karar YALNIZCA beyana göre verilir; `.env` ile
 * karşılaştırma yapılmaz. Beyan yoksa eski davranışa düşülür (geriye
 * dönük uyumluluk).
 * ────────────────────────────────────────────────────────────
 *
 * GÜVENLİ TARAFTA HATA VERME: adres ayrıştırılamazsa "farklı" değil,
 * "engelle" kararı verilir. Bozuk bir adres yüzünden production'a
 * yazma riski alınmaz.
 */

/**
 * Virgülle ayrılmış referans listesini diziye çevirir.
 *
 * @param {string|null|undefined} deger
 * @returns {string[]}
 */
export function referansListesiCoz(deger) {
  if (typeof deger !== "string") {
    return [];
  }

  return deger
    .split(",")
    .map((parca) => parca.trim())
    .filter(Boolean);
}

/**
 * Bağlantının kaba kimliği: host, port, veritabanı adı ve kullanıcı.
 *
 * Tek başına yeterli DEĞİLDİR (bkz. yukarıdaki açıklama); proje
 * referansı kontrolüyle birlikte kullanılır.
 *
 * @param {string} url
 * @returns {string}
 */
export function baglantiKimligi(url) {
  const adres = new URL(url);

  return `${adres.hostname}:${adres.port || "5432"}${adres.pathname}@${adres.username}`;
}

/**
 * Supabase proje referansını çıkarır.
 *
 * İki bağlantı biçimi vardır ve referans farklı yerde durur:
 *
 *   doğrudan : postgresql://postgres:***@db.<REF>.supabase.co:5432/postgres
 *   pooler   : postgresql://postgres.<REF>:***@aws-0-<bölge>.pooler.supabase.com:6543/postgres
 *
 * Pooler adresinde host tüm projeler için ORTAKTIR; referans kullanıcı
 * adının içindedir. Bu yüzden host'a bakmak yetmez.
 *
 * Supabase olmayan adreslerde (localhost, kendi sunucunuz) referans
 * yoktur; boş string döner ve karşılaştırmaya girmez.
 *
 * @param {string} url
 * @returns {string} referans, yoksa boş string
 */
export function supabaseProjeReferansi(url) {
  const adres = new URL(url);

  if (adres.hostname.includes("pooler.supabase.")) {
    // "postgres.<ref>" → ["postgres", "<ref>"]
    const parcalar = adres.username.split(".");

    return parcalar.length >= 2 ? parcalar[1] : "";
  }

  if (adres.hostname.endsWith(".supabase.co")) {
    // "db.<ref>.supabase.co" → ["db", "<ref>", "supabase", "co"]
    const parcalar = adres.hostname.split(".");

    return parcalar.length >= 3 ? parcalar[1] : "";
  }

  return "";
}

/**
 * Kilit kararı.
 *
 * @typedef {Object} KilitKarari
 * @property {boolean} guvenli  true ise işleme devam edilebilir.
 * @property {string}  sebep    Engelleme gerekçesi (guvenli ise boş).
 * @property {string}  [anahtar] Çakışan production değişkeninin adı.
 */

/**
 * Test adresinin gerçekten TEST veritabanını gösterip göstermediğini
 * belirler.
 *
 * KARAR SIRASI:
 *
 *   1. Test adresi ayrıştırılamıyorsa → ENGELLE.
 *   2. Referans YASAK listesindeyse → ENGELLE (en yüksek öncelik;
 *      beyan olsun olmasın her zaman uygulanır).
 *   3. `izinliTestRef` beyan edilmişse: referans ona TAM EŞİT değilse
 *      → ENGELLE. Eşitse GÜVENLİ ve `.env` karşılaştırması YAPILMAZ —
 *      `.env` production olmak zorunda değildir.
 *   4. Beyan yoksa eski davranış: kimlik veya proje referansı
 *      `karsilastirilacakAdresler` içindekilerden biriyle aynıysa
 *      → ENGELLE.
 *
 * @param {string|null} testUrl
 * @param {Record<string, string|null|undefined>} karsilastirilacakAdresler
 * @param {{izinliTestRef?: string|null, yasakRefler?: string[]}} [beyan]
 * @returns {KilitKarari}
 */
export function testAdresiniDenetle(testUrl, karsilastirilacakAdresler, beyan) {
  if (!testUrl) {
    return {
      guvenli: false,
      sebep: "TEST_DATABASE_URL tanımlı değil.",
    };
  }

  let testKimlik;
  let testRef;

  try {
    testKimlik = baglantiKimligi(testUrl);
    testRef = supabaseProjeReferansi(testUrl);
  } catch {
    return {
      guvenli: false,
      sebep: "TEST_DATABASE_URL geçerli bir bağlantı adresi değil.",
    };
  }

  const izinliTestRef = beyan?.izinliTestRef ?? null;
  const yasakRefler = beyan?.yasakRefler ?? [];

  /*
    YASAK LİSTESİ — en yüksek öncelik.
    Beyan edilen bir referans hiçbir koşulda hedef olamaz.
  */
  if (testRef && yasakRefler.includes(testRef)) {
    return {
      guvenli: false,
      sebep:
        "TEST_DATABASE_URL, YASAK_SUPABASE_PROJECT_REFS listesindeki bir " +
        "projeyi gösteriyor. Bu proje canlı olarak işaretlenmiş.",
    };
  }

  /*
    AÇIK BEYAN — varsa tek ölçüt budur.
    `.env` ile karşılaştırma yapılmaz: `.env` test projesini de
    gösterebilir ve o durumda karşılaştırma yanlış sonuç üretir.
  */
  if (izinliTestRef) {
    if (!testRef) {
      return {
        guvenli: false,
        sebep:
          "TEST_SUPABASE_PROJECT_REF beyan edilmiş ama TEST_DATABASE_URL " +
          "bir Supabase adresi değil.",
      };
    }

    if (testRef !== izinliTestRef) {
      return {
        guvenli: false,
        sebep:
          "TEST_DATABASE_URL, TEST_SUPABASE_PROJECT_REF ile beyan edilen " +
          "test projesini göstermiyor.",
      };
    }

    return { guvenli: true, sebep: "" };
  }

  for (const [anahtar, prodUrl] of Object.entries(
    karsilastirilacakAdresler ?? {}
  )) {
    if (!prodUrl) {
      continue;
    }

    let prodKimlik;
    let prodRef;

    try {
      prodKimlik = baglantiKimligi(prodUrl);
      prodRef = supabaseProjeReferansi(prodUrl);
    } catch {
      // Ayrıştırılamayan production adresi karşılaştırılamaz.
      // Güvenli tarafta hata verilir: işlem engellenir.
      return {
        guvenli: false,
        anahtar,
        sebep: `${anahtar} geçerli bir bağlantı adresi değil; karşılaştırma yapılamadı.`,
      };
    }

    if (prodKimlik === testKimlik) {
      return {
        guvenli: false,
        anahtar,
        sebep: `TEST_DATABASE_URL, ${anahtar} ile AYNI veritabanını gösteriyor.`,
      };
    }

    /*
      Referans karşılaştırması yalnızca İKİSİ DE dolu olduğunda yapılır.
      Boş referans "Supabase değil" demektir; iki farklı yerel
      veritabanının boş referansı eşleşip yanlışlıkla engellenmemelidir.
    */
    if (testRef && prodRef && testRef === prodRef) {
      return {
        guvenli: false,
        anahtar,
        sebep:
          `TEST_DATABASE_URL, ${anahtar} ile AYNI Supabase projesini ` +
          "gösteriyor (port ve host farklı olsa bile aynı veritabanıdır).",
      };
    }
  }

  return { guvenli: true, sebep: "" };
}

/**
 * MIGRATION için kullanılacak adresi üretir.
 *
 * Supabase iki havuzlayıcı (pooler) modu sunar ve ikisi AYNI veritabanına
 * bağlanır:
 *
 *   6543 — transaction pooler : her sorgu ayrı oturum alabilir
 *   5432 — session pooler     : oturum boyunca tek bağlantı
 *
 * `prisma migrate deploy` SESSION MODU ZORUNLU tutar: migration'ları
 * advisory lock ile serileştirir ve oturum durumu kullanır. Transaction
 * pooler'a bağlandığında "can-connect-to-database" adımında SESSİZCE
 * ASILI KALIR — hata da vermez, ilerlemez de (ölçüldü).
 *
 * Bu yüzden adres transaction pooler ise migration için portu 5432'ye
 * çevrilir. Kullanıcı adı, host, veritabanı ve şifre AYNEN korunur;
 * yalnızca port değişir, dolayısıyla hedef veritabanı değişmez.
 *
 * Şifre bölümüne dokunulmaması için `@` işaretinden SONRAKİ kısımda
 * düzenleme yapılır: şifrenin içinde ":6543" benzeri bir dizi bulunsa
 * bile bozulmaz.
 *
 * Supabase dışı adresler ve zaten 5432 olan adresler DEĞİŞTİRİLMEDEN
 * döner.
 *
 * @param {string} url
 * @returns {string}
 */
export function migrationIcinAdres(url) {
  let adres;

  try {
    adres = new URL(url);
  } catch {
    return url;
  }

  if (!adres.hostname.includes("pooler.supabase.") || adres.port !== "6543") {
    return url;
  }

  const sonAt = url.lastIndexOf("@");

  if (sonAt === -1) {
    return url;
  }

  const kullaniciBolumu = url.slice(0, sonAt + 1);
  const sunucuBolumu = url.slice(sonAt + 1);

  return kullaniciBolumu + sunucuBolumu.replace(/:6543(?=\/|\?|$)/, ":5432");
}
