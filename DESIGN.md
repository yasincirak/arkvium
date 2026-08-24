# ARKVIUM — Tasarım Sistemi

**Durum:** Uygulanıyor · **Kapsam:** Ana sayfa pazarlama katmanı
**Son güncelleme:** 2026-08-24

---

## 1. Amaç

ARKVIUM'un pazarlama arayüzü için tek ve bağlayıcı bir tasarım dili tanımlamak.
Bu belge, "hangisi daha güzel" tartışmasını "kural ne diyor" sorusuna çevirir.

**Konumlandırma değişmez:** ARKVIUM bir **Dijital Sahiplik Platformu**'dur.
Marka adı, logosu ve bu konumlandırma hiçbir tasarım kararıyla yeniden
yorumlanmaz.

### Kapsam dışı (bu belge bunları YÖNETMEZ)

Giriş/kayıt, kullanıcı hesabı, admin paneli, QR ve etiket aktivasyonu, Acil
Durum Profili, sipariş ve ödeme ekranları. Bu yüzeyler işlevseldir; pazarlama
estetiği oraya taşınmaz.

---

## 2. Tasarım ilkeleri

1. **Önce anlaşılırlık.** Kullanıcı ilk ekranda ARKVIUM'un ne yaptığını
   anlamalı. Estetik, anlaşılırlığın önüne geçemez.
2. **Ürün somut anlatılır.** Her ürün bir *kategori* ve bir *gerçek kullanım
   senaryosu* ile sunulur. "Şık tasarım" gibi soyut övgü kullanılmaz.
3. **Hareket işlevseldir.** Animasyon dikkati yönlendirmek içindir; gösteri
   için değildir. Hiçbir animasyon içeriğin görünmesinin ÖN KOŞULU olamaz.
4. **Dürüstlük.** Sahte sayı, sahte yorum, sahte müşteri logosu, "%100
   güvenli" gibi mutlak ifade kullanılmaz. Temsili görseller rozetle
   işaretlenir.
5. **Tek zemin.** Site tek temalıdır: açık zemin, koyu metin. Koyu mod
   varyantı üretilmez.

---

## 3. Renk

Tüm değerler `src/app/globals.css` içinde CSS değişkeni olarak tanımlıdır ve
Tailwind'de `ark-*` adıyla kullanılır. **Hex değeri bileşen içine elle
yazılmaz.**

### 3.1 Rol tablosu

| Rol | Token | Hex | Kullanım |
|---|---|---|---|
| Mürekkep (birincil metin, marka) | `--ark-ink` | `#101a3d` | Başlıklar, gövde metni, koyu düğme zemini |
| Mürekkep 2 (ikincil metin) | `--ark-ink-2` | `#414e78` | Alt başlık, açıklama paragrafı |
| Mürekkep 3 (yardımcı metin) | `--ark-ink-3` | `#5b6785` | Etiket, dipnot, meta bilgi — **en açık izinli metin rengi** |
| Vurgu (etkileşim) | `--ark-accent` | `#4f46e5` | Bağlantı, aktif durum, odak halkası |
| Vurgu koyu (hover) | `--ark-accent-strong` | `#4338ca` | Bağlantı hover, vurgulu düğme hover |
| Vurgu zemin | `--ark-accent-soft` | `#eef0ff` | Rozet, ikon kutusu zemini |
| Ticaret (satın alma) | `--ark-commerce` | `#047857` | Yalnızca "Satın Al" eylemi |
| Ticaret hover | `--ark-commerce-strong` | `#036249` | Satın alma hover |
| Yüzey | `--ark-surface` | `#ffffff` | Ana zemin, kart zemini |
| Yüzey 2 | `--ark-surface-2` | `#f7f8fc` | Alternatif bölüm bandı |
| Yüzey 3 | `--ark-surface-3` | `#eef1f9` | Vurgulu kutu, görsel placeholder |
| Çizgi | `--ark-line` | `#e2e6f0` | Kart ve bölüm kenarlığı |
| Çizgi güçlü | `--ark-line-strong` | `#cdd5e8` | Ayırıcı, form kenarlığı |

