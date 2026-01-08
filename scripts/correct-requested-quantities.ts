import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * This script corrects requestedQty in PartsIssueItem table
 * For Parts Issues linked to Purchase Orders, it ensures requestedQty matches PO quantity
 */
async function correctRequestedQuantities() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 CORRECTING PARTS ISSUE REQUESTED QUANTITIES');
        console.log('='.repeat(80) + '\n');

        // Get all Parts Issues that are linked to Purchase Orders
        const partsIssues = await prisma.partsIssue.findMany({
            where: {
                purchaseOrderId: { not: null }
            },
            include: {
                items: true,
                purchaseOrder: {
                    include: { items: true }
                }
            }
        });

        if (partsIssues.length === 0) {
            console.log('ℹ️  No Parts Issues linked to Purchase Orders found.');
            console.log('   Nothing to correct.\n');
            return;
        }

        console.log(`Found ${partsIssues.length} Parts Issue(s) linked to Purchase Orders\n`);

        let correctedCount = 0;
        let alreadyCorrectCount = 0;

        for (const partsIssue of partsIssues) {
            console.log(`📋 Parts Issue: ${partsIssue.issueNumber}`);
            console.log(`   PO: ${partsIssue.purchaseOrder?.poNumber}\n`);

            for (const piItem of partsIssue.items) {
                // Find matching PO item
                const matchingPOItem = partsIssue.purchaseOrder?.items.find(poItem =>
                    poItem.centralInventoryPartId === piItem.centralInventoryPartId
                );

                if (!matchingPOItem) {
                    console.log(`   ⚠️  Item ${piItem.id}: No matching PO item found, skipping\n`);
                    continue;
                }

                const currentRequestedQty = Number(piItem.requestedQty);
                const correctQty = Number(matchingPOItem.quantity);

                // Get part name for logging
                const centralPart = await prisma.centralInventory.findUnique({
                    where: { id: piItem.centralInventoryPartId },
                    select: { partName: true }
                });

                const partName = centralPart?.partName || 'Unknown Part';

                if (currentRequestedQty !== correctQty) {
                    console.log(`   📦 "${partName}"`);
                    console.log(`      Current requestedQty: ${currentRequestedQty}`);
                    console.log(`      Correct PO quantity: ${correctQty}`);
                    console.log(`      🔧 Updating...`);

                    // Update the requestedQty
                    await prisma.partsIssueItem.update({
                        where: { id: piItem.id },
                        data: { requestedQty: correctQty }
                    });

                    console.log(`      ✅ Updated to ${correctQty}\n`);
                    correctedCount++;
                } else {
                    console.log(`   ✅ "${partName}": Already correct (${currentRequestedQty})\n`);
                    alreadyCorrectCount++;
                }
            }

            console.log('-'.repeat(80) + '\n');
        }

        console.log('='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`   Items corrected: ${correctedCount}`);
        console.log(`   Items already correct: ${alreadyCorrectCount}`);
        console.log(`   Total checked: ${correctedCount + alreadyCorrectCount}`);

        if (correctedCount > 0) {
            console.log(`\n✅ Successfully corrected ${correctedCount} item(s)!`);
        } else {
            console.log(`\n✅ All items already have correct requestedQty!`);
        }
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

correctRequestedQuantities();
