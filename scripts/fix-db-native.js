const { Client } = require('pg');

const connectionString = "postgresql://postgres.xpbukvkjllmvfqfcomfc:42Ev%40123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function main() {
    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Adding columns to Quotation...');
        await client.query('ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "preGstAmount" DECIMAL(65,30) DEFAULT 0');
        await client.query('ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "igst" DECIMAL(65,30) DEFAULT 0');
        await client.query('ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(65,30) DEFAULT 0');

        console.log('Adding columns to QuotationItem...');
        await client.query('ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "serialNumber" INTEGER');
        await client.query('ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "hsnSacCode" TEXT');
        await client.query('ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(65,30)');

        console.log('Columns added successfully');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
