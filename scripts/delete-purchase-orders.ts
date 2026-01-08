import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deletePurchaseOrders() {
    try {
        console.log('🗑️  Starting deletion of all purchase orders...\n');

        // Delete all POItems first
        const deletedItems = await prisma.pOItem.deleteMany({});
        console.log(`✅ Deleted ${deletedItems.count} purchase order items`);

        // Delete all PurchaseOrders
        const deletedOrders = await prisma.purchaseOrder.deleteMany({});
        console.log(`✅ Deleted ${deletedOrders.count} purchase orders`);

        console.log('\n✨ All purchase order records have been successfully deleted!');
    } catch (error) {
        console.error('❌ Error deleting purchase orders:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

deletePurchaseOrders();
