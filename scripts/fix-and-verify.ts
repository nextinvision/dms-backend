import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAndVerify() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 FIXING PARTS ISSUE REQUESTED QUANTITIES');
        console.log('='.repeat(80) + '\n');

        // Get all Parts Issues with PO links
        const issues = await prisma.partsIssue.findMany({
            where: { purchaseOrderId: { not: null } },
            include: {
                items: true,
                purchaseOrder: {
                    include: { items: true }
                }
            }
        });

        if (issues.length === 0) {
            console.log('ℹ️  No Parts Issues linked to Purchase Orders found.\n');

            // Check for Parts Issues WITHOUT PO links
            const unlinkedIssues = await prisma.partsIssue.findMany({
                include: { items: true }
            });

            if (unlinkedIssues.length > 0) {
                console.log(`⚠️  Found ${unlinkedIssues.length} Parts Issue(s) NOT linked to any Purchase Order:`);
                for (const issue of unlinkedIssues) {
                    console.log(`   - ${issue.issueNumber}: Has ${issue.items.length} items`);
                    for (const item of issue.items) {
                        const part = await prisma.centralInventory.findUnique({
                            where: { id: item.centralInventoryPartId },
                            select: { partName: true }
                        });
                        console.log(`     • ${part?.partName || 'Unknown'}: requestedQty=${item.requestedQty}`);
                    }
                }
                console.log('\n❌ These Parts Issues cannot be auto-fixed because they have no PO link.');
                console.log('   Solution: Delete them and create new ones WITH Purchase Order links.\n');
            }
            return;
        }

        console.log(`Found ${issues.length} Parts Issue(s) linked to Purchase Orders\n`);

        let fixedCount = 0;

        for (const issue of issues) {
            console.log(`📋 Parts Issue: ${issue.issueNumber}`);
            console.log(`   PO: ${issue.purchaseOrder?.poNumber || 'N/A'}\n`);

            for (const item of issue.items) {
                const part = await prisma.centralInventory.findUnique({
                    where: { id: item.centralInventoryPartId },
                    select: { partName: true, partNumber: true }
                });

                const partName = part?.partName || 'Unknown';

                // Find matching PO item
                const poItem = issue.purchaseOrder?.items.find(p =>
                    p.centralInventoryPartId === item.centralInventoryPartId
                );

                if (!poItem) {
                    console.log(`   ⚠️  ${partName}: No matching PO item found\n`);
                    continue;
                }

                const currentRequestedQty = Number(item.requestedQty);
                const correctQty = Number(poItem.quantity);

                console.log(`   📦 ${partName}`);
                console.log(`      Current requestedQty: ${currentRequestedQty}`);
                console.log(`      PO Quantity: ${correctQty}`);

                if (currentRequestedQty !== correctQty) {
                    console.log(`      ❌ INCORRECT - Fixing...`);

                    await prisma.partsIssueItem.update({
                        where: { id: item.id },
                        data: { requestedQty: correctQty }
                    });

                    console.log(`      ✅ Updated to ${correctQty}\n`);
                    fixedCount++;
                } else {
                    console.log(`      ✅ Already correct\n`);
                }
            }
        }

        console.log('='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Fixed: ${fixedCount} item(s)`);

        if (fixedCount > 0) {
            console.log('\n✅ Database has been corrected!');
            console.log('   Refresh the frontend to see the updated values.\n');
        } else {
            console.log('\n✅ All items already have correct requestedQty!\n');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAndVerify();
