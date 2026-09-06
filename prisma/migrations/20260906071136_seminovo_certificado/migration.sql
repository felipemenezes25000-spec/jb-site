-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('sem_certificacao', 'em_preparacao', 'concluida', 'publicada', 'revogada');

-- CreateTable
CREATE TABLE "UnitCertification" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "CertificationStatus" NOT NULL DEFAULT 'em_preparacao',
    "publicCode" TEXT NOT NULL,
    "checklistVersion" TEXT NOT NULL DEFAULT 'v1',
    "itemsTotal" INTEGER NOT NULL DEFAULT 0,
    "itemsApproved" INTEGER NOT NULL DEFAULT 0,
    "itemsNotApplicable" INTEGER NOT NULL DEFAULT 0,
    "technicianId" TEXT,
    "publishedById" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "revokedReason" TEXT NOT NULL DEFAULT '',
    "inspectedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationRevision" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "status" "CertificationStatus" NOT NULL,
    "checklistVersion" TEXT NOT NULL,
    "itemsTotal" INTEGER NOT NULL,
    "itemsApproved" INTEGER NOT NULL,
    "itemsNotApplicable" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitCertification_unitId_key" ON "UnitCertification"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitCertification_publicCode_key" ON "UnitCertification"("publicCode");

-- CreateIndex
CREATE INDEX "UnitCertification_status_idx" ON "UnitCertification"("status");

-- CreateIndex
CREATE INDEX "CertificationRevision_certificationId_createdAt_idx" ON "CertificationRevision"("certificationId", "createdAt");

-- AddForeignKey
ALTER TABLE "UnitCertification" ADD CONSTRAINT "UnitCertification_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitCertification" ADD CONSTRAINT "UnitCertification_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitCertification" ADD CONSTRAINT "UnitCertification_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationRevision" ADD CONSTRAINT "CertificationRevision_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "UnitCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
