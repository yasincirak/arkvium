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

## Bilinen açık/yarım işler
- Ownership Transfer çalışması henüz commit edilmedi (çalışma alanında bekliyor)
- `TagEvent.type` şema yorumunda `transfer_requested` listelenmiyor (şema kasıtlı olarak değiştirilmedi)
- Test kapsamı yalnızca auth tarafında doğrulandı (`f88140d`); diğer modüllerin test durumu belirsiz
- Production hazırlık dalı henüz `main`'e birleştirilmedi
- `docs/DECISIONS.md` henüz oluşturulmadı

## Sıradaki geliştirme adımı
- Ownership Transfer değişikliklerini `arkvium/production-hazirlik` dalına commit etmek.
