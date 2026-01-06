import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * This script checks a specific parts issue item to see its full history
 */
async function debugPartsIssueItem() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 DEBUGGING PARTS ISSUE ITEM');
        console.log('='.repeat(80) + '\n');

        const itemId = '52761fd2-1282-4bac-841a-22eacffbd4d0'; // From your screenshot

        const item = await prisma.partsIssueItem.findUnique({
            where: { id: itemId },
            include: {
                issue: {
                    include: {
                        toServiceCenter: true,
                        requestedBy: true
                    }
                },
                dispatches: {
                    orderBy: { dispatchedAt: 'asc' }
                }
            }
        });

        if (!item) {
            console.log('❌ Item not found!');
            return;
        }

        console.log('📦 Parts Issue Item Details:\n');
        console.log(`Item ID: ${item.id}`);
        console.log(`Issue Number: ${(item.issue as any).issueNumber}`);
        console.log(`Service Center: ${(item.issue as any).toServiceCenter.name}`);
        console.log(`Requested By: ${(item.issue as any).requestedBy.name}\n`);

        console.log('📊 Quantities:');
        console.log(`   requestedQty: ${item.requestedQty} ⚠️  (User says this should be 498)`);
        console.log(`   approvedQty: ${item.approvedQty}`);
        console.log(`   issuedQty: ${item.issuedQty}`);
        console.log(`   receivedQty: ${item.receivedQty}\n`);

        console.log(`🔖 Sub-PO Number: ${item.subPoNumber}\n`);

        console.log('📜 Dispatch History:');
        if (item.dispatches.length === 0) {
            console.log('   No dispatches\n');
        } else {
            item.dispatches.forEach((dispatch, idx) => {
                console.log(`   ${idx + 1}. Dispatched: ${dispatch.quantity}`);
                console.log(`      Sub-PO: ${dispatch.subPoNumber}`);
                console.log(`      Fully Fulfilled: ${dispatch.isFullyFulfilled}`);
                console.log(`      Dispatched At: ${dispatch.dispatchedAt}\n`);
            });
        }

        console.log('='.repeat(80));
        console.log('🔎 ANALYSIS');
        console.log('='.repeat(80) + '\n');

        if (item.requestedQty === item.approvedQty && item.approvedQty === item.issuedQty) {
            console.log('⚠️  ISSUE DETECTED:');
            console.log('   All three quantities (requested, approved, issued) are the same: ' + item.requestedQty);
            console.log('   This suggests one of these scenarios:');
            console.log('   1. The requestedQty was overwritten during approval or dispatch');
            console.log('   2. The frontend sent the wrong requestedQty value during creation');
            console.log('   3. This is old data from before the fix was applied\n');

            console.log('💡 SOLUTION:');
            console.log('   1. Check backend logs during parts issue creation for the actual value sent');
            console.log('   2. Try creating a NEW parts issue with our fixed code');
            console.log('   3. If the issue persists, check the frontend code sending the request\n');
        }

        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugPartsIssueItem();
