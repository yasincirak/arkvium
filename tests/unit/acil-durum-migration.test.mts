import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

/**
 * Acil durum migration'ının güvenlik özellikleri.
 *
 * Veritabanına bağlanılmaz; yalnızca üretilen SQL metni denetlenir.
 * Amaç: migration'ın ekleyici kalması ve sağlık verisinin düz metin
 * saklanacak bir sütuna dönüşmemesi.
 */

const KLASOR = "prisma/migrations";

const migrationYolu = join(
  KLASOR,
  readdirSync(KLASOR).find((ad) => ad.endsWith("_add_emergency_profile"))!,
  "migration.sql"
);

const sql = readFileSync(migrationYolu, "utf8");

describe("acil durum migration'ı", () => {
  test("yıkıcı ifade içermez", () => {
    for (const yasak of [
      /\bDROP\b/i,
      /\bTRUNCATE\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bALTER\s+COLUMN\b/i,
    ]) {
      assert.ok(!yasak.test(sql), `${yasak} ifadesi bulunmamalı`);
    }
  });

  test("mevcut tabloları değiştirmez, yalnızca yeni tablolara kısıt ekler", () => {
    const alterlar = sql.match(/ALTER TABLE "([A-Za-z]+)"/g) ?? [];

    for (const alter of alterlar) {
      assert.ok(
        alter.includes("EmergencyProfile") || alter.includes("EmergencyContact"),
        `mevcut tabloya dokunuluyor: ${alter}`
      );
    }

    assert.ok(!/ALTER TABLE "(User|ItemRecord|Tag|Order)"/.test(sql));
  });

  test("yalnızca acil durum tabloları oluşturulur", () => {
    const tablolar = sql.match(/CREATE TABLE "([A-Za-z]+)"/g) ?? [];

    assert.deepEqual(tablolar, [
      'CREATE TABLE "EmergencyProfile"',
      'CREATE TABLE "EmergencyContact"',
    ]);
  });

  test("kan grubu düz metin enum sütunu olarak saklanmaz", () => {
    // Kan grubu sağlık verisidir ve şifreli metin olarak yazılır.
    assert.ok(!/CREATE TYPE "KanGrubu"/.test(sql));
    assert.ok(!/"bloodType" "KanGrubu"/.test(sql));
    assert.ok(/"bloodType" TEXT/.test(sql));
  });

  test("rıza denetim izi sütunları mevcuttur", () => {
    for (const sutun of [
      "explicitConsentAt",
      "explicitConsentVersion",
      "consentWithdrawnAt",
    ]) {
      assert.ok(sql.includes(`"${sutun}"`), `${sutun} sütunu eksik`);
    }
  });

  test("profil varsayılan olarak kapalıdır", () => {
    assert.ok(/"enabled" BOOLEAN NOT NULL DEFAULT false/.test(sql));
  });

  test("tüm görünürlük sütunları varsayılan kapalıdır", () => {
    const gorunurlukler = sql.match(/"[a-zA-Z]+Gorunur" BOOLEAN NOT NULL DEFAULT (\w+)/g) ?? [];

    assert.equal(gorunurlukler.length, 7);

    for (const satir of gorunurlukler) {
      assert.ok(satir.endsWith("false"), `${satir} varsayılanı kapalı olmalı`);
    }
  });
});
