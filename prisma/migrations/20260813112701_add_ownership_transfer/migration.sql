-- CreateEnum
CREATE TYPE "OwnershipTransferStatus" AS ENUM ('pending', 'accepted', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "OwnershipTransfer" (
    "id" TEXT NOT NULL,
    "itemRecordId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "toEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "OwnershipTransferStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnershipTransfer_tokenHash_key" ON "OwnershipTransfer"("tokenHash");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_itemRecordId_idx" ON "OwnershipTransfer"("itemRecordId");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_fromUserId_idx" ON "OwnershipTransfer"("fromUserId");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_toUserId_idx" ON "OwnershipTransfer"("toUserId");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_toEmail_idx" ON "OwnershipTransfer"("toEmail");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_status_idx" ON "OwnershipTransfer"("status");

-- CreateIndex
CREATE INDEX "OwnershipTransfer_expiresAt_idx" ON "OwnershipTransfer"("expiresAt");

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_itemRecordId_fkey" FOREIGN KEY ("itemRecordId") REFERENCES "ItemRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipTransfer" ADD CONSTRAINT "OwnershipTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
