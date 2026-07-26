# ARKVIUM

**Dijital Sahiplik Platformu**

ARKVIUM, eşyalara QR kodlu dijital kimlik kazandıran bir platformdur. Bir eşya kaybolduğunda, onu bulan kişi QR kodu okutarak sahibine ulaşabilir; sahibin telefon ve e-posta bilgileri doğrudan gösterilmez.

> **Not:** Depo ve klasör adı hâlâ eski isimle (`izoris`) görünmektedir. Ürün ve marka adı yalnızca **ARKVIUM**'dur.

---

## İçindekiler

- [Kullanılan teknolojiler](#kullanılan-teknolojiler)
- [Kurulum](#kurulum)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Komutlar](#komutlar)
- [Veritabanı ve migration](#veritabanı-ve-migration)
- [Test](#test)
- [Production dağıtımı (Vercel)](#production-dağıtımı-vercel)
- [Production kontrol listesi](#production-kontrol-listesi)
- [Güvenlik notları](#güvenlik-notları)
- [Gizlilik ve KVKK notları](#gizlilik-ve-kvkk-notları)
- [Bilinen eksikler](#bilinen-eksikler)

---

## Kullanılan teknolojiler

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 14 (App Router) |
| Dil | TypeScript (strict) |
| Arayüz | React 18, Tailwind CSS 3 |
| Veritabanı | PostgreSQL (Supabase) |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Oturum | JWT (`jose`) + httpOnly çerez |
| Şifreleme | bcryptjs (cost 12) |
| E-posta | Nodemailer (Gmail SMTP) |
| QR kod | `qrcode.react` |
| Test | Node.js yerleşik test çalıştırıcısı (`node:test`) |
| Dağıtım | Vercel |

---

## Kurulum

**Gereksinim:** Node.js 20 veya üzeri (geliştirme Node 24 ile yapıldı). Paket yöneticisi: **npm** (`package-lock.json`).

```bash
npm install
```

`npm install` sonrasında `postinstall` kancası `prisma generate` komutunu otomatik çalıştırır.

Ortam değişkenlerini hazırlayın:

```bash
cp .env.example .env
```

`.env` dosyasını doldurduktan sonra:

```bash
npm run dev
```

Uygulama <http://localhost:3000> adresinde açılır.

---

## Ortam değişkenleri

Tüm değişkenlerin adı ve açıklaması [`.env.example`](.env.example) dosyasındadır. Özet:

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | ✅ | Uygulamanın kullandığı PostgreSQL bağlantısı (Supabase pooler) |
| `DIRECT_URL` | ✅ | Prisma migration'larının kullandığı doğrudan bağlantı |
| `USER_SESSION_SECRET` | ✅ | Kullanıcı oturum JWT imza anahtarı (**en az 32 karakter**) |
| `ADMIN_SESSION_SECRET` | ✅ | Admin oturum JWT imza anahtarı (**en az 32 karakter**, kullanıcınınkinden farklı) |
| `ADMIN_EMAIL` | ✅ | Yönetim paneline giriş yapacak e-posta |
| `ADMIN_PASSWORD_HASH_B64` | ✅ | Yönetici şifresinin bcrypt hash'i, **base64 kodlu** (`npm run hash-password`) |
| `GMAIL_USER` | ✅ | Bildirim e-postalarının gönderileceği Gmail hesabı |
| `GMAIL_APP_PASSWORD` | ✅ | Gmail **uygulama şifresi** (normal hesap şifresi değil) |
| `NEXT_PUBLIC_APP_URL` | ✅ | QR kodlarının işaret ettiği genel adres (sonunda `/` olmadan) |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | ➖ | Destek WhatsApp numarası. Boşsa buton gösterilmez |

### Oturum anahtarı üretme

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`USER_SESSION_SECRET` ve `ADMIN_SESSION_SECRET` için **ayrı ayrı** üretin.

> Anahtarlar eksik veya 32 karakterden kısaysa uygulama bilerek hata verir. Kaynak koda gömülü yedek değer **yoktur** — böyle bir yedek, kodu gören herkesin geçerli oturum tokenı üretmesine izin verirdi.

### Yönetici şifresi belirleme

```bash
npm run hash-password
```

Şifre ekranda görünmez, komut geçmişine girmez ve üretilen hash terminale basılmaz; doğrudan `.env` dosyasına yazılır. Canlı ortam için `.env` içindeki `ADMIN_PASSWORD_HASH_B64` satırının değerini Vercel ortam değişkenlerine kopyalayın.

> ### ⚠️ `.env` içinde `$` içeren değerler bozulur
>
> Next.js env yükleyicisi (`dotenv` + `dotenv-expand`) `.env` dosyalarındaki değerlerde `$isim` kalıplarını **değişken referansı sayıp genişletir**. bcrypt hash'leri `$2b$12$...` biçiminde olduğu için ham hâlde yazıldıklarında sessizce bozulur: 60 karakterlik hash kısalır, doğru şifre girilse bile giriş `401` döner ve hiçbir hata mesajı görünmez.
>
> Ters bölü ile kaçış (`\$`) tek bir `.env` dosyasında işe yarar; ancak `.env` ve `.env.local` birlikte yüklendiğinde genişletme birden fazla kez çalıştığı için güvenilir değildir.
>
> Bu yüzden yönetici hash'i **base64** olarak saklanır (`ADMIN_PASSWORD_HASH_B64`). base64 alfabesinde `$` bulunmaz.
>
> Aynı tuzak `$` içeren her değer için geçerlidir — parola içeren veritabanı bağlantı dizeleri dahil. `src/lib/admin-credentials.ts`, bozuk bir hash algıladığında sunucu logunda açık bir uyarı yazar.

---

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm start` | Production sunucusu (build sonrası) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript kontrolü (`tsc --noEmit`) |
| `npm test` | Birim testleri |
| `npm run test:integration` | Uçtan uca testler (test veritabanı gerekir) |
| `npm run test:all` | Tüm testler |
| `npm run test:db:migrate` | Migration'ları yalnızca test veritabanına uygular |
| `npm run hash-password` | Yönetici şifresi hash'i üretir ve `.env`'e yazar |
| `npx prisma generate` | Prisma client üretimi |
| `npx prisma migrate status` | Migration durumu |

---

## Veritabanı ve migration

Prisma yapılandırması [`prisma.config.ts`](prisma.config.ts) dosyasındadır ve migration'lar için `DIRECT_URL` kullanır.

### Durum kontrolü

```bash
npx prisma migrate status
```

### Geliştirme ortamında yeni migration

```bash
npx prisma migrate dev --name aciklayici_ad
```

### Production'a migration uygulama

Production'da **asla** `migrate dev` veya `db push` kullanmayın — veri kaybına yol açabilir.

```bash
npx prisma migrate deploy
```

Uygulamadan önce:

1. Supabase üzerinden veritabanı yedeği alın.
2. Üretilen SQL dosyasını `prisma/migrations/` altında gözden geçirin.
3. `DROP COLUMN` / `DROP TABLE` içeren adımları ayrıca doğrulayın.
4. Önce bir kopya (staging) veritabanında deneyin.

### Mevcut modeller

`User`, `ItemRecord`, `FinderMessage`, `RateLimitEntry`, `PasswordResetToken`, `EmailVerificationToken`

---

## Test

Node.js'in yerleşik test çalıştırıcısı kullanılır — ek test bağımlılığı yoktur.

| Komut | Kapsam |
|---|---|
| `npm test` | Birim testleri (`tests/unit/`) — veritabanı gerektirmez |
| `npm run test:integration` | Uçtan uca testler (`tests/integration/`) — test veritabanı gerektirir |
| `npm run test:all` | Hepsi |

### Test veritabanı kurulumu

Entegrasyon testleri **ayrı bir veritabanı** gerektirir. Production veritabanı kullanılmaz.

1. Supabase'de ikinci bir proje oluşturun (örn. `arkvium-test`).
2. Bağlantı dizesini `.env.test` dosyasına yazın:
   ```
   TEST_DATABASE_URL=postgresql://...
   ```
3. Şemayı test veritabanına uygulayın:
   ```bash
   npm run test:db:migrate
   ```

> **Güvenlik kilidi:** Hem `npm run test:db:migrate` hem de test altyapısı, `TEST_DATABASE_URL` değerini `.env` içindeki `DATABASE_URL` ve `DIRECT_URL` ile karşılaştırır. Aynı veritabanını gösteriyorlarsa **hiçbir işlem yapılmadan durur**. Böylece yanlışlıkla production verisi silinemez.

**Testler sırasında:**
- Uygulama yalnızca `TEST_DATABASE_URL` ile başlatılır.
- Her testten önce tüm tablolar `TRUNCATE` edilir.
- E-posta gönderimi `EPOSTA_GONDERIMI_KAPALI=1` ile kesin olarak kapatılır; hiç kimseye gerçek e-posta gitmez.
- Gerçek kullanıcı verisi, gerçek e-posta adresi veya production gizli değerleri kullanılmaz.

Sunucu çıktısını görmek için: `TEST_SUNUCU_LOG=1 npm run test:integration`

**Kapsam:** kayıt, giriş, çıkış, oturum çerezi ayarları, kullanıcı numaralandırma koruması, kullanıcı–admin oturum ayrımı, yönetici girişi, sahiplik kontrolü (IDOR), şifre sıfırlama, şifre değiştirme ve oturum iptali, e-posta doğrulama, hız sınırlama, genel eşya sayfası gizliliği, `robots.txt`.

---

## Production dağıtımı (Vercel)

1. **Ortam değişkenleri:** Vercel → Project → Settings → Environment Variables altına yukarıdaki tablodaki tüm zorunlu değişkenleri ekleyin (Production ve Preview için ayrı ayrı).
   - `NEXT_PUBLIC_APP_URL` canlı alan adınız olmalıdır (`https://...`, sonunda `/` yok). Yanlışsa üretilen QR kodları yanlış adrese gider.
2. **Build ayarları:** Varsayılanlar yeterlidir. `postinstall` kancası `prisma generate` çalıştırır.
   - Build komutu: `next build`
3. **Migration:** Deploy öncesi yerelden çalıştırın:
   ```bash
   npx prisma migrate deploy
   ```
4. **Alan adı:** Vercel → Settings → Domains üzerinden alan adını ekleyin ve DNS kayıtlarını doğrulayın.
5. **HTTPS:** Vercel sertifikayı otomatik sağlar. `NODE_ENV=production` olduğunda oturum çerezleri `secure` bayrağıyla yazılır — bu yüzden canlı ortam HTTPS olmak **zorundadır**.
6. **E-posta:** Gmail hesabında 2 adımlı doğrulama açık olmalı ve bir **uygulama şifresi** üretilmelidir. Gönderim hacmi artarsa özel alan adı doğrulaması yapılan bir e-posta servisine geçilmelidir.

---

## Production kontrol listesi

Canlıya almadan önce:

- [ ] `npm install` sorunsuz tamamlanıyor
- [ ] `npx prisma generate` başarılı
- [ ] `npx prisma migrate status` "up to date" diyor
- [ ] `npm run typecheck` hatasız
- [ ] `npm run lint` hatasız
- [ ] `npm test` tüm testler geçiyor
- [ ] `npm run build` başarılı ve çıktıda **`ƒ Middleware`** satırı görünüyor
- [ ] `.env` ve `.env.local` git'e eklenmemiş (`git check-ignore .env`)
- [ ] `USER_SESSION_SECRET` ≠ `ADMIN_SESSION_SECRET`, ikisi de en az 32 karakter
- [ ] `ADMIN_PASSWORD_HASH` tanımlı ve `/admin/login` çalışıyor
- [ ] Oturumsuz `/admin` isteği `/admin/login` adresine yönleniyor
- [ ] Oturumsuz `/account` isteği `/login` adresine yönleniyor
- [ ] `NEXT_PUBLIC_APP_URL` canlı alan adı ile birebir aynı
- [ ] Üretilen bir QR kod telefonla taranıp doğru sayfayı açıyor
- [ ] `/robots.txt` `/admin`, `/account`, `/item`, `/api` yollarını engelliyor

> **`ƒ Middleware` satırı build çıktısında görünmüyorsa admin paneli korumasızdır.** Bu satırın varlığı her deploy öncesi kontrol edilmelidir.

---

## Güvenlik notları

**Uygulanan kontroller**

- Oturum çerezleri `httpOnly`, `sameSite=lax`, production'da `secure`.
- Kullanıcı ve admin oturumları ayrı çerez, ayrı imza anahtarı ve JWT içindeki `type` claim'i ile kesin biçimde ayrılmıştır. Kullanıcı token'ı admin olarak doğrulanamaz.
- Şifreler bcrypt (cost 12) ile saklanır; düz şifre hiçbir yerde tutulmaz.
- Giriş hataları kullanıcı numaralandırmasını engellemek için ortak mesaj döner ("E-posta veya şifre hatalı.").
- **Server Action'lar kendi içlerinde yetki kontrolü yapar.** Server Action'lar sayfa korumasından bağımsız, herkese açık HTTP uçlarıdır; sahiplik kontrolünü yalnızca sayfa katmanında yapmak yeterli değildir.
- Middleware `/admin/*` ve `/account/*` yollarını korur.
- Kişiye özel sayfalar `robots.txt` ve sayfa bazlı `noindex` ile arama motorlarına kapalıdır.
- Kullanıcı bulunamadığında da bcrypt karşılaştırması yapılır; yanıt süresinden hangi e-postaların kayıtlı olduğu anlaşılamaz.

### Şifre sıfırlama ve e-posta doğrulama

- Tokenlar `crypto.randomBytes(32)` ile üretilir (256 bit entropi).
- Veritabanında **düz metin token saklanmaz**, yalnızca SHA-256 özeti tutulur. Veritabanı sızsa bile özetten geçerli bir bağlantı üretilemez.
- Tokenlar **tek kullanımlıktır** (`usedAt`) ve **sürelidir**: şifre sıfırlama 1 saat, e-posta doğrulama 24 saat.
- Yeni token üretildiğinde aynı kullanıcının önceki kullanılmamış tokenları geçersiz kılınır.
- E-posta gönderilemezse token hemen geçersiz kılınır ve kullanıcıya hata bildirilir — sahte başarı üretilmez.
- `POST /api/password/forgot`, e-posta kayıtlı olsun olmasın **aynı yanıtı** döner; bu uç kullanıcı numaralandırması için kullanılamaz.
- Şifre sıfırlandığında `User.sessionVersion` artırılır; eski sürümü taşıyan tüm oturum tokenları — imzaları geçerli olsa bile — reddedilir. Böylece başka cihazlarda açık kalmış oturumlar kapanır.
- Şifre değişimi, token kullanımı ve oturum iptali tek veritabanı işleminde (`$transaction`) yapılır.

**Şifre değiştirme:** Giriş yapmış kullanıcı mevcut şifresini girerek yeni şifre belirler (`POST /api/password/change`). Diğer cihazlardaki oturumlar kapanır, işlemi yapan cihaza güncel sürümü taşıyan yeni bir oturum çerezi verilir. Bekleyen şifre sıfırlama bağlantıları da geçersiz kılınır.

**Tüm cihazlardan çıkış:** `POST /api/session/logout-all` — hesap sayfasındaki düğmeden çağrılır. İşlemi yapan cihaz dâhil tüm oturumları kapatır.

### Oturum iptali: `sessionVersion`

Her kullanıcının bir `sessionVersion` sayacı vardır. Oturum tokenı üretildiği andaki sürümü içinde taşır; doğrulamada veritabanındaki güncel değerle **tam eşitlik** aranır. Sürüm artırıldığı anda eski tokenların hepsi geçersiz olur.

Sürüm şu işlemlerde artırılır: şifre değiştirme, şifre sıfırlama, tüm oturumları kapatma.

> **Neden sayaç, neden zaman damgası değil?** Önce `sessionsValidFrom` zaman damgası kullanılmıştı. JWT `iat` alanı **saniye** çözünürlüğündedir ve aşağı yuvarlanır; bu yüzden zamana dayalı karşılaştırma iki kötü seçenekten birine zorluyordu: ya damga milisaniye hassasiyetinde tutulur ve kullanıcı **kendi şifre değişikliğinde oturumdan atılırdı**, ya da saniyeye yuvarlanır ve şifre değişimiyle **aynı saniye içinde üretilmiş tokenlar geçerli kalırdı** (bir saniyelik açık). Tam sayı karşılaştırması bu ikilemi tamamen ortadan kaldırır.

`sessionVersion` alanı taşımayan tokenlar (mekanizma eklenmeden önce üretilenler) bilerek reddedilir.

**Kontrol nerede yapılır:** İmza kontrolü middleware'de (edge runtime) yapılır, hızlıdır ama veritabanına erişemez. Sürüm kontrolü veritabanına erişebilen sunucu tarafında (`getUserSession`) yapılır. Middleware tek başına iptal edilmiş bir oturumu tespit edemez; korumalı sayfalar ve Server Action'lar `getUserSession` kullandığı için gerçek kontrol orada gerçekleşir.

### Hız sınırlama (rate limiting)

Sayaçlar **veritabanında** (`RateLimitEntry` tablosu) tutulur. Bellek içi sayaç kullanılmaz: Vercel birden fazla sunucu örneği çalıştırır ve her örnek kendi sayacını tutarsa sınır pratikte örnek sayısı kadar büyür.

| Uç | Kapsam | Limit |
|---|---|---|
| `POST /api/login` | IP | 10 / 15 dk |
| `POST /api/login` | E-posta | 5 / 15 dk |
| `POST /api/admin/login` | IP | 5 / 15 dk |
| `POST /api/register` | IP | 5 / saat |
| `POST /api/password/forgot` | IP | 5 / saat |
| `POST /api/password/forgot` | E-posta | 3 / saat |
| `POST /api/password/reset` | IP | 10 / saat |
| `POST /api/password/change` | Kullanıcı | 5 / 15 dk |
| `POST /api/session/logout-all` | Kullanıcı | 10 / saat |
| `POST /api/email/verify` | IP | 20 / saat |
| `POST /api/email/verify/resend` | Kullanıcı | 3 / saat |
| Buluntu bildirimi (Server Action) | IP | 5 / saat |

Sınır aşıldığında `429` ve `Retry-After` başlığı döner. Başarılı girişten sonra ilgili sayaçlar sıfırlanır.

**Gizlilik:** `RateLimitEntry.key` alanı ham IP veya e-posta **içermez**; değerin HMAC-SHA256 özeti saklanır. Süresi dolan satırlar kendiliğinden temizlenir.

**Production notu:** Bu yaklaşım her kontrolde bir veritabanı sorgusu yapar. Trafik arttığında Upstash Redis gibi bir sayaç servisine geçmek daha uygun olur; `src/lib/rate-limit.ts` içindeki `hizSiniriKontrol` fonksiyonu bu geçiş için tek değişim noktasıdır.

**Middleware konumu (kritik)**

Proje `src/` dizini kullandığı için middleware dosyası **`src/middleware.ts`** yolunda olmak zorundadır. Proje kökündeki `middleware.ts` Next.js tarafından **sessizce yok sayılır** ve korumalı sayfalar herkese açık kalır. Doğrulama:

```bash
npx next build 2>&1 | grep Middleware
```

**Gizli değerler**

- `.env` ve `.env.local` `.gitignore` içindedir ve git geçmişinde bulunmamaktadır.
- Gizli değerler kaynak koda, loglara veya hata mesajlarına yazılmaz.
- Anahtarlar sızdığından şüphelenilirse `.env` içindeki oturum anahtarlarını değiştirin — bu tüm aktif oturumları sonlandırır.

---

## Gizlilik ve KVKK notları

- Eşyanın genel erişim sayfasında sahibin telefonu, e-postası ve adresi **gösterilmez**.
- Bulan kişinin bıraktığı iletişim bilgileri yalnızca eşya sahibine bildirilir.
- Veri minimizasyonu esastır: bir alan gerçekten gerekli değilse toplanmamalıdır.
- ARKVIUM bir takip sistemi değildir; sürekli veya gizli konum izleme yapmaz.
- ARKVIUM tıbbi teşhis, tıbbi tavsiye veya acil yardım hizmeti sunmaz ve 112'nin yerini almaz.

**Hukuk uzmanı incelemesi gereken alanlar (henüz hazırlanmadı):** Gizlilik Politikası, KVKK Aydınlatma Metni, Açık Rıza Metni, Kullanım Koşulları, Çerez Politikası, Mesafeli Satış Sözleşmesi, İade ve İptal Politikası, şirket unvanı/MERSİS/vergi/adres bilgileri, veri saklama süreleri, yetkili mahkeme.

---

## Bilinen eksikler

Bu bölüm kasıtlı olarak açıktır; aşağıdaki özellikler **henüz uygulanmamıştır**:

**Hesap ve güvenlik**
- E-posta adresi değiştirme
- Hesap silme
- Audit log
- Kayıt ekranında e-posta numaralandırma koruması (var olan e-postada "zaten kayıtlı" mesajı döner; IP başına saat başı 5 kayıt sınırı bunu kısmen dengeler)

**Etiket ve ürün**
- Ayrı `Tag` modeli, etiket aktivasyonu ve tahmin edilmesi zor public token
  (şu an genel erişim sayfası kaydın veritabanı ID'sini kullanır)
- Sahiplik transferi
- Etiketin başka ürüne taşınması
- Ürün görseli yükleme

**İletişim**
- Bulan kişi ile sahip arasında gizlilik korumalı mesajlaşma
- Konum paylaşımı ve açık konum izni akışı
- Sağlayıcıdan bağımsız bildirim servis katmanı (şu an doğrudan Gmail SMTP)
- WhatsApp / SMS adaptörleri

**Çocuk ve yaşlı güvenlik modülü**
- Bağlı kişi profilleri, yetkili yakın yönetimi, izin seviyeleri
- Hassas veri için açık rıza kaydı ve rıza geri çekme
- Yardım bildirimi akışı

**Diğer**
- E-ticaret (ürün kataloğu, sepet, sipariş, ödeme/kargo adaptörleri)
- Yasal sayfa şablonları
- Veritabanı gerektiren uçtan uca testler (ayrı bir test veritabanı gerekiyor)
- Erişilebilirlik denetimi (WCAG 2.2 AA)
