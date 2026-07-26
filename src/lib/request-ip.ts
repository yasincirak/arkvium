/**
 * İstemci IP adresini proxy başlıklarından okur.
 * Vercel `x-forwarded-for` başlığını güvenilir biçimde ayarlar.
 *
 * Veritabanı bağımlılığı olmadan test edilebilmesi için ayrı dosyadadır.
 */
export function istemciIpAdresi(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const ilk = forwarded.split(",")[0]?.trim();

    if (ilk) {
      return ilk;
    }
  }

  return headers.get("x-real-ip")?.trim() || "bilinmeyen";
}