### 3.2 Kontrast (ölçülmüş, WCAG 2.1)

Beyaz zemin üzerinde:

| Renk | Oran | Sonuç |
|---|---|---|
| `#101a3d` | **16.97:1** | AAA |
| `#414e78` | **8.12:1** | AAA |
| `#5b6785` | **5.64:1** | AA |
| `#4f46e5` | **6.29:1** | AA |

Renkli zemin üzerinde beyaz metin:

| Zemin | Oran | Sonuç |
|---|---|---|
| `#101a3d` | **16.97:1** | AAA |
| `#4f46e5` | **6.29:1** | AA |
| `#047857` | **5.48:1** | AA |

**Yasak:** `#6f7a99` ve daha açık griler metin için kullanılmaz (4.27:1, AA
altında). `#059669` (emerald-600) beyaz metinle **3.77:1** verir ve düğme
zemini olarak KULLANILMAZ; ticaret rengi `#047857`'dir.

### 3.3 Renk kuralları

- **Ticaret rengi tekildir.** Yeşil yalnızca satın alma eylemidir. Başarı
  mesajı, ikon veya dekorasyon için yeşil kullanılmaz.
- **Vurgu rengi eylem demektir.** Tıklanamayan bir öğe vurgu rengiyle
  boyanmaz.
- **Gradyan** yalnızca çok geniş dekoratif zeminlerde ve metin taşımayan
  alanlarda kullanılabilir. Metin, düğme veya kart üzerinde gradyan yoktur.

---

## 4. Tipografi

Yazı ailesi: **Geist Sans** (`--font-geist-sans`, `src/app/layout.tsx` içinde
yüklenir). İkinci bir yazı ailesi eklenmez.

| Rol | Boyut | Satır | Harf aralığı | Ağırlık |
|---|---|---|---|---|
| Display (hero H1) | `clamp(2.25rem, 5vw, 3.5rem)` | 1.05 | −0.02em | 700 |
| Bölüm başlığı (H2) | `clamp(1.75rem, 3.2vw, 2.5rem)` | 1.15 | −0.015em | 700 |
| Kart başlığı (H3) | `1.25rem` | 1.3 | 0 | 600 |
| Giriş paragrafı | `1.125rem` | 1.7 | 0 | 400 |
| Gövde | `1rem` | 1.7 | 0 | 400 |
| Küçük / meta | `0.875rem` | 1.6 | 0 | 400 |
| Etiket (eyebrow) | `0.75rem` | 1.4 | +0.08em | 600, BÜYÜK HARF |

### Kurallar

- Sayfada **tek `<h1>`** bulunur ve hero'dadır.
- Başlık seviyesi atlanmaz (`h2` → `h4` olmaz).
- Ortalanmış metin blokları **en fazla 3 satır** olmalıdır; uzun paragraf
  sola hizalanır. Bir paragraf masaüstünde 3 satıra sığıp mobilde taşıyorsa
  `text-left sm:text-center` ile yalnızca mobilde sola alınır.
- Paragraf genişliği **65ch**'i aşmaz (`max-w-2xl` ≈ 42rem bu sınırın
  içindedir).
- Büyük harf yalnızca eyebrow etiketlerinde kullanılır; başlıklarda kullanılmaz.

---

## 5. Boşluk ve genişlik

**Temel birim: 4px.** Yalnızca 4'ün katları kullanılır (Tailwind ölçeği).

| Amaç | Değer |
|---|---|
| İçerik genişliği | `max-w-6xl` (72rem / 1152px) |
| Dar içerik (SSS, metin) | `max-w-3xl` (48rem) |
| Yatay iç boşluk | `px-6` (mobil) → `px-8` (≥ 640px) |
| Bölüm dikey ritmi | `py-16` (mobil) → `py-24` (≥ 640px) |
| Başlık ↔ içerik | `mt-10` / `mt-12` |
| Izgara boşluğu | `gap-6` (kart) · `gap-4` (küçük öğe) |
| Kart iç boşluğu | `p-6` (mobil) → `p-7` (≥ 640px) |

