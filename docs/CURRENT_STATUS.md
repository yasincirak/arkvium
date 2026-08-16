# ARKVIUM — Mevcut Durum

Son güncelleme: 2026-08-13 · Dal: `arkvium/production-hazirlik`

## Çalışan mevcut sistem
- Next.js + TypeScript + Tailwind, Prisma + Supabase (PostgreSQL)
- Kullanıcı hesap sistemi: kayıt, giriş, çıkış, hesap sayfası
- Ürün: kayıt, detay sayfası, kullanıcı tarafından düzenleme, QR bağlantısı (`NEXT_PUBLIC_APP_URL` üzerinden)
- Kimlik doğrulama: şifre sıfırlama, e-posta doğrulama, oturum içi şifre değiştirme
- Oturum güvenliği: `sessionVersion` sayacı ile oturum iptali; `arkvium_user_session` / `arkvium_admin_session` çerezleri
- Admin paneli: `src/middleware.ts` ile korunuyor
- Güvenlik: hız sınırlama ve brute-force koruması
- Etiket (tag) sistemi: kriptografik public token, aktivasyon, pasife alma, iptal, başka ürüne taşıma

## Son tamamlanan özellik
- Ownership Transfer — 1. aşama: `OwnershipTransfer` modeli + `OwnershipTransferStatus` enum ve migration
  (`20260813112701_add_ownership_transfer`). Token düz metin saklanmaz (`tokenHash`).
