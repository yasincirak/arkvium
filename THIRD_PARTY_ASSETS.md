# Görsel Varlıkları

## Durum: üçüncü taraf stok görseli KULLANILMIYOR

Sitedeki tüm ürün ve kullanım görselleri ARKVIUM'a aittir ve proje sahibi
tarafından sağlanmıştır. Unsplash, Pexels, Pixabay veya başka bir dış stok
kütüphanesinden görsel kullanılmamaktadır; bu nedenle üçüncü taraf lisans
kaydı gerekmemektedir.

Araştırma sırasında değerlendirilen Unsplash fotoğrafları projeye
alınmamış ve tamamı silinmiştir.

## Proje görselleri

Konum: `public/gorseller/`

| Dosya | İçerik | Kullanıldığı yer |
|---|---|---|
| `hero.jpg` | Çantadaki QR etiketini telefonla okutma; yanında QR etiketli anahtarlar ve tasma | Ana sayfa hero (1. slayt) |
| `arac.jpg` | Araç ön camındaki QR sticker'ın telefonla okutulması | Hero (2. slayt), araç ürün kartı, `/urun/arac-stickeri` |
| `sticker-seti.jpg` | Laptop kılıfı, defter ve çanta üzerinde QR sticker'lar | "3'lü QR Sticker Seti" kartı |
| `anahtarlik.jpg` | Anahtarlara takılı QR kodlu metal etiket | "Metal QR Anahtarlık" kartı, son çağrı bölümü |
| `evcil-hayvan.jpg` | Tasmasında QR künye taşıyan köpek | Hero (3. slayt), "Evcil Hayvan QR Künyesi" kartı |
| `valiz.jpg` | Havalimanında valize takılı QR bagaj etiketi | "QR Valiz Etiketi" kartı |
| `mesajlasma.jpg` | Telefonda gelen mesaj; masada QR etiketli anahtarlar | Hero (4. slayt), gizlilik bölümleri |
| `aktivasyon.jpg` | QR etiketinin telefonla okutulup hesaba bağlanması | "Neden ARKVIUM" bandı, "Nasıl çalışır" bölümü |
| `logo-arka.jpg` | Beyaz zeminli ARKVIUM logosu | Ana sayfa ve ürün sayfasında **en arka katman** (dekoratif) |

## Uygulanan işlemler

- Kaynak PNG'ler JPEG'e çevrildi, uzun kenar 1000–1600 piksele indirildi
  (toplam `public/gorseller` boyutu ~1,1 MB).
- WebP/AVIF dönüşümü `next/image` tarafından çalışma anında yapılır;
  projede ayrı bir WebP kodlayıcı kurulu değildir.
- Kadrajlama dosya kırpmadan CSS `object-position` ile yapılır.
- Arka plan logosu `aria-hidden`, tıklanamaz, %7 opaklıkta ve üzerinde
  beyaz örtü vardır; metin kontrastını etkilemez.

## Marka varlıkları

`public/brand/` altındaki logo dosyaları ARKVIUM'a aittir ve
`src/components/Logo.tsx` üzerinden kullanılır.
