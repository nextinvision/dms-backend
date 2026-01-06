import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Debug script to check the latest Parts Issue and verify PO integration
 */
async function debugLatestPartsIssue() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 DEBUGGING LATEST PARTS ISSUE');
        console.log('='.repeat(80) + '\n');

        // Get the latest parts issue
        const latestIssue = await prisma.partsIssue.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                items: true,
                purchaseOrder: {
                    include: { items: true }
                },
                toServiceCenter: true
            }
        });

        if (!latestIssue) {
            console.log('❌ No parts issues found. Create one to test.');
            return;
        }

        console.log(`📋 Parts Issue: ${latestIssue.issueNumber}`);
        console.log(`   Status: ${latestIssue.status}`);
        console.log(`   Service Center: ${latestIssue.toServiceCenter.name}`);
        console.log(`   Created: ${latestIssue.createdAt}`);

        if (latestIssue.purchaseOrder) {
            console.log(`   🔗 Linked to PO: ${latestIssue.purchaseOrder.poNumber}\n`);
        } else {
            console.log(`   ⚠️  Not linked to any Purchase Order\n`);
        }

        console.log('📦 Parts Issue Items:\n');

        for (const item of latestIssue.items) {
            console.log(`   Item ID: ${item.id}`);
            console.log(`   Central Inventory Part ID: ${item.centralInventoryPartId}`);
            console.log(`   requestedQty: ${item.requestedQty}`);
            console.log(`   approvedQty: ${item.approvedQty}`);
            console.log(`   issuedQty: ${item.issuedQty}`);

            // If PO is linked, find matching PO item
            if (latestIssue.purchaseOrder) {
                const matchingPOItem = latestIssue.purchaseOrder.items.find(poItem =>
                    poItem.centralInventoryPartId === item.centralInventoryPartId
                );

                if (matchingPOItem) {
                    console.log(`   ✅ Matched PO Item:`);
                    console.log(`      PO Quantity: ${matchingPOItem.quantity}`);
                    console.log(`      PO Part Name: ${matchingPOItem.partName}`);

                    if (Number(item.requestedQty) === Number(matchingPOItem.quantity)) {
                        console.log(`      ✅ CORRECT: requestedQty matches PO quantity`);
                    } else {
                        console.log(`      ❌ ERROR: requestedQty (${item.requestedQty}) does NOT match PO quantity (${matchingPOItem.quantity})`);
                    }
                } else {
                    console.log(`   ⚠️  No matching PO item found`);
                }
            }
            console.log('');
        }

        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugLatestPartsIssue();
