import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDeletion() {
    try {
        const poCount = await prisma.purchaseOrder.count();
        const poItemCount = await prisma.pOItem.count();

        console.log('\n📊 Verification Results:');
        console.log(`   Purchase Orders: ${poCount}`);
        console.log(`   Purchase Order Items: ${poItemCount}`);

        if (poCount === 0 && poItemCount === 0) {
            console.log('\n✅ Confirmed: All purchase order tables are empty!');
        } else {
            console.log('\n⚠️  Warning: Some records still exist!');
        }
    } catch (error) {
        console.error('❌ Error verifying deletion:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyDeletion();
