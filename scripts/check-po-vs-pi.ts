import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFullDetails() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 CHECKING PARTS ISSUE AND PURCHASE ORDER');
        console.log('='.repeat(80) + '\n');

        const partsIssue = await prisma.partsIssue.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                items: true,
                purchaseOrder: {
                    include: { items: true }
                }
            }
        });

        if (!partsIssue) {
            console.log('❌ No Parts Issues found');
            return;
        }

        console.log(`📋 Parts Issue: ${partsIssue.issueNumber}`);
        console.log(`   Created: ${partsIssue.createdAt}`);

        if (!partsIssue.purchaseOrder) {
            console.log('\n⚠️  This Parts Issue is NOT linked to a Purchase Order!');
            console.log('   The fix only works when Parts Issue is created FROM a Purchase Order.\n');
            return;
        }

        console.log(`   Linked to PO: ${partsIssue.purchaseOrder.poNumber}\n`);

        console.log('=' + '='.repeat(79));
        console.log('COMPARISON: Purchase Order vs Parts Issue');
        console.log('=' + '='.repeat(79) + '\n');

        for (const piItem of partsIssue.items) {
            // Find central inventory part
            const centralPart = await prisma.centralInventory.findUnique({
                where: { id: piItem.centralInventoryPartId },
                select: { partName: true, partNumber: true }
            });

            console.log(`📦 Part: ${centralPart?.partName || 'Unknown'}`);
            console.log(`   Part Number: ${centralPart?.partNumber || 'N/A'}`);
            console.log(`   Central Inventory ID: ${piItem.centralInventoryPartId}\n`);

            // Find matching PO item
            const poItem = partsIssue.purchaseOrder!.items.find(item =>
                item.centralInventoryPartId === piItem.centralInventoryPartId
            );

            if (poItem) {
                console.log(`   Purchase Order Item:`);
                console.log(`      Quantity (what SIM requested): ${poItem.quantity}`);
                console.log(`      ReceivedQty: ${poItem.receivedQty}\n`);

                console.log(`   Parts Issue Item:`);
                console.log(`      requestedQty: ${piItem.requestedQty}`);
                console.log(`      approvedQty: ${piItem.approvedQty}`);
                console.log(`      issuedQty: ${piItem.issuedQty}\n`);

                if (Number(piItem.requestedQty) === Number(poItem.quantity)) {
                    console.log(`   ✅ CORRECT: requestedQty (${piItem.requestedQty}) matches PO quantity (${poItem.quantity})\n`);
                } else {
                    console.log(`   ❌ ERROR: requestedQty (${piItem.requestedQty}) does NOT match PO quantity (${poItem.quantity})`);
                    console.log(`   Expected: ${poItem.quantity}, Got: ${piItem.requestedQty}\n`);
                }
            } else {
                console.log(`   ⚠️  No matching PO item found for this part\n`);
            }

            console.log('-'.repeat(80) + '\n');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFullDetails();
