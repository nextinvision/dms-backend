import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * This script fixes the requestedQty for a specific parts issue item
 * Use this to correct old data that was corrupted before the fix was applied
 */
async function fixPartsIssueItemQuantity() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 FIXING PARTS ISSUE ITEM REQUESTED QUANTITY');
        console.log('='.repeat(80) + '\n');

        const itemId = '52761fd2-1282-4bac-841a-22eacffbd4d0'; // From your screenshot
        const correctRequestedQty = 498; // The actual quantity you requested

        console.log(`Item ID: ${itemId}`);
        console.log(`Correct requestedQty: ${correctRequestedQty}\n`);

        // Get current item data
        const currentItem = await prisma.partsIssueItem.findUnique({
            where: { id: itemId }
        });

        if (!currentItem) {
            console.log('❌ Item not found!');
            return;
        }

        console.log('📊 Current Values:');
        console.log(`   requestedQty: ${currentItem.requestedQty}`);
        console.log(`   approvedQty: ${currentItem.approvedQty}`);
        console.log(`   issuedQty: ${currentItem.issuedQty}\n`);

        if (currentItem.requestedQty === correctRequestedQty) {
            console.log('✅ RequestedQty is already correct!');
            return;
        }

        console.log('⚠️  Updating requestedQty...\n');

        // Update the requestedQty to the correct value
        const updated = await prisma.partsIssueItem.update({
            where: { id: itemId },
            data: {
                requestedQty: correctRequestedQty
            }
        });

        console.log('✅ Updated Successfully!\n');
        console.log('📊 New Values:');
        console.log(`   requestedQty: ${updated.requestedQty}`);
        console.log(`   approvedQty: ${updated.approvedQty}`);
        console.log(`   issuedQty: ${updated.issuedQty}\n`);

        console.log('💡 Notes:');
        console.log('   - requestedQty has been corrected to 498');
        console.log('   - approvedQty and issuedQty remain unchanged');
        console.log('   - Sub-PO "C" postfix should be recalculated on next dispatch');
        console.log('   - Since issuedQty (420) < requestedQty (498), item is NOT fully fulfilled\n');

        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixPartsIssueItemQuantity();
