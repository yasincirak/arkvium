-- CreateTable
CREATE TABLE "ItemRecord" (
    "id" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinderMessage" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "finderName" TEXT NOT NULL,
    "finderPhone" TEXT NOT NULL,
    "finderEmail" TEXT,
    "location" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "emailDeliveryStatus" TEXT,
    "emailDeliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinderMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinderMessage" ADD CONSTRAINT "FinderMessage_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ItemRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
