import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { Client } from "pg";

/**
 * Entegrasyon testleri için izole ortam.
 *
 * GÜVENLİK: Bu dosya, testlerin yanlışlıkla production veritabanına
 * bağlanmasını engellemek için birden fazla kontrol yapar. Kontrollerden
 * biri başarısız olursa testler çalıştırılmaz.
 */

const TEST_PORT = 3011;

function envDegeriOku(dosya: string, anahtar: string): string | null {
  if (!existsSync(dosya)) {
    return null;
  }

  const eslesme = readFileSync(dosya, "utf8").match(
    new RegExp(`^\\s*${anahtar}\\s*=\\s*["']?(.*?)["']?\\s*$`, "m")
  );

  return eslesme?.[1] || null;
}

function baglantiKimligi(url: string) {
  const adres = new URL(url);

  return `${adres.hostname}:${adres.port || "5432"}/${adres.pathname}@${adres.username}`;
}

/**
 * Test veritabanı adresini döndürür.
 * Production adresiyle çakışıyorsa hata fırlatır.
 */
export function testVeritabaniAdresi(): string {
  const testUrl = envDegeriOku(".env.test", "TEST_DATABASE_URL");

  if (!testUrl) {
    throw new Error(
      ".env.test içinde TEST_DATABASE_URL bulunamadı. Entegrasyon testleri çalıştırılamaz."
    );
  }

  const testKimlik = baglantiKimligi(testUrl);

  for (const anahtar of ["DATABASE_URL", "DIRECT_URL"]) {
    const prodUrl = envDegeriOku(".env", anahtar);

    if (prodUrl && baglantiKimligi(prodUrl) === testKimlik) {
      throw new Error(
        `GÜVENLİK DURDURMASI: TEST_DATABASE_URL, .env içindeki ${anahtar} ile aynı veritabanını gösteriyor. Testler çalıştırılmadı.`
      );
    }
  }

  return testUrl;
}

export async function testVeritabaniIstemcisi(): Promise<Client> {
  const istemci = new Client({ connectionString: testVeritabaniAdresi() });

  await istemci.connect();

  return istemci;
}

/** Testler arasında tüm verileri siler. Yalnızca test veritabanında çalışır. */
export async function veritabaniniTemizle(istemci: Client): Promise<void> {
  await istemci.query(
    'TRUNCATE "FinderMessage","ItemRecord","PasswordResetToken","EmailVerificationToken","RateLimitEntry","User" RESTART IDENTITY CASCADE'
  );
}

export type TestSunucusu = {
  taban: string;
  kapat: () => Promise<void>;
};

/**
 * Uygulamayı test veritabanına bağlı olarak başlatır.
 *
 * E-posta sağlayıcısı bilerek tanımsız bırakılır: testler sırasında
 * hiç kimseye gerçek e-posta gönderilmez.
 */
export async function testSunucusuBaslat(): Promise<TestSunucusu> {
  const veritabani = testVeritabaniAdresi();

  const surec: ChildProcess = spawn(
    "npx",
    ["next", "start", "-p", String(TEST_PORT)],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: veritabani,
        DIRECT_URL: veritabani,
        USER_SESSION_SECRET: "test-kullanici-anahtari-" + "u".repeat(32),
        ADMIN_SESSION_SECRET: "test-admin-anahtari-" + "a".repeat(32),
        ADMIN_EMAIL: "admin@test.invalid",
        // "TestAdminSifresi123" değerinin bcrypt hash'i, base64 kodlu
        // (yalnızca test amaçlı). Ham hash kullanılamaz: "$" içerdiği için
        // Next.js env yükleyicisi değeri bozar.
        ADMIN_PASSWORD_HASH_B64: Buffer.from(
          "$2b$10$M.B268i.ITJ5.oLJoy3LvOupTTPBdtm7jOCKszCD6mCHzMP7ezCB2",
          "utf8"
        ).toString("base64"),
        NEXT_PUBLIC_APP_URL: `http://localhost:${TEST_PORT}`,
        // Gerçek e-posta gönderimini kesin olarak kapatır.
        // Boş string yeterli değildir: Next.js .env dosyalarını yükleyip
        // boş değerlerin üzerine gerçek kimlik bilgilerini yazar.
        EPOSTA_GONDERIMI_KAPALI: "1",
      },
      stdio: "pipe",
    }
  );

  // Hata ayıklama için: TEST_SUNUCU_LOG=1 npm run test:integration
  if (process.env.TEST_SUNUCU_LOG === "1") {
    surec.stdout?.on("data", (d) => process.stderr.write(`[sunucu] ${d}`));
    surec.stderr?.on("data", (d) => process.stderr.write(`[sunucu] ${d}`));
  }

  const taban = `http://localhost:${TEST_PORT}`;

  const kapat = () =>
    new Promise<void>((resolve) => {
      if (surec.exitCode !== null) {
        resolve();
        return;
      }

      surec.once("exit", () => resolve());
      surec.kill("SIGTERM");

      setTimeout(() => {
        surec.kill("SIGKILL");
        resolve();
      }, 5000);
    });

  // Sunucunun yanıt vermesini bekle.
  for (let deneme = 0; deneme < 60; deneme += 1) {
    try {
      const yanit = await fetch(taban, { signal: AbortSignal.timeout(2000) });

      if (yanit.ok) {
        return { taban, kapat };
      }
    } catch {
      // Sunucu henüz hazır değil.
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  await kapat();

  throw new Error("Test sunucusu 60 saniye içinde başlatılamadı.");
}

/** Yanıttaki oturum çerezini okur. */
export function oturumCerezi(yanit: Response, ad: string): string | null {
  const cerezler = yanit.headers.getSetCookie();

  return (
    cerezler
      .map((c) => c.split(";")[0])
      .find((c) => c.startsWith(`${ad}=`)) ?? null
  );
}

/** Her isteğin farklı IP'den geldiğini varsaymak için; hız sınırı testleri hariç. */
export function rastgeleIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 250)}`;
}
