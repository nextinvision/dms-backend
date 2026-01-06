import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDataStatus() {
    try {
        const poCount = await prisma.purchaseOrder.count();
        const piCount = await prisma.partsIssue.count();

        console.log('\n📊 Database Status:');
        console.log(`   Purchase Orders: ${poCount}`);
        console.log(`   Parts Issues: ${piCount}\n`);

        if (piCount === 0) {
            console.log('ℹ️  No Parts Issues found.');
            console.log('   The database was cleared. Please create a NEW Parts Issue');
            console.log('   from a Purchase Order to test the fix.\n');
        } else {
            // Get latest parts issue
            const latest = await prisma.partsIssue.findFirst({
                orderBy: { createdAt: 'desc' },
                select: {
                    issueNumber: true,
                    createdAt: true,
                    purchaseOrderId: true
                }
            });

            console.log(`📋 Latest Parts Issue: ${latest?.issueNumber}`);
            console.log(`   Created: ${latest?.createdAt}`);
            console.log(`   Linked to PO: ${latest?.purchaseOrderId ? 'Yes' : 'No'}\n`);

            const fixAppliedTime = new Date('2026-01-06T16:54:00+05:30'); // Approximate time when fix was applied

            if (latest && latest.createdAt < fixAppliedTime) {
                console.log('⚠️  WARNING: This Parts Issue was created BEFORE the fix!');
                console.log('   Please create a NEW Parts Issue to test the fixed code.\n');
            } else {
                console.log('✅ This Parts Issue was created after the fix was applied.');
                console.log('   Running detailed check...\n');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDataStatus();
