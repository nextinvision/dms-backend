
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Adding partName column...");
        await prisma.$executeRaw`ALTER TABLE "PartsRequestItem" ADD COLUMN "partName" TEXT NOT NULL DEFAULT 'Unknown';`;
        console.log("partName added.");

        console.log("Adding partNumber column...");
        await prisma.$executeRaw`ALTER TABLE "PartsRequestItem" ADD COLUMN "partNumber" TEXT;`;
        console.log("partNumber added.");

        console.log("Removing default from partName...");
        await prisma.$executeRaw`ALTER TABLE "PartsRequestItem" ALTER COLUMN "partName" DROP DEFAULT;`;
        console.log("Default removed.");

    } catch (e) {
        console.error("Error applying schema fix:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
