import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking Quotation table columns...');
        const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Quotation'
    `;
        console.log('Quotation columns:', result);

        console.log('Checking QuotationItem table columns...');
        const resultItems = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'QuotationItem'
    `;
        console.log('QuotationItem columns:', resultItems);
    } catch (error) {
        console.error('Error checking DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
