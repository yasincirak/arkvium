# ARKVIUM — Teknik Kararlar

Bu dosya "neden böyle yapıldı" sorusunun cevabını tutar. Kod ne yaptığını zaten anlatıyor;
burada yazanlar, ileride "bu gereksiz görünüyor, sadeleştireyim" denip **bozulmaması** gereken tercihlerdir.

Her madde: **Karar → Neden → Nerede**.

---

## 1. Kimlik ve oturum

### Oturum, imzalı çerez içinde taşınır (JWT), veritabanında oturum tablosu yoktur
**Neden:** Her istekte oturum tablosuna gitmek yerine imza doğrulaması yetiyor; Vercel'de çok örnek çalıştığı için
paylaşılan bir oturum deposu gerekmesin diye.
**Nerede:** `src/lib/auth.ts`

### Oturum iptali zaman damgasıyla değil, `sessionVersion` sayacıyla yapılır
**Neden:** JWT'nin `iat` alanı saniye çözünürlüğündedir. Zamana dayalı karşılaştırma ya kullanıcıyı kendi şifre
değiştirme işleminde oturumdan atar ya da bir saniyelik açık bırakır. Sayaç karşılaştırması zamanlamadan bağımsızdır.
**Nerede:** `prisma/schema.prisma` (`User.sessionVersion`), `src/lib/session.ts`

### İmza kontrolü middleware'de, veritabanı kontrolü sunucu tarafında
**Neden:** `middleware.ts` edge runtime'da çalışır; `next/headers` ve Prisma kullanamaz. Bu yüzden ucuz kontrol
(imza) edge'de, `sessionVersion` karşılaştırması sayfa/route tarafında yapılır.
**Nerede:** `src/middleware.ts` (`matcher: /admin/*, /account/*`), `src/lib/session.ts`

### Çerezler `httpOnly`, production'da `secure`, `sameSite: lax`
**Neden:** JavaScript'in tokena erişmesini engeller (XSS), `lax` normal gezinmede oturumu korurken siteler arası
POST isteklerinde çerezi göndermez.
**Nerede:** `src/lib/auth.ts`

### Yönetici şifre hash'i `.env`'de base64 olarak tutulur (`ADMIN_PASSWORD_HASH_B64`)
**Neden:** bcrypt hash'i `$2b$12$...` biçimindedir. Next.js'in env yükleyicisi `$isim` kalıplarını değişken sayıp
genişletir ve hash'i bozar; sonuç, doğru şifreyle bile "şifre hatalı" hatasıdır. `\$` ile kaçış, `.env` ve `.env.local`
birlikte yüklendiğinde güvenilir değil. Base64 alfabesinde `$` yoktur, hiçbir katmanda bozulmaz.
**Nerede:** `src/lib/admin-credentials.ts`, `scripts/hash-password.mjs`

---

## 2. Tokenlar (şifre sıfırlama, e-posta doğrulama, sahiplik devri)

### Token düz metin olarak asla saklanmaz; yalnızca SHA-256 özeti yazılır
**Neden:** Veritabanı sızsa bile geçerli bir sıfırlama/devir bağlantısı üretilemesin diye. Düz token yalnızca
kullanıcıya giden e-postanın içindedir ve bellekte kalır.
**Nerede:** `src/lib/tokens.ts`, `OwnershipTransfer.tokenHash`, `PasswordResetToken.tokenHash`

### Token 32 bayt (256 bit) rastgeledir
**Neden:** Tahmin veya kaba kuvvet pratikte imkânsız olsun diye.
**Nerede:** `src/lib/tokens.ts`

### Sahiplik devri daveti 24 saat geçerli ve tek kullanımlıktır
**Neden:** Süresiz davet, e-posta kutusuna sonradan erişen birinin ürünü ele geçirmesi demektir.
**Nerede:** `src/lib/ownership-transfer.ts`

---

## 3. Etiket sistemi

### Etikette üç ayrı değer vardır ve birbirinin yerine kullanılmaz
- `code` (ARK-XXXX-XXXX): etiketin üzerine basılan, **gizli olmayan** tanımlayıcı.
- `activationCode`: kazınarak açılan **gizli** kod — etikete fiziksel olarak sahip olmanın kanıtı.
- `publicToken`: QR/NFC adresindeki değer (`/t/<token>`).

