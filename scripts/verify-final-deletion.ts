import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFinalDeletion() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('📊 FINAL VERIFICATION - ALL TABLES STATUS');
        console.log('='.repeat(60) + '\n');

        const poCount = await prisma.purchaseOrder.count();
        const poItemCount = await prisma.pOItem.count();
        const partsIssueCount = await prisma.partsIssue.count();
        const partsIssueItemCount = await prisma.partsIssueItem.count();
        const partsIssueDispatchCount = await prisma.partsIssueDispatch.count();

        console.log('Purchase Order Related Tables:');
        console.log(`   ├─ Purchase Orders: ${poCount} records`);
        console.log(`   └─ Purchase Order Items: ${poItemCount} records\n`);

        console.log('Parts Issue Related Tables:');
        console.log(`   ├─ Parts Issues: ${partsIssueCount} records`);
        console.log(`   ├─ Parts Issue Items: ${partsIssueItemCount} records`);
        console.log(`   └─ Parts Issue Dispatches: ${partsIssueDispatchCount} records`);

        console.log('\n' + '='.repeat(60));

        const totalRecords = poCount + poItemCount + partsIssueCount +
            partsIssueItemCount + partsIssueDispatchCount;

        if (totalRecords === 0) {
            console.log('✅ SUCCESS: ALL TABLES ARE COMPLETELY EMPTY!');
        } else {
            console.log(`⚠️  WARNING: ${totalRecords} records still remain!`);
        }

        console.log('='.repeat(60) + '\n');
    } catch (error) {
        console.error('❌ Error verifying deletion:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyFinalDeletion();
