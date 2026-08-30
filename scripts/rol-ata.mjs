/**
 * Bir kullanıcı hesabının yetki rolünü değiştirir.
 *
 * Kullanım:
 *   ROL_ATA_EPOSTA=ornek@site.com npm run rol-ata            # ADMIN yapar
 *   ROL_ATA_EPOSTA=ornek@site.com ROL_ATA_ROL=CUSTOMER npm run rol-ata
 *
 * TASARIM KARARLARI
 * - Hedef e-posta hiçbir kaynak dosyada sabit yazılı DEĞİLDİR; yalnızca
 *   ortam değişkeninden okunur.
 * - Şifreye, oturumlara ve diğer alanlara dokunulmaz. Sadece `role` yazılır.
 * - Hesap oluşturulmaz veya silinmez; kullanıcı yoksa komut hata verip durur.
 * - Onay istenir: yanlış veritabanına karşı çalıştırmayı zorlaştırır.
 * - E-posta ekrana maskelenerek yazılır.
 * - Prisma Client yerine doğrudan parametreli SQL kullanılır: üretilen
 *   istemci TypeScript kaynağı olduğu için düz bir Node betiğinden
 *   yüklenemiyor. Sorgular parametrelidir, birleştirme yapılmaz.
 */

import { createInterface } from "node:readline";
import "dotenv/config";
import pg from "pg";

const GECERLI_ROLLER = ["CUSTOMER", "ADMIN"];

function maskele(eposta) {
  const [ad, alan] = String(eposta).split("@");

  if (!alan) {
    return "***";
  }

  const gorunen = ad.slice(0, 2);

  return `${gorunen}${"*".repeat(Math.max(1, ad.length - 2))}@${alan}`;
}

function sor(soru) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    rl.question(soru, (cevap) => {
      rl.close();
      resolve(cevap.trim());
    });
  });
}

function veritabaniOzeti(url) {
  try {
    const u = new URL(url);

    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(çözümlenemedi)";
  }
}

async function main() {
  const eposta = process.env.ROL_ATA_EPOSTA?.trim().toLowerCase();
  const rol = (process.env.ROL_ATA_ROL?.trim() || "ADMIN").toUpperCase();

  if (!eposta) {
    console.error(
      "HATA: ROL_ATA_EPOSTA tanımlı değil.\n" +
        "Kullanım: ROL_ATA_EPOSTA=ornek@site.com npm run rol-ata"
    );
    process.exit(1);
  }

  if (!GECERLI_ROLLER.includes(rol)) {
    console.error(
      `HATA: ROL_ATA_ROL geçersiz ("${rol}"). Geçerli değerler: ${GECERLI_ROLLER.join(", ")}`
    );
    process.exit(1);
  }

  const baglantiAdresi = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!baglantiAdresi) {
    console.error("HATA: DIRECT_URL veya DATABASE_URL tanımlı değil.");
    process.exit(1);
  }

  const istemci = new pg.Client({ connectionString: baglantiAdresi });

  await istemci.connect();

  try {
    const { rows } = await istemci.query(
      'SELECT id, role FROM "User" WHERE email = $1',
      [eposta]
    );

    const kullanici = rows[0];

    if (!kullanici) {
      console.error(
        `HATA: ${maskele(eposta)} adresiyle kayıtlı kullanıcı bulunamadı.\n` +
          "Hesap oluşturulmadı. Önce bu adresle normal kayıt olun."
      );
      process.exit(1);
    }

    if (kullanici.role === rol) {
      console.log(`Değişiklik gerekmiyor: ${maskele(eposta)} zaten ${rol}.`);
      return;
    }

    console.log("");
    console.log("  Veritabanı :", veritabaniOzeti(baglantiAdresi));
    console.log("  Hesap      :", maskele(eposta));
    console.log("  Mevcut rol :", kullanici.role);
    console.log("  Yeni rol   :", rol);
    console.log("");

    const onay = await sor('Devam etmek için "EVET" yazın: ');

    if (onay !== "EVET") {
      console.log("İptal edildi. Hiçbir değişiklik yapılmadı.");
      return;
    }

    await istemci.query('UPDATE "User" SET role = $1::"UserRole" WHERE id = $2', [
      rol,
      kullanici.id,
    ]);

    console.log(`Tamam: ${maskele(eposta)} artık ${rol}.`);
    console.log(
      "Rol her istekte veritabanından okunduğu için yeniden giriş gerekmez."
    );
  } finally {
    await istemci.end();
  }
}

main().catch((hata) => {
  console.error("Rol atanamadı:", hata instanceof Error ? hata.message : hata);
  process.exit(1);
});
