-- CreateTable
CREATE TABLE "IngestLog" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "term" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "priceCents" INTEGER,
    "locationId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "IngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestLog_capturedAt_idx" ON "IngestLog"("capturedAt");

-- CreateIndex
CREATE INDEX "IngestLog_term_capturedAt_idx" ON "IngestLog"("term", "capturedAt");
