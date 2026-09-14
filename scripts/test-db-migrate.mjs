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
import {
  migrationIcinAdres,
  referansListesiCoz,
  testAdresiniDenetle,
} from "./veritabani-kilidi.mjs";

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
  ve birim testleriyle korunur.

  `.env` PRODUCTION VARSAYILMAZ: hedefin gerçekten test veritabanı olduğu
  `.env.test` içindeki AÇIK BEYANDAN doğrulanır
  (TEST_SUPABASE_PROJECT_REF / YASAK_SUPABASE_PROJECT_REFS).
*/
const karar = testAdresiniDenetle(
  testUrl,
  {
    DATABASE_URL: envDegeriOku(".env", "DATABASE_URL"),
    DIRECT_URL: envDegeriOku(".env", "DIRECT_URL"),
  },
  {
    izinliTestRef: envDegeriOku(".env.test", "TEST_SUPABASE_PROJECT_REF"),
    yasakRefler: referansListesiCoz(
      envDegeriOku(".env.test", "YASAK_SUPABASE_PROJECT_REFS")
    ),
  }
);

if (!karar.guvenli) {
  console.error(`GÜVENLİK DURDURMASI: ${karar.sebep}`);
  console.error("Hiçbir migration uygulanmadı.");
  process.exit(1);
}

/*
  Migration SESSION MODU ister (bkz. migrationIcinAdres). Transaction
  pooler'a (6543) bağlanıldığında Prisma sessizce asılı kalır. Aynı
  veritabanı, yalnızca farklı port.
*/
const migrationUrl = migrationIcinAdres(testUrl);

const hedef = new URL(migrationUrl);

console.log(`Test veritabanı portu: ${hedef.port || 5432}`);

if (migrationUrl !== testUrl) {
  console.log(
    "Not: migration için session pooler (5432) kullanılıyor; hedef veritabanı aynı."
  );
}

console.log("Migration'lar uygulanıyor...\n");

execFileSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: migrationUrl,
    DIRECT_URL: migrationUrl,
  },
});
