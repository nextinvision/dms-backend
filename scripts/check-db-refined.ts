import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Verifying missing columns in Quotation...');
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Quotation' 
      AND column_name IN ('preGstAmount', 'igst', 'discountPercent', 'totalAmount', 'subtotal', 'discount')
    `;
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
