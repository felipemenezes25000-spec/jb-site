-- CreateTable
CREATE TABLE "StoredBlob" (
    "id" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredBlob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoredBlob_pathname_key" ON "StoredBlob"("pathname");

-- CreateIndex
CREATE INDEX "StoredBlob_createdAt_idx" ON "StoredBlob"("createdAt");
