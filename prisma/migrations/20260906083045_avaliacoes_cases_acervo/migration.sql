-- CreateEnum
CREATE TYPE "ReviewKind" AS ENUM ('compra', 'servico');

-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('rascunho', 'enviado', 'respondido', 'cancelado', 'falhou');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('rascunho', 'em_revisao', 'publicado', 'arquivado');

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "authorizedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "credit" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hasPeople" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usageNote" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "ReviewKind" NOT NULL,
    "orderId" TEXT,
    "workOrderId" TEXT,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'rascunho',
    "token" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "failureReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "nps" INTEGER,
    "comment" TEXT NOT NULL DEFAULT '',
    "publicConsent" BOOLEAN NOT NULL DEFAULT false,
    "publicConsentAt" TIMESTAMP(3),
    "displayName" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechCase" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "symptom" TEXT NOT NULL DEFAULT '',
    "equipmentLabel" TEXT NOT NULL DEFAULT '',
    "modelLabel" TEXT NOT NULL DEFAULT '',
    "diagnosis" TEXT NOT NULL DEFAULT '',
    "intervention" TEXT NOT NULL DEFAULT '',
    "parts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "finalTests" TEXT NOT NULL DEFAULT '',
    "durationLabel" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT '',
    "technicianId" TEXT,
    "reviewerId" TEXT,
    "workOrderId" TEXT,
    "customerConsent" BOOLEAN NOT NULL DEFAULT false,
    "customerConsentAt" TIMESTAMP(3),
    "consentNote" TEXT NOT NULL DEFAULT '',
    "status" "CaseStatus" NOT NULL DEFAULT 'rascunho',
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "pendingNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_token_key" ON "ReviewRequest"("token");

-- CreateIndex
CREATE INDEX "ReviewRequest_customerId_status_idx" ON "ReviewRequest"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_orderId_key" ON "ReviewRequest"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_workOrderId_key" ON "ReviewRequest"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_requestId_key" ON "Review"("requestId");

-- CreateIndex
CREATE INDEX "Review_publicConsent_publishedAt_idx" ON "Review"("publicConsent", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TechCase_slug_key" ON "TechCase"("slug");

-- CreateIndex
CREATE INDEX "TechCase_status_publishedAt_idx" ON "TechCase"("status", "publishedAt");

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReviewRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechCase" ADD CONSTRAINT "TechCase_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechCase" ADD CONSTRAINT "TechCase_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechCase" ADD CONSTRAINT "TechCase_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
