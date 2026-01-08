import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPI2026_0002() {
    try {
        const pi = await prisma.partsIssue.findFirst({
            where: { issueNumber: 'PI-2026-0002' },
            include: {
                items: true,
                purchaseOrder: {
                    include: { items: true }
                }
            }
        });

        if (!pi) {
            console.log('Parts Issue PI-2026-0002 not found');
            return;
        }

        console.log('\n📋 Parts Issue: PI-2026-0002');
        console.log(`PO Linked: ${pi.purchaseOrderId ? 'Yes' : 'No'}`);

        for (const item of pi.items) {
            const part = await prisma.centralInventory.findUnique({
                where: { id: item.centralInventoryPartId },
                select: { partName: true }
            });

            console.log(`\n📦 ${part?.partName || 'Unknown'}`);
            console.log(`   requestedQty: ${item.requestedQty}`);
            console.log(`   approvedQty: ${item.approvedQty}`);
            console.log(`   issuedQty: ${item.issuedQty}`);

            if (pi.purchaseOrder) {
                const poItem = pi.purchaseOrder.items.find(p =>
                    p.centralInventoryPartId === item.centralInventoryPartId
                );
                if (poItem) {
                    console.log(`   PO Quantity: ${poItem.quantity}`);
                }
            }
        }
        console.log('');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPI2026_0002();
