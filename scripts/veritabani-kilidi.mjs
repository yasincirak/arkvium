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
 * GÜVENLİ TARAFTA HATA VERME: adres ayrıştırılamazsa "farklı" değil,
 * "engelle" kararı verilir. Bozuk bir adres yüzünden production'a
 * yazma riski alınmaz.
 */

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
 * Test adresinin production adreslerinden GERÇEKTEN farklı olup
 * olmadığını belirler.
 *
 * Engelleme koşulları:
 *   1. Test adresi ayrıştırılamıyor.
 *   2. Bir production adresi tanımlı ama ayrıştırılamıyor.
 *   3. Bağlantı kimliği aynı (eski kural).
 *   4. Supabase proje referansı aynı (YENİ kural — port/host farkı
 *      artık kaçış yolu değil).
 *
 * `productionAdresleri` içinde değeri null/boş olan anahtarlar
 * ATLANIR: o değişken tanımlı değildir, karşılaştırılacak bir şey yoktur.
 *
 * @param {string|null} testUrl
 * @param {Record<string, string|null|undefined>} productionAdresleri
 * @returns {KilitKarari}
 */
export function testAdresiniDenetle(testUrl, productionAdresleri) {
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

  for (const [anahtar, prodUrl] of Object.entries(
    productionAdresleri ?? {}
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
