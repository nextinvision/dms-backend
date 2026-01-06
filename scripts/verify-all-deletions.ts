import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllDeletions() {
    try {
        console.log('\n📊 Verification Results:\n');

        const poCount = await prisma.purchaseOrder.count();
        const poItemCount = await prisma.pOItem.count();
        const partsIssueWithPOCount = await prisma.partsIssue.count({
            where: { purchaseOrderId: { not: null } }
        });
        const totalPartsIssuesCount = await prisma.partsIssue.count();
        const partsIssueItemCount = await prisma.partsIssueItem.count();
        const partsIssueDispatchCount = await prisma.partsIssueDispatch.count();

        console.log(`   Purchase Orders: ${poCount}`);
        console.log(`   Purchase Order Items: ${poItemCount}`);
        console.log(`   Parts Issues (linked to PO): ${partsIssueWithPOCount}`);
        console.log(`   Total Parts Issues: ${totalPartsIssuesCount}`);
        console.log(`   Parts Issue Items: ${partsIssueItemCount}`);
        console.log(`   Parts Issue Dispatches: ${partsIssueDispatchCount}`);

        console.log('\n' + '='.repeat(50));

        if (poCount === 0 && poItemCount === 0 && partsIssueWithPOCount === 0) {
            console.log('✅ SUCCESS: All purchase order related data deleted!');
        } else {
            console.log('⚠️  WARNING: Some purchase order related records remain!');
        }

        console.log('='.repeat(50) + '\n');
    } catch (error) {
        console.error('❌ Error verifying deletion:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAllDeletions();
