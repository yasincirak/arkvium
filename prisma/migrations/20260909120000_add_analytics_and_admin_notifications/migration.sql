-- Analitik ve yönetici bildirimleri.
--
-- Bu migration YALNIZCA yeni tablo ve tip ekler. Mevcut hiçbir tabloyu,
-- sütunu veya kısıtı değiştirmez; sipariş, ödeme, etiket, aktivasyon ve
-- giriş akışları bu migration'dan etkilenmez.

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('page_view', 'product_view', 'cart_add', 'cart_remove', 'checkout_started', 'payment_failed', 'purchase');

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "visitorId" TEXT,
    "path" TEXT,
    "productKod" TEXT,
    "orderId" TEXT,
    "valueKurus" INTEGER,
    "uniqueKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotificationSetting" (
    "userId" TEXT NOT NULL,
    "satisBildirimleriAcik" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNotificationSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_uniqueKey_key" ON "AnalyticsEvent"("uniqueKey");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productKod_type_createdAt_idx" ON "AnalyticsEvent"("productKod", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_type_idx" ON "AnalyticsEvent"("visitorId", "type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_orderId_idx" ON "AnalyticsEvent"("orderId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_readAt_idx" ON "AdminNotification"("readAt");

-- CreateIndex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- CreateIndex
-- "Aynı sipariş için yalnızca bir bildirim" kuralının tek gerçek garantisi.
CREATE UNIQUE INDEX "AdminNotification_type_orderId_key" ON "AdminNotification"("type", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotificationSetting" ADD CONSTRAINT "AdminNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tutar alanı negatif olamaz (Order tablosundaki CHECK kalıbıyla aynı).
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_valueKurus_check" CHECK ("valueKurus" IS NULL OR "valueKurus" >= 0);
