/**
 * Yönetici şifre hash'ini ortam değişkeninden okur.
 *
 * NEDEN BASE64?
 * bcrypt hash'leri `$2b$12$...` biçimindedir. Next.js env yükleyicisi
 * (dotenv + dotenv-expand) `.env` dosyalarındaki değerlerde `$isim`
 * kalıplarını değişken referansı sayıp genişletir. Bu yüzden ham bir bcrypt
 * hash'i `.env` içine yazıldığında `$2b`, `$12` gibi parçalar silinir ve
 * 60 karakterlik hash bozularak yüklenir — sonuç: doğru şifreyle bile
 * "E-posta veya şifre hatalı." hatası.
 *
 * Ters bölü ile kaçış (`\$`) tek bir .env dosyasında işe yarar, ancak
 * projede .env ve .env.local birlikte yüklendiğinde genişletme birden fazla
 * kez çalıştığı için güvenilir değildir.
 *
 * Bu yüzden hash base64 olarak saklanır: base64 alfabesinde `$` bulunmaz,
 * dolayısıyla hiçbir katmanda bozulamaz. Aynı sorun Vercel ortam
 * değişkenlerinde de yaşanmaz.
 */

const BASE64_DESENI = /^[A-Za-z0-9+/]+={0,2}$/;
const BCRYPT_DESENI = /^\$2[aby]\$\d{2}\$.{53}$/;

export function yoneticiSifreHashi(): string | null {
  const base64Deger = process.env.ADMIN_PASSWORD_HASH_B64?.trim();

  if (base64Deger) {
    if (!BASE64_DESENI.test(base64Deger)) {
      console.error(
        "ADMIN_PASSWORD_HASH_B64 geçerli bir base64 değeri değil."
      );

      return null;
    }

    const cozulmus = Buffer.from(base64Deger, "base64").toString("utf8");

    if (!BCRYPT_DESENI.test(cozulmus)) {
      console.error(
        "ADMIN_PASSWORD_HASH_B64 çözüldüğünde geçerli bir bcrypt hash'i vermiyor. Değeri 'npm run hash-password' ile yeniden üretin."
      );

      return null;
    }

    return cozulmus;
  }

  // Geriye dönük uyumluluk: eski kurulumlarda ham hash kullanılıyor olabilir.
  const hamDeger = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!hamDeger) {
    return null;
  }

  if (!BCRYPT_DESENI.test(hamDeger)) {
    console.error(
      `ADMIN_PASSWORD_HASH bozuk görünüyor (uzunluk: ${hamDeger.length}, beklenen: 60). ` +
        "Muhtemelen .env yüklenirken '$' karakterleri genişletildi. " +
        "Düzeltmek için 'npm run hash-password' komutunu çalıştırın; " +
        "değer ADMIN_PASSWORD_HASH_B64 olarak base64 biçiminde yazılacaktır."
    );

    return null;
  }

  return hamDeger;
}