**Kural:** İki bölüm arasında hem dolgu hem kenar boşluğu (`py` + `my`) aynı
anda kullanılmaz; ritim yalnızca `py` ile kurulur.

---

## 6. Bileşen kuralları

### 6.1 Kart

- Köşe: `rounded-2xl` (16px)
- Kenarlık: `1px solid var(--ark-line)`
- Zemin: `--ark-surface`
- Gölge: durağan halde **level-1**, hover'da **level-2**
- İç yapı sırası sabittir: **görsel → kategori etiketi → başlık → açıklama →
  meta → birincil eylem**
- Bir ızgaradaki tüm kartlar **eşit yükseklikte** olur; birincil eylem
  hepsinde **aynı hizada, en altta** durur (esnek boşluk ile itilir).
- Kartın tamamı bağlantı yapılmaz; eylem açık bir düğmedir.

### 6.2 Düğme

| Tür | Zemin | Metin | Kullanım |
|---|---|---|---|
| Birincil | `--ark-ink` | beyaz | Sayfanın ana eylemi ("Hemen Başla") |
| Ticaret | `--ark-commerce` | beyaz | Yalnızca "Satın Al" |
| İkincil | şeffaf, `1px` `--ark-line-strong` | `--ark-ink` | Yan eylem |
| Metin | yok | `--ark-accent` | Üçüncül, satır içi |

- Köşe: `rounded-xl` (12px)
- Yükseklik: **en az 44px** (`min-h-[44px]`) — dokunma hedefi
- Geçiş: `transition` + `duration-200`
- Hover: renk koyulaşır. Basış: `active:scale-[0.98]`
- Odak: `focus-visible:outline-2 outline-offset-2 outline-[--ark-accent]`
- **Bir bölümde en fazla iki düğme**; ikisi de birincil olamaz.

### 6.3 Navigasyon

- Sticky üst bar, `bg-white/90` + `backdrop-blur`, alt kenarlık `--ark-line`
- Sol: logo (tıklanınca `/`) · Orta: bölüm çıpaları · Sağ: Giriş + birincil eylem
- Çıpa hedeflerinde `scroll-mt-24` bulunur (sticky bar başlığı örtmesin)
- < 768px'te çıpalar gizlenir, hamburger menüye taşınır; "Hemen Başla"
  görünür kalır
- Aktif/hover: metin `--ark-accent`, altı çizilmez

### 6.4 Form (pazarlama katmanında)

- Etiket girdinin üstünde, görünür (placeholder etiket yerine geçmez)
- Girdi: `rounded-lg`, `1px` `--ark-line-strong`, iç boşluk `px-3 py-2.5`
- Odak: kenarlık `--ark-accent` + 2px odak halkası
- Hata: kırmızı kenarlık **ve** metinle açıklama (yalnızca renkle bildirilmez)
- Zorunlu alan yıldızla değil, "(zorunlu)" metniyle işaretlenir

---

## 7. Gölge, kenarlık, köşe

### Gölge ölçeği

| Seviye | Değer | Kullanım |
|---|---|---|
| level-1 | `0 1px 2px rgba(16,26,61,.06)` | Durağan kart |
| level-2 | `0 4px 16px rgba(16,26,61,.08)` | Kart hover |
| level-3 | `0 12px 32px rgba(16,26,61,.10)` | Öne çıkan panel, hero görseli |

Renkli gölge, iç gölge (inset) ve çoklu katmanlı gölge kullanılmaz.

### Köşe ölçeği

| Token | Değer | Kullanım |
|---|---|---|
| `rounded-lg` | 8px | Girdi, küçük rozet |
| `rounded-xl` | 12px | Düğme, görsel kutusu |
| `rounded-2xl` | 16px | Kart, panel |
| `rounded-3xl` | 24px | Büyük hero paneli |
| `rounded-full` | — | Yalnızca eyebrow rozeti ve avatar |

**Kural:** İç içe geçen öğelerde iç köşe dıştan küçük olur (kart `2xl` ise
içindeki görsel `xl`).

