-- İptal/iade talepleri, geri ödeme kayıtları ve kargo bilgileri.
--
-- YALNIZCA EKLEME YAPAR: yeni tip, yeni tablo ve mevcut "Order" tablosuna
-- NULL kabul eden üç yeni sütun. Hiçbir sütun silinmez, hiçbir kayıt
-- güncellenmez veya silinmez. Mevcut sipariş, ödeme ve stok verileri
-- olduğu gibi kalır; mevcut akışlar bu migration'dan etkilenmez.

-- CreateEnum
CREATE TYPE "OrderRequestType" AS ENUM ('cancel', 'refund');

-- CreateEnum
CREATE TYPE "OrderRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('requested', 'processing', 'succeeded', 'failed');

-- AlterTable: kargo bilgileri (hepsi NULL kabul eder)
ALTER TABLE "Order" ADD COLUMN "kargoFirmasi" TEXT;
ALTER TABLE "Order" ADD COLUMN "kargoTakipNo" TEXT;
ALTER TABLE "Order" ADD COLUMN "kargoTakipUrl" TEXT;

-- CreateTable
CREATE TABLE "OrderRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderRequestType" NOT NULL,
    "status" "OrderRequestStatus" NOT NULL DEFAULT 'pending',
    "gerekce" TEXT NOT NULL,
    "yoneticiNotu" TEXT,
    "actorAdminEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "aktifAnahtar" TEXT,

    CONSTRAINT "OrderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountKurus" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "provider" TEXT NOT NULL DEFAULT 'iyzico',
    "status" "RefundStatus" NOT NULL DEFAULT 'requested',
    "providerRefundId" TEXT,
    "errorCode" TEXT,
    "manuelIslemKimligi" TEXT,
    "actorAdminEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "aktifAnahtar" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- "Aynı sipariş için ikinci AKTİF talep açılamaz" kuralının tek garantisi.
CREATE UNIQUE INDEX "OrderRequest_aktifAnahtar_key" ON "OrderRequest"("aktifAnahtar");

-- CreateIndex
CREATE INDEX "OrderRequest_orderId_idx" ON "OrderRequest"("orderId");

-- CreateIndex
CREATE INDEX "OrderRequest_status_createdAt_idx" ON "OrderRequest"("status", "createdAt");

-- CreateIndex
-- "Aynı ödeme için ikinci AÇIK iade kaydı oluşmaz" kuralının tek garantisi.
CREATE UNIQUE INDEX "Refund_aktifAnahtar_key" ON "Refund"("aktifAnahtar");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");

-- AddForeignKey
-- Restrict: denetim ve mali kayıt; sipariş/ödeme silinerek yok edilemez.
ALTER TABLE "OrderRequest" ADD CONSTRAINT "OrderRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tutar negatif olamaz ("Order" tablosundaki CHECK kalıbıyla aynı).
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amountKurus_check" CHECK ("amountKurus" >= 0);
