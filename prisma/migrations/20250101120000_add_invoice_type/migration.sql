-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "InvoiceType" AS ENUM ('OTC_ORDER', 'JOB_CARD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (if column doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Invoice' AND column_name = 'invoiceType'
    ) THEN
        ALTER TABLE "Invoice" ADD COLUMN "invoiceType" "InvoiceType" NOT NULL DEFAULT 'JOB_CARD';
    END IF;
END $$;

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "Invoice_invoiceType_idx" ON "Invoice"("invoiceType");

