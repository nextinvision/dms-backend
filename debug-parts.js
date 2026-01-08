
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const jobCard = await prisma.jobCard.findFirst({
            orderBy: { updatedAt: 'desc' },
            include: { items: true, partsRequests: true }
        });

        if (!jobCard) {
            console.log("No Job Cards found.");
            return;
        }

        console.log("Job Card ID:", jobCard.id);
        console.log("Engineer ID:", jobCard.assignedEngineerId);
        console.log("Item 0 Type:", jobCard.items.length > 0 ? jobCard.items[0].itemType : "No items");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
