import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB fix script...');
    try {
        // Add columns to Quotation
        console.log('Adding columns to Quotation table...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "Quotation" 
      ADD COLUMN IF NOT EXISTS "preGstAmount" DECIMAL(65,30) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "igst" DECIMAL(65,30) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(65,30) DEFAULT 0;
    `);

        // Add columns to QuotationItem
        console.log('Adding columns to QuotationItem table...');
        await prisma.$executeRawUnsafe(`
      ALTER TABLE "QuotationItem" 
      ADD COLUMN IF NOT EXISTS "serialNumber" INTEGER,
      ADD COLUMN IF NOT EXISTS "hsnSacCode" TEXT,
      ADD COLUMN IF NOT EXISTS "amount" DECIMAL(65,30);
    `);

        console.log('DB fix completed successfully!');
    } catch (error) {
        console.error('Error fixing DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
