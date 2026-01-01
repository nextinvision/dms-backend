-- AlterTable: Add new fields to PurchaseOrder
ALTER TABLE "PurchaseOrder" 
ADD COLUMN IF NOT EXISTS "fromServiceCenterId" TEXT,
ADD COLUMN IF NOT EXISTS "requestedById" TEXT,
ADD COLUMN IF NOT EXISTS "orderNotes" TEXT;

-- Make supplierId optional (nullable) - only if it's currently NOT NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PurchaseOrder' 
        AND column_name = 'supplierId' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "PurchaseOrder" ALTER COLUMN "supplierId" DROP NOT NULL;
    END IF;
END $$;

-- Add foreign key constraints only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_fromServiceCenterId_fkey'
    ) THEN
        ALTER TABLE "PurchaseOrder" 
        ADD CONSTRAINT "PurchaseOrder_fromServiceCenterId_fkey" 
        FOREIGN KEY ("fromServiceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_requestedById_fkey'
    ) THEN
        ALTER TABLE "PurchaseOrder" 
        ADD CONSTRAINT "PurchaseOrder_requestedById_fkey" 
        FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index for fromServiceCenterId
CREATE INDEX IF NOT EXISTS "PurchaseOrder_fromServiceCenterId_idx" ON "PurchaseOrder"("fromServiceCenterId");

-- AlterTable: Add new fields to POItem
ALTER TABLE "POItem" 
ADD COLUMN IF NOT EXISTS "inventoryPartId" TEXT,
ADD COLUMN IF NOT EXISTS "partName" TEXT,
ADD COLUMN IF NOT EXISTS "urgency" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Make centralInventoryPartId optional (nullable) - only if it's currently NOT NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'POItem' 
        AND column_name = 'centralInventoryPartId' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "POItem" ALTER COLUMN "centralInventoryPartId" DROP NOT NULL;
    END IF;
END $$;

-- Add foreign key constraint for inventoryPartId only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'POItem_inventoryPartId_fkey'
    ) THEN
        ALTER TABLE "POItem" 
        ADD CONSTRAINT "POItem_inventoryPartId_fkey" 
        FOREIGN KEY ("inventoryPartId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index for inventoryPartId
CREATE INDEX IF NOT EXISTS "POItem_inventoryPartId_idx" ON "POItem"("inventoryPartId");

