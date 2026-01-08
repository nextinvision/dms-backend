-- Add missing inventoryPartId column to JobCardItem table
ALTER TABLE "JobCardItem" ADD COLUMN IF NOT EXISTS "inventoryPartId" TEXT;
