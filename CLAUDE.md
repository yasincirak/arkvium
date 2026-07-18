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
