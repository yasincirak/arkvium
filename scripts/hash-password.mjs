/**
 * ARKVIUM admin şifresi için bcrypt hash üretir ve .env dosyasına yazar.
 *
 * Kullanım:  npm run hash-password
 *
 * Şifre ekrana yazılmaz, komut geçmişine girmez ve üretilen hash terminale
 * basılmaz; doğrudan .env dosyasına yazılır.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import bcrypt from "bcryptjs";

const ENV_PATH = ".env";
const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;

function sorHidden(soru) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // Girilen karakterlerin ekranda görünmesini engelle.
    const output = rl.output;
    let gizle = false;

    output.write(soru);

    rl._writeToOutput = (mesaj) => {
      if (!gizle) {
        output.write(mesaj);
        return;
      }

      if (mesaj.includes("\n") || mesaj.includes("\r")) {
        output.write("\n");
      }
    };

    gizle = true;

    rl.question("", (cevap) => {
      rl.close();
      resolve(cevap);
    });
  });
}

function envDegeriniYaz(anahtar, deger) {
  let icerik = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";

  if (icerik && !icerik.endsWith("\n")) {
    icerik += "\n";
  }

  const satir = `${anahtar}='${deger}'`;
  const desen = new RegExp(`^\\s*${anahtar}\\s*=.*$`, "m");

  if (desen.test(icerik)) {
    icerik = icerik.replace(desen, satir);
  } else {
    icerik += `${satir}\n`;
  }

  writeFileSync(ENV_PATH, icerik, { mode: 0o600 });
}

async function main() {
  console.log("ARKVIUM admin şifresi belirleme\n");
  console.log(
    `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır. Girdiğiniz karakterler ekranda görünmez.\n`
  );

  const sifre = await sorHidden("Yeni admin şifresi: ");

  if (sifre.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `\nHata: Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır. İşlem yapılmadı.`
    );
    process.exit(1);
  }

  const tekrar = await sorHidden("Şifreyi tekrar girin: ");

  if (sifre !== tekrar) {
    console.error("\nHata: Şifreler eşleşmiyor. İşlem yapılmadı.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(sifre, BCRYPT_COST);

  envDegeriniYaz("ADMIN_PASSWORD_HASH", hash);

  console.log("\n✓ ADMIN_PASSWORD_HASH değeri .env dosyasına yazıldı.");
  console.log("  Hash güvenlik nedeniyle ekrana basılmadı.");
  console.log(
    "\nCanlı ortam için: .env dosyasındaki ADMIN_PASSWORD_HASH satırının"
  );
  console.log(
    "  değerini kopyalayıp Vercel > Settings > Environment Variables altına ekleyin."
  );
  console.log("\nADMIN_EMAIL değerinin de .env içinde tanımlı olduğundan emin olun.");
}

main().catch((hata) => {
  console.error("\nBeklenmeyen hata:", hata.message);
  process.exit(1);
});
