import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllPurchaseOrderRelatedData() {
    try {
        console.log('🗑️  Starting deletion of all purchase order related data...\n');

        // Step 1: Delete PartsIssueDispatch records for PartsIssues related to PurchaseOrders
        const partsIssuesWithPO = await prisma.partsIssue.findMany({
            where: { purchaseOrderId: { not: null } },
            select: { id: true }
        });

        if (partsIssuesWithPO.length > 0) {
            const issueIds = partsIssuesWithPO.map(pi => pi.id);

            const deletedDispatches = await prisma.partsIssueDispatch.deleteMany({
                where: { issueId: { in: issueIds } }
            });
            console.log(`✅ Deleted ${deletedDispatches.count} parts issue dispatch records`);

            // Step 2: Delete PartsIssueItem records for PartsIssues related to PurchaseOrders
            const deletedIssueItems = await prisma.partsIssueItem.deleteMany({
                where: { issueId: { in: issueIds } }
            });
            console.log(`✅ Deleted ${deletedIssueItems.count} parts issue item records`);

            // Step 3: Delete PartsIssue records that reference PurchaseOrders
            const deletedPartsIssues = await prisma.partsIssue.deleteMany({
                where: { purchaseOrderId: { not: null } }
            });
            console.log(`✅ Deleted ${deletedPartsIssues.count} parts issue records`);
        } else {
            console.log('ℹ️  No parts issues related to purchase orders found');
        }

        // Step 4: Delete all POItems
        const deletedPOItems = await prisma.pOItem.deleteMany({});
        console.log(`✅ Deleted ${deletedPOItems.count} purchase order items`);

        // Step 5: Delete all PurchaseOrders
        const deletedPurchaseOrders = await prisma.purchaseOrder.deleteMany({});
        console.log(`✅ Deleted ${deletedPurchaseOrders.count} purchase orders`);

        console.log('\n✨ All purchase order related data has been successfully deleted!');
        console.log('\n📊 Summary:');
        console.log('   - Purchase Orders: Emptied');
        console.log('   - Purchase Order Items: Emptied');
        console.log('   - Related Parts Issues: Emptied');
        console.log('   - Related Parts Issue Items: Emptied');
        console.log('   - Related Parts Issue Dispatches: Emptied');

    } catch (error) {
        console.error('❌ Error deleting purchase order related data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllPurchaseOrderRelatedData();
