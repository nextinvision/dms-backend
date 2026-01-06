-- AlterTable: Add purchaseOrderId to PartsIssue
ALTER TABLE "PartsIssue" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;

-- AddForeignKey
DO $$ 
BEGIN
    -- Add foreign key for purchaseOrderId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PartsIssue_purchaseOrderId_fkey'
    ) THEN
        ALTER TABLE "PartsIssue" ADD CONSTRAINT "PartsIssue_purchaseOrderId_fkey" 
        FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PartsIssue_purchaseOrderId_idx" ON "PartsIssue"("purchaseOrderId");

