-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('OTC_ORDER', 'JOB_CARD');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "invoiceType" "InvoiceType" NOT NULL DEFAULT 'JOB_CARD';

-- CreateIndex
CREATE INDEX "Invoice_invoiceType_idx" ON "Invoice"("invoiceType");

