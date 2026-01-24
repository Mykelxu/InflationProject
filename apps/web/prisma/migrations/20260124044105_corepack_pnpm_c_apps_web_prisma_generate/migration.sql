-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "isTracked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchTerm" TEXT;

-- CreateTable
CREATE TABLE "CpiBasketSnapshot" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "CpiBasketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CpiBasketSnapshot_capturedAt_idx" ON "CpiBasketSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "CpiBasketSnapshot_locationId_capturedAt_idx" ON "CpiBasketSnapshot"("locationId", "capturedAt");
