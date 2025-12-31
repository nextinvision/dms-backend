-- AlterTable: Add new fields to PurchaseOrder
ALTER TABLE "PurchaseOrder" 
ADD COLUMN IF NOT EXISTS "fromServiceCenterId" TEXT,
ADD COLUMN IF NOT EXISTS "requestedById" TEXT,
ADD COLUMN IF NOT EXISTS "orderNotes" TEXT;

-- Make supplierId optional (nullable)
ALTER TABLE "PurchaseOrder" 
ALTER COLUMN "supplierId" DROP NOT NULL;

-- Add foreign key constraints
ALTER TABLE "PurchaseOrder" 
ADD CONSTRAINT "PurchaseOrder_fromServiceCenterId_fkey" 
FOREIGN KEY ("fromServiceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" 
ADD CONSTRAINT "PurchaseOrder_requestedById_fkey" 
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for fromServiceCenterId
CREATE INDEX IF NOT EXISTS "PurchaseOrder_fromServiceCenterId_idx" ON "PurchaseOrder"("fromServiceCenterId");

-- AlterTable: Add new fields to POItem
ALTER TABLE "POItem" 
ADD COLUMN IF NOT EXISTS "inventoryPartId" TEXT,
ADD COLUMN IF NOT EXISTS "partName" TEXT,
ADD COLUMN IF NOT EXISTS "urgency" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Make centralInventoryPartId optional (nullable)
ALTER TABLE "POItem" 
ALTER COLUMN "centralInventoryPartId" DROP NOT NULL;

-- Add foreign key constraint for inventoryPartId
ALTER TABLE "POItem" 
ADD CONSTRAINT "POItem_inventoryPartId_fkey" 
FOREIGN KEY ("inventoryPartId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for inventoryPartId
CREATE INDEX IF NOT EXISTS "POItem_inventoryPartId_idx" ON "POItem"("inventoryPartId");