### Kenarlık

Kenarlık her zaman **1px**'tir. 2px+ kenarlık yalnızca odak halkasıdır.

---

## 8. Hareket, hover ve bölüm geçişleri

### Süre ve yumuşatma

| Amaç | Süre | Yumuşatma |
|---|---|---|
| Mikro (renk, opaklık) | 200ms | `ease-out` |
| Hover (dönüşüm + gölge) | 300ms | `ease-out` |
| Bölüm girişi | 600ms | `cubic-bezier(0.22, 1, 0.36, 1)` |

### Bölüm geçişi

- Yalnızca **opaklık + 16px dikey kayma**. Ölçek, dönme, kayma (slide-in),
  bulanıklık kullanılmaz.
- Animasyon **saf CSS**'tir ve `animation-fill-mode: both` ile **her koşulda
  görünür durumda biter**. JavaScript'e veya IntersectionObserver'a bağlı
  değildir.
  > Bu kural bir olaydan doğdu: JS'e bağlı bir geçiş, script çalışmadığında
  > sayfadaki bölümleri kalıcı olarak görünmez bırakmıştı.
- Ardışık kartlarda gecikme **en fazla 70ms adımlarla** ve toplam **300ms**'i
  aşmayacak biçimde uygulanır.

### Hover

- Kart: `-translate-y-1` + gölge level-1 → level-2
- Görsel: `scale-[1.04]`, kapsayıcı `overflow-hidden` (layout kaymaz)
- Düğme: yalnızca renk değişimi
- **Layout'u değiştiren hiçbir hover yoktur** (yükseklik/genişlik/boşluk).

### Kaydırma

- Parallax, scroll-jacking, kaydırmaya bağlı video veya sabitlenmiş (pinned)
  bölüm **kullanılmaz**.
- Çıpa geçişleri tarayıcının doğal davranışına bırakılır.

### Hareket azaltma

`prefers-reduced-motion: reduce` tercihinde **tüm** animasyon ve dönüşümler
kapanır; içerik anında son hâlinde görünür. Bu bir seçenek değil, zorunluluktur.

---

## 9. Mobil davranış

- **Mobil önce** yazılır; `sm:`/`md:`/`lg:` ile büyütülür.
- Kırılma noktaları: `sm` 640 · `md` 768 · `lg` 1024.
- Izgara: 1 sütun (mobil) → 2 (`sm`) → 3 (`lg`). Ürün kartlarında 4 sütun
  kullanılmaz; kart içeriği okunamayacak kadar daralır.
- **Tüm dokunulabilir hedefler en az 44×44px.**
- Yatay kaydırma **yoktur**; taşan içerik kendi `overflow-x-auto` kabında
  kaydırılır.
- **İki sütunlu her bölümde** (hero dâhil) metin, kaynak sırasında da görselden
  önce gelir. Mobilde tek sütuna inince ziyaretçi önce ne okuduğunu bilir;
  ekran okuyucu da başlığı görselden önce okur. Masaüstünde görselin solda
  durması gerekiyorsa bu **yalnızca `md:order-*`** ile sağlanır, kaynak sırası
  değiştirilmez.
- Sticky header mobilde yalnızca logo + "Hemen Başla" + hamburger taşır.
- **Form girdilerinde** yazı boyutu 16px'in altına düşmez (iOS aksi hâlde
  odaklanınca sayfayı otomatik yakınlaştırır).
- **Gövde metni** 14px'in altına düşmez. Tek istisna, görselin köşesindeki
  "Temsili görsel" rozetidir (11px): destekleyici bir uyarıdır, hiçbir bilgiyi
  tek başına taşımaz ve okunmaması içeriği eksiltmez.

---

## 10. Erişilebilirlik

- Metin kontrastı **en az 4.5:1**; büyük başlıklarda (≥ 24px, 700) en az 3:1.
  Ölçülmüş değerler için § 3.2.
