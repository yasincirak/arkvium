-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "productKod" TEXT;

-- CreateIndex
CREATE INDEX "Tag_productKod_status_idx" ON "Tag"("productKod", "status");
