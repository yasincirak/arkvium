-- CreateTable
CREATE TABLE "EmergencyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemRecordId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "bloodType" TEXT,
    "allergies" TEXT,
    "medications" TEXT,
    "medicalConditions" TEXT,
    "emergencyNote" TEXT,
    "displayNameGorunur" BOOLEAN NOT NULL DEFAULT false,
    "bloodTypeGorunur" BOOLEAN NOT NULL DEFAULT false,
    "allergiesGorunur" BOOLEAN NOT NULL DEFAULT false,
    "medicationsGorunur" BOOLEAN NOT NULL DEFAULT false,
    "medicalConditionsGorunur" BOOLEAN NOT NULL DEFAULT false,
    "emergencyNoteGorunur" BOOLEAN NOT NULL DEFAULT false,
    "contactsGorunur" BOOLEAN NOT NULL DEFAULT false,
    "disclaimerAcceptedAt" TIMESTAMP(3),
    "explicitConsentAt" TIMESTAMP(3),
    "explicitConsentVersion" TEXT,
    "emergencyContactDeclarationAcceptedAt" TIMESTAMP(3),
    "consentWithdrawnAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "emergencyProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyProfile_itemRecordId_key" ON "EmergencyProfile"("itemRecordId");

-- CreateIndex
CREATE INDEX "EmergencyProfile_userId_idx" ON "EmergencyProfile"("userId");

-- CreateIndex
CREATE INDEX "EmergencyContact_emergencyProfileId_idx" ON "EmergencyContact"("emergencyProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_emergencyProfileId_priority_key" ON "EmergencyContact"("emergencyProfileId", "priority");

-- AddForeignKey
ALTER TABLE "EmergencyProfile" ADD CONSTRAINT "EmergencyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyProfile" ADD CONSTRAINT "EmergencyProfile_itemRecordId_fkey" FOREIGN KEY ("itemRecordId") REFERENCES "ItemRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_emergencyProfileId_fkey" FOREIGN KEY ("emergencyProfileId") REFERENCES "EmergencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