- Ownership Transfer — 2. aşama: `src/lib/ownership-transfer.ts` içindeki `devirDavetiOlustur` servis fonksiyonu.
  Sahiplik kontrolü, e-posta normalizasyonu, kendine devir engeli, 24 saatlik tek kullanımlık token (yalnızca hash DB'de),
  aktif `pending` davet kontrolü + kayıt oluşturma tek `Serializable` transaction'da; etiketi olan üründe
  `TagEvent(type: "transfer_requested")` aynı transaction içinde. Public uç değil; oturum/rate limit çağıran katmanda.

- Ownership Transfer — 3. aşama: `src/lib/ownership-transfer-actions.ts` içindeki `devirDavetiGonder` Server Action'ı.
  `getUserSession()` + `hizSiniriKontrol({ kapsam: "sahiplik-devri", limit: 60/saat })`, davet e-postası
  (`devirDavetiEpostasi` + `epostaGonder`, düz metin), URL `uygulamaAdresi()` üzerinden
  `/ownership-transfer/accept?token=…`. E-posta gönderilemezse kayıt `cancelled` yapılır. Düz token client'a dönmez.

- Ownership Transfer — 4. aşama: kabul iş mantığı. `devirDavetiKabulEt` (servis) + `devirDavetiKabul` (Server Action).
  Token `tokenOzetle()` ile eşleştirilir; oturum kullanıcısının DB'deki güncel e-postası `toEmail` ile eşleşmeli.
  Tek `Serializable` transaction: transfer koşullu sahiplenilir (`updateMany` count === 1), ürün hâlâ `fromUserId`'de mi
  doğrulanır, `ItemRecord.userId` ve varsa `Tag.userId` yeni kullanıcıya geçer, `TagEvent(type: "transferred")` yazılır.
  Geçersiz/süresi dolmuş/başkasına ait davetler tek ve aynı genel mesajı alır.

- Ownership Transfer — 5. aşama: `/ownership-transfer/accept` kabul sayfası. Token `?token=` ile okunur, oturum yoksa
  `/login`'e yönlendirilir, "Sahipliği Kabul Et" butonu `devirDavetiKabul` action'ını çağırır. Token ekranda gösterilmez.

- Login `returnTo` desteği: `/login?returnTo=…` ile giriş sonrası uygulama içi adrese dönülür. Yalnızca `/` ile başlayan
  göreli yollar kabul edilir (`//`, `/\`, harici URL reddedilir → `/account`). Kabul sayfası oturum yoksa bu parametreyle
  yönlendirir. Login/session mantığının geri kalanı değişmedi.

- Ownership Transfer — 6. aşama: ürün detayında (`/account/records/[id]`) "Sahiplik Devri" paneli.
  Aktif davet yoksa e-posta alanı + `devirDavetiGonder`; `pending` ve `expiresAt > now` davet varsa alıcı adresi,
  son geçerlilik ve `devirDavetiIptalEt`. İptal koşullu (`updateMany` count === 1) ve `Serializable` transaction'da;
  kabul ile iptal yarışında yalnızca biri başarılı olur. Token/tokenHash istemciye gönderilmez.

- Ownership Transfer — uçtan uca manuel doğrulama TAMAMLANDI (2026-08-13, test veritabanı + gerçek e-posta):
  davet → e-posta → alıcı hesabıyla giriş → kabul → sahiplik değişimi → aynı davetin ikinci kez reddi.
  Test DB'de doğrulandı: transfer `accepted`, `acceptedAt` dolu, ürün yeni sahibe geçti, `TagEvent(type: "transferred")` yazıldı.
  Özellik `5b3e25f` commit'iyle tamamlandı.

## Production ortamı (2026-08-16)
Canlı adres: **https://www.arkvium.com** (Vercel projesi `arkvium/arkvium`; `arkvium.com` → `www`'ye yönleniyor).

Bugün çözülen üç production sorunu — hepsi **kod hatası değil, Vercel ortam değişkeni** kaynaklıydı:
1. **Giriş çalışmıyordu** (`POST /api/login` 500): `USER_SESSION_SECRET` production'da tanımlı değildi. Eklendi.
2. **Hiçbir e-posta gitmiyordu** (`535 BadCredentials`): `GMAIL_APP_PASSWORD` eski, `GMAIL_USER` ise yanlış/eski bir adresti.
   Doğru çift `arkvium@gmail.com` + yeni Google uygulama şifresi olarak ayarlandı.
3. **Bağlantılar/QR kodları vercel.app'e gidiyordu**: `NEXT_PUBLIC_APP_URL` → `https://www.arkvium.com` yapıldı.

Kalıcı notlar:
- Ortam değişkeni değiştirince **redeploy şart** (`npx vercel redeploy <production-url>`); `NEXT_PUBLIC_*` değerleri build sırasında gömülür.
- Vercel'de değerler `Sensitive` olduğu için okunamaz; yalnızca üzerine yazılır (`vercel env add <AD> <ortam> --force`).
- E-posta gerçekten gitti mi kontrolü: `PasswordResetToken` satırında `usedAt` **boşsa** gönderilmiştir;
  ~0,2 sn içinde dolmuşsa gönderim başarısız olmuştur (`/api/password/forgot` başarısız gönderimde tokenı hemen iptal eder).
- `/api/password/forgot` hız sınırı: IP başına 5/saat (429) ve e-posta başına 3/saat (sessizce 200 döner, mail göndermez).
- **Localhost ≠ production**: dev sunucusu test veritabanına bağlı çalıştırılabiliyor; orada yapılan şifre sıfırlama
  production hesabını değiştirmez.

Canlı ortam doğrulaması (2026-08-16) — uçtan uca çalışıyor:
admin girişi → **Etiket Üretimi sayfası** (`/admin/tags`, yeni) → etiket üretimi → müşteri hesabıyla aktivasyon →
ürüne bağlama → QR adresinin açılması → "eşyayı buldum" bildirimi → sahibe bildirim e-postası.
Production'a ayrıca `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `ADMIN_SESSION_SECRET` eklendi.

Ownership Transfer canlı ortamda da doğrulandı (2026-08-16): iki gerçek hesap arasında davet → e-posta → kabul →
sahiplik değişimi tamamlandı. **Etiketli ürün** üzerinden: `ItemRecord.userId` ve `Tag.userId` yeni sahibe geçti,
`TagEvent` zinciri `activated → transfer_requested → transferred` olarak yazıldı.

Kabul ekranında artık giriş yapılan hesabın e-postası ve "Farklı hesapla giriş yap" bağlantısı gösteriliyor
(testte en çok vakit kaybettiren nokta buydu).

## Etiket baskı sayfası (2026-08-16)
`/admin/tags` içinde üretilen etiketler artık yazdırılabiliyor: `src/components/admin/TagPrintSheet.tsx`
her etiket için QR + etiket kodu kartı basar (isteğe bağlı olarak aktivasyon kodu da), `window.print()` ile
tarayıcının yazdır/PDF penceresi açılır. Baskı ızgarası ekranda gizlidir; yalnızca `globals.css` içindeki
`@media print` bloğu sayesinde kâğıda çıkar. Yeni paket eklenmedi (mevcut `qrcode.react`).

QR adresi artık `NEXT_PUBLIC_APP_URL` üzerinden kuruluyor (CSV'deki "QR Adresi" sütunu dahil); ortam değişkeni
yoksa `window.location.origin`'e düşer. Basılan etikette yanlış adresin geri dönüşü olmadığı için bilinçli tercih.

Doğrulanmadı: baskının kâğıttaki gerçek görünümü (kart boyutu/ızgara) henüz fiziksel olarak denenmedi.

## Sahiplik devri testleri (2026-08-16)
`tests/integration/sahiplik-devri.test.mts` — 19 test. Server Action'lar HTTP üzerinden çağrılamadığı için
altlarındaki servis katmanı (`devirDavetiOlustur` / `devirDavetiIptal` / `devirDavetiKabulEt`) test veritabanına
doğrudan bağlanarak sınanıyor: sahiplik kontrolü, kendine devir engeli, tek bekleyen davet kuralı, süre dolumu,
tek kullanımlık token, yanlış hesapla kabul reddi, iptal yarışı, ürün + `Tag` sahipliğinin taşınması ve
`TagEvent` zinciri. Mevcut mantıkta hata bulunmadı; testler ilk çalıştırmada geçti.

`tests/helpers/alias-cozucu.mjs` (yeni): Node, uygulama kodundaki `@/...` takma adını ve Prisma'nın ürettiği
uzantısız göreli importları çözemiyor. Bu kanca yalnızca `test:integration` çalıştırmasına `--import` ile
ekleniyor; uygulama derlemesini etkilemiyor.

## Kayıp modu (2026-08-16)
Kullanıcı ürün sayfasında ("/account/records/<id>") eşyasını **kayıp** olarak işaretleyebiliyor
(`src/components/account/DurumPanel.tsx`). Kayıp işaretliyken QR kodunu okutan kişi, hem yeni (`/t/<token>`)
hem eski (`/item/<id>`) sayfada belirgin bir uyarı görüyor (`src/components/KayipUyarisi.tsx`).
"Eşyamı buldum" ile durum `active`'e döner.

Yeni Server Action yazılmadı: mevcut `changeRecordStatus` (`src/lib/actions.ts`) kullanıldı, yetki kontrolü
zaten `requireRecordAccess` içinde. Veritabanı değişikliği yok — `lost`/`found` durumları şemada zaten vardı,
yalnızca arayüzü eksikti. Durum etiketleri iki sayfada kopyalanmıştı; `ITEM_DURUM_ETIKETLERI` olarak
`src/lib/types.ts` içinde tek yere alındı.

Doğrulandı: `tests/integration/etiket.test.mts` içinde 4 test (kayıp uyarısının çıkması, normal üründe çıkmaması,
legacy adreste de çıkması, işaret kaldırılınca kaybolması).

## WhatsApp bağlantıları (2026-08-16)
`src/lib/telefon.ts` — `whatsappNumarasi` / `whatsappBaglantisi`. Kullanıcıların farklı yazdığı numaraları
(`0555…`, `+90 555…`, `0090…`, `555…`) wa.me'nin istediği biçime çevirir; ülke kodu yoksa Türkiye (90) varsayılır.
Çözemezse `null` döner ve bağlantı hiç gösterilmez — bozuk wa.me adresi üretilmez. 10 birim testi var
(`tests/unit/telefon.test.mts`).

Kullanıldığı yerler: bulan kişi bildirimi e-postasına "WhatsApp'tan hemen yazmak için" satırı
(`src/lib/actions.ts`), admin bildirimler ve kayıt detay sayfalarında telefonun tıklanabilir olması
(`src/components/WhatsappBaglantisi.tsx`).

Not: Meta Cloud API **kullanılmıyor**; bunlar yalnızca wa.me bağlantısı, maliyeti ve kurulumu yok.

## Bilinen açık/yarım işler
- `createFinderMessage` e-postayı `src/lib/email.ts` üzerinden değil kendi nodemailer çağrısıyla gönderiyor;
  bu yüzden `EPOSTA_GONDERIMI_KAPALI` anahtarını atlıyor. Bugün tetiklenmiyor (hiçbir test bu yolu çağırmıyor)
  ama bulan-kişi akışına test yazılırsa gerçek mail gitme riski var.
- `TagEvent.type` şema yorumunda `transfer_requested` listelenmiyor (şema kasıtlı olarak değiştirilmedi)
- Server Action sarmalayıcıları (oturum + hız sınırlama katmanı) hâlâ test dışı; yalnızca altlarındaki servis test ediliyor
- Test kapsamı: auth (`f88140d`), etiket ve sahiplik devri doğrulandı; kalan modüllerin durumu belirsiz
- (kapandı) `docs/DECISIONS.md` oluşturuldu — "neden böyle yapıldı" kararları orada

## Sıradaki geliştirme adımı (kullanıcı onaylı sıra)
1. ~~wa.me bağlantıları~~ — tamamlandı (yukarı bakınız).
2. **Tarama bildirimi** — etiket okunduğunda sahibe e-posta; mail seli olmaması için hız sınırı şart.
3. **WhatsApp Cloud API** — gerçek WhatsApp bildirimi. Meta Business hesabı, işletme doğrulaması, onaylı şablon
   ve konuşma başına ücret gerektirir; hesap tarafı kullanıcıda.
4. **Baskı ince ayarı** — fiziksel çıktı denendikten sonra kart boyutu/ızgara.
5. **Kalan test kapsamı** — Server Action sarmalayıcıları ve diğer modüller.