**Neden:** Etiketi görmek (koda bakmak) ile etikete sahip olmak (kazımak) farklı yetkiler; ayrıca QR adresinin
veritabanı kimliği taşımaması gerekiyor.
**Nerede:** `src/lib/tags.ts`

### Aktivasyon kodu veritabanına yazılmaz, üretim ekranında yalnızca bir kez gösterilir
**Neden:** Veritabanı sızsa bile kimse başkasının etiketini aktive edemesin diye. Bilinçli tercih: liste
kaybedilirse etiketler yeniden üretilmelidir.
**Nerede:** `src/app/api/admin/tags/generate/route.ts`, `src/components/admin/TagGenerator.tsx`

### Kodlarda I, L, O, U harfleri hiç kullanılmaz (Crockford Base32)
**Neden:** Kod insan tarafından okunup elle yazılacak; 1/I ve 0/O karışıklığını ve istenmeyen kelimelerin
oluşmasını engeller. Girdi normalleştirmede O→0, I/L→1, U→V çevrilir, böylece kullanıcının yazım farkı
aktivasyonu bozmaz.
**Nerede:** `src/lib/tags.ts` (`kodNormalize`)

### `publicToken` 256 bit rastgeledir; adres veritabanı kimliği içermez
**Neden:** `/t/<token>` herkese açık bir adrestir. Sıralı bir kimlik olsaydı, tek bir etiketi gören kişi
diğerlerinin adreslerini deneyerek bulabilirdi.
**Nerede:** `src/lib/tags.ts`

### Eski `/item/<kayıt-id>` akışı korunur
**Neden:** Daha önce basılmış QR kodları çalışmaya devam etmeli. Yeni etiketler `/t/<token>` kullanır.
**Nerede:** `src/app/item/[id]`, `src/app/t/[token]`

---

## 4. Sahiplik devri

### Servis katmanı Server Action değildir; oturum ve hız sınırlaması çağıran katmanın işidir
**Neden:** İş mantığı herkese açık bir uç olmasın; ayrıca test edilebilir kalsın diye.
**Nerede:** `src/lib/ownership-transfer.ts` (servis) ↔ `src/lib/ownership-transfer-actions.ts` (Server Action)

### Kritik adımlar tek `Serializable` transaction içinde ve koşullu güncellemeyle yapılır
**Neden:** "Önce kontrol et, sonra güncelle" iki eşzamanlı istekte ikisini birden geçirir. `updateMany` + `count === 1`
kontrolü, kabul ile iptal aynı anda çalıştığında yalnızca birinin başarılı olmasını garanti eder.
**Nerede:** `src/lib/ownership-transfer.ts`

### Geçersiz, süresi dolmuş, kullanılmış ve başkasına ait davetler **aynı** mesajı alır
**Neden:** Farklı mesajlar, deneyen kişiye "bu davet var ama senin değil" bilgisini verir. Aynı gerekçeyle,
başkasının ürün kimliği denendiğinde de var olmayan ürünle aynı yanıt döner.
**Nerede:** `src/lib/ownership-transfer.ts` (`KABUL_HATASI`)

### Kabul sırasında e-posta, oturum tokenından değil veritabanından okunur
**Neden:** Oturumdaki e-posta bayat olabilir (kullanıcı adresini değiştirmiş olabilir); yetki kararı güncel veriye
dayanmalı.
**Nerede:** `src/lib/ownership-transfer.ts` (`devirDavetiKabulEt`)

### Etiketi olmayan (legacy) üründe devir tamamlanır ama `TagEvent` yazılmaz
**Neden:** Audit kaydı etikete bağlıdır; sahte `Tag` veya uydurma `tagId` üretmemek için olay atlanır.
**Nerede:** `src/lib/ownership-transfer.ts`

---

## 5. Hız sınırlama

### Sayaçlar bellekte değil veritabanında tutulur
**Neden:** Vercel birden fazla sunucu örneği çalıştırır. Her örnek kendi sayacını tutsaydı gerçek sınır, örnek
sayısı kadar büyürdü.
**Nerede:** `src/lib/rate-limit.ts`

