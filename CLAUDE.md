# ARKVIUM

## Proje
- Ürün adı: ARKVIUM (dosya/klasör adları hâlâ eski isimle `izoris`)
- Teknolojiler: Next.js, TypeScript, Tailwind CSS, Prisma, Supabase (PostgreSQL)

## Oturum çerezleri
- Kullanıcı oturumu: `arkvium_user_session`
- Admin oturumu: `arkvium_admin_session` — `middleware.ts` içinde doğrulanıyor

## Dil
- Tüm UI metinleri Türkçe yazılmalı

## Çalışma tarzı
- Kullanıcının kod deneyimi sınırlı — açıklamalar basit ve kısa olsun
- Dosya değiştirmeden önce onay iste
- Gereksiz refactor yapma, çalışan özellikleri bozma
- Şifre, hash veya `.env` içeriğini asla ekrana yazdırma veya git'e ekleme
- Geçici teşhis loglarını (debug `console.log` vb.) iş bitince kaldır

## Kesin Çalışma Disiplini

- Yalnızca kullanıcının açıkça verdiği tek görevi yap.
- Kapsamı genişletme; yeni özellik, refactor, mimari değişiklik veya bağımlılık ekleme.
- İlgisiz dosyaları tarama, okuma veya değiştirme.
- "Suggested task", iyileştirme önerisi, ek iş, gelecek fikir veya "devam edeyim mi?" üretme.
- Görev sırasında fark edilen kapsam dışı sorun engel değilse yok say. Görevi engelliyorsa hiçbir ek değişiklik yapmadan `ENGEL:` ile tek cümle bildir ve dur.
- Yalnızca görev için zorunlu en az dosyayı değiştir.
- Yalnızca ilgili en küçük testi çalıştır; tam test, build veya lint ancak görev açıkça gerektiriyorsa çalıştır.
- Commit, deploy, PR ve dokümantasyon güncellemesini yalnızca açıkça istenirse yap.
- Doğrulanmamış varsayımla işlem yapma; gereken en küçük doğrulamayı yap.
- Görev tamamlanınca dur. Sonuç yalnızca şu üç satır olsun:

`SONUÇ:`
`DEĞİŞEN:`
`DOĞRULAMA:`