- Her bölümün erişilebilir bir adı vardır (`aria-labelledby` ile başlığa bağlı).
- Görsellerde anlamlı `alt`; dekoratif görsellerde `alt=""` + `aria-hidden`.
- Odak göstergesi **asla kaldırılmaz**; `focus-visible` ile 2px halka verilir.
- Bilgi yalnızca renkle aktarılmaz (durum + metin birlikte).
- Klavyeyle tüm eylemlere ulaşılabilir; sıralama görsel sırayla aynıdır.
- İkonlar tek başına anlam taşımaz; yanlarında metin bulunur.
- Otomatik oynayan, durdurulamayan hareket yoktur.

---

## 11. İçerik kuralları

- Tüm arayüz metni **Türkçe**dir.
- Ürün adı ve fiyatı **tek kaynaktan** gelir: `src/lib/siparis.ts`. Pazarlama
  bileşenlerinde fiyat elle yazılmaz.
- Pazarlama metinleri (kategori, senaryo) sipariş katmanına **sızmaz**;
  pazarlama bileşeninin içinde durur.
- Temsili görseller **"Temsili görsel"** rozetiyle işaretlenir.

### Kullanılmayacak ifadeler

"%100 güvenli", "kırılamaz", "hackle­nemez", garanti vaadi, sahte kullanıcı/
satış sayısı, sahte yorum, sahte puan, izinsiz kurumsal müşteri logosu.

---

## 12. Kullanılmaması gereken tasarım kalıpları

| Kalıp | Neden |
|---|---|
| Koyu mod varyantı | Site tek temalı; ikinci tema bakım yükü ve kontrast hatası üretir |
| Scroll-jacking / parallax / pinned bölüm | Kaydırma denetimini kullanıcıdan alır, mobilde bozulur |
| Otomatik dönen carousel | Kullanıcı okurken içerik kayar; erişilebilirlik ihlali |
| Kartın tamamının bağlantı olması | Ekran okuyucuda devasa tek bağlantı; metin seçilemez |
| Placeholder'ın etiket yerine geçmesi | Yazmaya başlayınca etiket kaybolur |
| Yalnızca ikonlu düğme (metinsiz) | Anlam belirsiz, ekran okuyucuda boş |
| Modal / pop-up ile e-posta toplama | Girişi engeller, mobilde kapatılamaz |
| Sonsuz kaydırma | Footer'a erişilemez |
| Metin üzerine gradyan veya düşük kontrastlı görsel | Okunabilirliği ölçülemez hâle getirir |
| Sahte sosyal kanıt | Dürüstlük ilkesine aykırı; hukuki risk |
| Sayfa yüklenirken içerik atlaması (CLS) | Görsellerde sabit en-boy oranı zorunludur |
| Yeni yazı ailesi / ikon kütüphanesi eklemek | Bağımlılık ve yükleme maliyeti; mevcut yapıyla çözülür |

---

## 13. Değerlendirilen alternatifler

**Koyu zeminli hero (reddedildi).** Marka lacivertiyle güçlü duruyordu ancak
sayfanın geri kalanı açık zeminli olduğu için geçişte sert kırılma yaratıyor
ve ürün fotoğraflarının beyaz zeminiyle çakışıyordu.

**Ürün ailesinde 4 sütunlu ızgara (reddedildi).** Beş ürün 4 sütunda tek
başına kalan bir kart bırakıyor; ayrıca kategori + senaryo metni okunamayacak
kadar daralıyor. 3 sütun seçildi.

**Ürün kartlarının carousel'e alınması (reddedildi).** Ürün sayısı beş; hepsi
aynı anda görünebiliyor. Carousel keşfi zorlaştırır ve klavye erişimini
karmaşıklaştırır.

---

## 14. Uygulama durumu

| Alan | Durum |
|---|---|
| Token katmanı (`globals.css`, `tailwind.config.ts`) | ✅ Uygulandı |
| Ana sayfa pazarlama katmanı | ✅ Uygulandı |
| Diğer pazarlama sayfaları (`/urun/*`) | ⏳ Sırada |
| İşlevsel yüzeyler (hesap, sipariş, admin) | ⛔ Kapsam dışı |
