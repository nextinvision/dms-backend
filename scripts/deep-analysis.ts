import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepAnalysis() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔬 DEEP ANALYSIS - PARTS ISSUE & PURCHASE ORDER');
        console.log('='.repeat(80) + '\n');

        // Get all Parts Issues
        const allPI = await prisma.partsIssue.findMany({
            include: {
                items: true,
                purchaseOrder: {
                    include: { items: true }
                },
                toServiceCenter: { select: { name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`📊 Total Parts Issues in database: ${allPI.length}\n`);

        if (allPI.length === 0) {
            console.log('❌ No Parts Issues found. Please create one first.\n');
            return;
        }

        for (let i = 0; i < allPI.length; i++) {
            const pi = allPI[i];
            console.log(`\n${'='.repeat(80)}`);
            console.log(`PARTS ISSUE #${i + 1}: ${pi.issueNumber}`);
            console.log('='.repeat(80));
            console.log(`Created: ${pi.createdAt}`);
            console.log(`Status: ${pi.status}`);
            console.log(`Service Center: ${pi.toServiceCenter.name}`);
            console.log(`Purchase Order ID: ${pi.purchaseOrderId || '❌ NOT LINKED'}`);

            if (pi.purchaseOrder) {
                console.log(`Purchase Order Number: ${pi.purchaseOrder.poNumber}\n`);
                console.log('✅ THIS PARTS ISSUE IS LINKED TO A PURCHASE ORDER');
            } else {
                console.log('\n❌ THIS PARTS ISSUE IS NOT LINKED TO ANY PURCHASE ORDER!');
                console.log('   This is why the fix didn\'t work - no PO to pull quantities from.\n');
            }

            console.log(`\nItems in this Parts Issue: ${pi.items.length}`);

            for (const item of pi.items) {
                const centralPart = await prisma.centralInventory.findUnique({
                    where: { id: item.centralInventoryPartId },
                    select: { partName: true, partNumber: true }
                });

                console.log(`\n   📦 ${centralPart?.partName || 'Unknown Part'}`);
                console.log(`      Part Number: ${centralPart?.partNumber || 'N/A'}`);
                console.log(`      Central Inventory ID: ${item.centralInventoryPartId}`);
                console.log(`\n      PartsIssueItem values:`);
                console.log(`         requestedQty: ${item.requestedQty}`);
                console.log(`         approvedQty: ${item.approvedQty}`);
                console.log(`         issuedQty: ${item.issuedQty}`);

                if (pi.purchaseOrder) {
                    const matchingPOItem = pi.purchaseOrder.items.find(poItem =>
                        poItem.centralInventoryPartId === item.centralInventoryPartId
                    );

                    if (matchingPOItem) {
                        console.log(`\n      Purchase Order Item:`);
                        console.log(`         Quantity: ${matchingPOItem.quantity} ← This should be requestedQty`);
                        console.log(`         ReceivedQty: ${matchingPOItem.receivedQty}`);

                        console.log(`\n      🔍 ANALYSIS:`);
                        if (Number(item.requestedQty) === Number(matchingPOItem.quantity)) {
                            console.log(`         ✅ CORRECT: requestedQty matches PO quantity`);
                        } else {
                            console.log(`         ❌ BUG FOUND: requestedQty (${item.requestedQty}) ≠ PO quantity (${matchingPOItem.quantity})`);
                            console.log(`         Expected: ${matchingPOItem.quantity}`);
                            console.log(`         Got: ${item.requestedQty}`);
                            console.log(`         ⚠️  The backend fix did NOT run properly!`);
                        }

                        if (Number(item.requestedQty) === Number(item.approvedQty) &&
                            Number(item.approvedQty) === Number(item.issuedQty)) {
                            console.log(`         ⚠️  All three quantities are equal - looks like old buggy data`);
                        }
                    } else {
                        console.log(`\n      ⚠️  No matching PO item found`);
                    }
                }
            }
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log('📋 SUMMARY & RECOMMENDATIONS');
        console.log('='.repeat(80));

        const linkedCount = allPI.filter(pi => pi.purchaseOrderId !== null).length;
        const unlinkedCount = allPI.length - linkedCount;

        console.log(`\nParts Issues linked to PO: ${linkedCount}`);
        console.log(`Parts Issues NOT linked to PO: ${unlinkedCount}`);

        if (unlinkedCount > 0) {
            console.log(`\n❌ Problem: You have ${unlinkedCount} Parts Issue(s) not linked to PO`);
            console.log('   Solution: Delete these and create new ones WITH PO link');
        }

        if (linkedCount > 0) {
            const hasWrongQty = allPI.some(pi => {
                if (!pi.purchaseOrder) return false;
                return pi.items.some(item => {
                    const poItem = pi.purchaseOrder!.items.find(p =>
                        p.centralInventoryPartId === item.centralInventoryPartId
                    );
                    return poItem && Number(item.requestedQty) !== Number(poItem.quantity);
                });
            });

            if (hasWrongQty) {
                console.log(`\n❌ BUG: Even linked Parts Issues have wrong requestedQty!`);
                console.log('   This means the backend fix is not working.');
                console.log('   Need to check backend logs and code.');
            }
        }

        console.log(`\n${'='.repeat(80)}\n`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deepAnalysis();
