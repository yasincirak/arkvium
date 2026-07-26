/*
  Warnings:

  - You are about to drop the column `sessionsValidFrom` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "sessionsValidFrom",
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;
