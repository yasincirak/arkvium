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
import { testAdresiniDenetle } from "./veritabani-kilidi.mjs";

function envDegeriOku(dosya, anahtar) {
  if (!existsSync(dosya)) {
    return null;
  }

  const eslesme = readFileSync(dosya, "utf8").match(
    new RegExp(`^\\s*${anahtar}\\s*=\\s*["']?(.*?)["']?\\s*$`, "m")
  );

  return eslesme?.[1] || null;
}

const testUrl = envDegeriOku(".env.test", "TEST_DATABASE_URL");

if (!testUrl) {
  console.error(
    "Hata: .env.test içinde TEST_DATABASE_URL bulunamadı. İşlem yapılmadı."
  );
  process.exit(1);
}

/*
  Kilit kuralı `scripts/veritabani-kilidi.mjs` içinde TEK YERDE tanımlıdır
  ve birim testleriyle korunur. Bağlantı kimliğinin yanı sıra Supabase
  PROJE REFERANSINI de karşılaştırır: aynı projeye farklı porttan
  (transaction/session pooler) veya farklı hosttan (pooler/doğrudan)
  bağlanmak artık "farklı veritabanı" sayılmaz.
*/
const karar = testAdresiniDenetle(testUrl, {
  DATABASE_URL: envDegeriOku(".env", "DATABASE_URL"),
  DIRECT_URL: envDegeriOku(".env", "DIRECT_URL"),
});

if (!karar.guvenli) {
  console.error(`GÜVENLİK DURDURMASI: ${karar.sebep}`);
  console.error("Hiçbir migration uygulanmadı.");
  process.exit(1);
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
