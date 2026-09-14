-- Analitik: ziyaret (oturum) kimliği ve giriş yapmış kullanıcı ilişkisi.
--
-- YALNIZCA sütun ve indeks ekler. Mevcut satırlar etkilenmez (her iki
-- sütun da NULL kabul eder); sipariş, ödeme, etiket, aktivasyon ve giriş
-- akışları bu migration'dan etkilenmez.
--
-- `userId` için YABANCI ANAHTAR TANIMLANMAZ: analitik kayıtları kullanıcı
-- silinse bile bağımsız yaşamalı ve hiçbir cascade silme riski
-- taşımamalıdır ("orderId" ile aynı kalıp).

-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_type_idx" ON "AnalyticsEvent"("userId", "type");
