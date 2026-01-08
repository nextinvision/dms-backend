
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Making inventoryPartId nullable...");
        await prisma.$executeRaw`ALTER TABLE "PartsRequestItem" ALTER COLUMN "inventoryPartId" DROP NOT NULL;`;
        console.log("Done.");
    } catch (e) {
        console.error("Error applying schema fix:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