### IP ve e-posta ham hâlde yazılmaz, HMAC özeti saklanır
**Neden:** Hız sınırlama tablosu kişisel veri deposuna dönüşmesin diye.
**Nerede:** `src/lib/rate-limit.ts`

### Şifre sıfırlamada e-posta sınırı aşıldığında yine `200` dönülür
**Neden:** Farklı yanıt, "bu adres sistemde kayıtlı" bilgisini sızdırır. Sınırlar: IP başına 5/saat (429),
e-posta başına 3/saat (sessizce 200, mail gönderilmez).
**Nerede:** `src/app/api/password/forgot/route.ts`

---

## 6. Adresler ve baskı

### QR adresi `NEXT_PUBLIC_APP_URL` üzerinden kurulur, tarayıcının açık olduğu adresten değil
**Neden:** Basılan etiketteki yanlış adresin geri dönüşü yoktur. Ortam değişkeni yoksa
`window.location.origin`'e düşülür.
**Nerede:** `src/components/admin/TagPrintSheet.tsx`, `src/components/admin/TagGenerator.tsx`, `src/lib/email.ts`

### `NEXT_PUBLIC_*` değişkeni değişince redeploy şart
**Neden:** Bu değerler çalışma anında okunmaz, build sırasında koda gömülür.
**Nerede:** `docs/CURRENT_STATUS.md` (production notları)

### Baskı sayfası ayrı bir rota değil, aynı sayfada gizli bir bölümdür
**Neden:** Aktivasyon kodları sunucudan yalnızca bir kez döner ve saklanmaz; başka bir sayfaya taşınamaz,
çünkü orada tekrar üretilemez.
**Nerede:** `src/components/admin/TagPrintSheet.tsx`, `src/app/globals.css` (`@media print`)

---

## 7. Testler

### Entegrasyon testleri ayrı bir veritabanı ister ve production'la çakışırsa çalışmayı reddeder
**Neden:** Test verisini temizlemek için `TRUNCATE` kullanılıyor; yanlış veritabanına bağlanmak canlı veriyi siler.
`.env.test` içindeki `TEST_DATABASE_URL`, `.env` içindeki adreslerle karşılaştırılır ve aynıysa testler durur.
**Nerede:** `tests/helpers/test-ortami.mts`

### Test sunucusunda e-posta gönderimi kesin olarak kapalıdır
**Neden:** Testler sırasında kimseye gerçek e-posta gitmesin. Boş string yeterli değil — Next.js `.env`
dosyalarını yükleyip boş değerlerin üzerine gerçek kimlik bilgilerini yazar; bu yüzden ayrı bir bayrak kullanılır
(`EPOSTA_GONDERIMI_KAPALI=1`).
**Nerede:** `tests/helpers/test-ortami.mts`

### Sahiplik devri, Server Action üzerinden değil servis katmanından test edilir
**Neden:** Server Action'lar HTTP ile doğrudan çağrılamaz. Test, altındaki gerçek iş mantığını veritabanına
bağlanarak sınar; oturum ve hız sınırlaması katmanı test dışıdır.
**Nerede:** `tests/integration/sahiplik-devri.test.mts`

### `@/...` takma adı için teste özel bir resolve kancası var
**Neden:** Node, tsconfig takma adlarını ve Prisma'nın ürettiği uzantısız importları çözemez. Kanca yalnızca
`test:integration` çalıştırmasına `--import` ile eklenir; uygulama derlemesine karışmaz.
**Nerede:** `tests/helpers/alias-cozucu.mjs`

---

## 8. Ürün ve dil

### Tüm arayüz metinleri Türkçe
**Nerede:** `CLAUDE.md`

### Klasör/paket adı `izoris` olarak kaldı
**Neden:** Ürün adı ARKVIUM'a döndü, ancak dizin ve yerel yol adlarını değiştirmek çalışan kurulumu (git remote,
Vercel bağlantısı, yerel yollar) gereksizce bozar. Kod içinde ürün adı ARKVIUM'dur.
**Nerede:** `CLAUDE.md`, `package.json` (`"name": "arkvium"`)
