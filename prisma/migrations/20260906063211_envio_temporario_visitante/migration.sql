-- CreateEnum
CREATE TYPE "TempUploadStatus" AS ENUM ('pendente', 'vinculado', 'recusado', 'expirado');

-- CreateTable
CREATE TABLE "TempUpload" (
    "id" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "status" "TempUploadStatus" NOT NULL DEFAULT 'pendente',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "requestId" TEXT,
    "mediaId" TEXT,
    "ip" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempUpload_sessionHash_status_idx" ON "TempUpload"("sessionHash", "status");

-- CreateIndex
CREATE INDEX "TempUpload_status_expiresAt_idx" ON "TempUpload"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TempUpload_requestId_idx" ON "TempUpload"("requestId");

-- AddForeignKey
ALTER TABLE "TempUpload" ADD CONSTRAINT "TempUpload_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
