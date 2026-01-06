import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showPurchaseOrderDetails() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('📦 YOUR PURCHASE ORDERS');
        console.log('='.repeat(80) + '\n');

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            include: {
                items: true,
                fromServiceCenter: {
                    select: { name: true, code: true }
                },
                supplier: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (purchaseOrders.length === 0) {
            console.log('❌ No Purchase Orders found.');
            console.log('   Create a Purchase Order first, then create a Parts Issue from it.\n');
            return;
        }

        for (const po of purchaseOrders) {
            console.log(`📋 PO Number: ${po.poNumber}`);
            console.log(`   ID: ${po.id}`);
            console.log(`   Status: ${po.status}`);
            console.log(`   Created: ${po.orderDate}`);

            if (po.fromServiceCenter) {
                console.log(`   Service Center: ${po.fromServiceCenter.name} (${po.fromServiceCenter.code})`);
            }

            if (po.supplier) {
                console.log(`   Supplier: ${po.supplier.name}`);
            }

            console.log(`   Total Amount: ₹${po.totalAmount}`);
            console.log(`\n   Items (${po.items.length}):`);

            for (const item of po.items) {
                // Get central inventory part details
                let partInfo = 'Unknown Part';
                if (item.centralInventoryPartId) {
                    const centralPart = await prisma.centralInventory.findUnique({
                        where: { id: item.centralInventoryPartId },
                        select: { partName: true, partNumber: true }
                    });
                    if (centralPart) {
                        partInfo = `${centralPart.partName} (${centralPart.partNumber || 'N/A'})`;
                    }
                } else if (item.partName) {
                    partInfo = `${item.partName} (${item.partNumber || 'N/A'})`;
                }

                console.log(`      • ${partInfo}`);
                console.log(`        Quantity: ${item.quantity} (what SIM requested)`);
                console.log(`        Received: ${item.receivedQty}`);
                console.log(`        Unit Price: ₹${item.unitPrice}`);
            }

            console.log('\n' + '-'.repeat(80) + '\n');
        }

        console.log('='.repeat(80));
        console.log('📝 HOW TO CREATE A LINKED PARTS ISSUE');
        console.log('='.repeat(80));
        console.log('\n1. Go to Central Inventory → Parts Issue section');
        console.log('2. Click "Create Parts Issue"');
        console.log('3. IMPORTANT: Select the Purchase Order from the dropdown');
        console.log('4. Add the parts you want to issue');
        console.log('5. The requestedQty will be AUTO-FILLED from the PO quantity');
        console.log('6. You can approve/dispatch any amount ≤ requestedQty');
        console.log('\nResult:');
        console.log('  • requestedQty = PO quantity (what SIM originally requested)');
        console.log('  • issuedQty = what you actually dispatch');
        console.log('  • "C" postfix only appears when issuedQty = requestedQty\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

showPurchaseOrderDetails();
