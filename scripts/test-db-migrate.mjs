/**
 * Migration'ları YALNIZCA test veritabanına uygular.
 *
 * Kullanım:  npm run test:db:migrate
 *
 * .env.test içindeki TEST_DATABASE_URL kullanılır. Bu adres .env içindeki
 * DATABASE_URL veya DIRECT_URL ile aynıysa işlem yapılmadan durdurulur.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function envDegeriOku(dosya, anahtar) {
  if (!existsSync(dosya)) {
    return null;
  }

  const eslesme = readFileSync(dosya, "utf8").match(
    new RegExp(`^\\s*${anahtar}\\s*=\\s*["']?(.*?)["']?\\s*$`, "m")
  );

  return eslesme?.[1] || null;
}

function baglantiKimligi(url) {
  const adres = new URL(url);

  return `${adres.hostname}:${adres.port || "5432"}${adres.pathname}@${adres.username}`;
}

const testUrl = envDegeriOku(".env.test", "TEST_DATABASE_URL");

if (!testUrl) {
  console.error(
    "Hata: .env.test içinde TEST_DATABASE_URL bulunamadı. İşlem yapılmadı."
  );
  process.exit(1);
}

const testKimlik = baglantiKimligi(testUrl);

for (const anahtar of ["DATABASE_URL", "DIRECT_URL"]) {
  const prodUrl = envDegeriOku(".env", anahtar);

  if (prodUrl && baglantiKimligi(prodUrl) === testKimlik) {
    console.error(
      `GÜVENLİK DURDURMASI: TEST_DATABASE_URL, .env içindeki ${anahtar} ile aynı veritabanını gösteriyor.`
    );
    console.error("Hiçbir migration uygulanmadı.");
    process.exit(1);
  }
}

const hedef = new URL(testUrl);

console.log(`Test veritabanı: ${hedef.hostname}:${hedef.port || 5432}`);
console.log("Migration'lar uygulanıyor...\n");

execFileSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
    DIRECT_URL: testUrl,
  },
});
