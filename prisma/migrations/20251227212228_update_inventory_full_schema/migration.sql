-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "gstInput" DECIMAL(65,30),
ADD COLUMN     "gstRateInput" DECIMAL(65,30),
ADD COLUMN     "gstRateOutput" DECIMAL(65,30),
ADD COLUMN     "highValuePart" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labourGstRate" DECIMAL(65,30),
ADD COLUMN     "labourName" TEXT,
ADD COLUMN     "labourPrice" DECIMAL(65,30),
ADD COLUMN     "labourRate" DECIMAL(65,30),
ADD COLUMN     "labourWorkTime" TEXT,
ADD COLUMN     "oemPartNumber" TEXT,
ADD COLUMN     "originType" TEXT,
ADD COLUMN     "partType" TEXT,
ADD COLUMN     "pricePreGst" DECIMAL(65,30),
ADD COLUMN     "totalGst" DECIMAL(65,30),
ADD COLUMN     "totalPrice" DECIMAL(65,30),
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "variant" TEXT;

-- CreateIndex
CREATE INDEX "Inventory_oemPartNumber_idx" ON "Inventory"("oemPartNumber");
