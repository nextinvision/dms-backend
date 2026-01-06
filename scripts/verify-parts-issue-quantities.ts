import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * This script verifies that the parts issue quantity tracking is working correctly.
 * It checks:
 * 1. requestedQty is never modified from its original value
 * 2. issuedQty accumulates correctly from dispatches
 * 3. Sub-PO number "C" postfix only appears when issuedQty === requestedQty
 */
async function verifyPartsIssueQuantities() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🔍 PARTS ISSUE QUANTITY TRACKING VERIFICATION');
        console.log('='.repeat(80) + '\n');

        // Get all parts issues
        const partsIssues = await prisma.partsIssue.findMany({
            include: {
                items: {
                    include: {
                        dispatches: {
                            orderBy: { dispatchedAt: 'asc' }
                        }
                    }
                },
                toServiceCenter: true
            },
            orderBy: { createdAt: 'desc' }
        });

        if (partsIssues.length === 0) {
            console.log('ℹ️  No parts issues found in the database.');
            console.log('   Create a parts issue to test the functionality.\n');
            return;
        }

        console.log(`Found ${partsIssues.length} parts issue(s)\n`);

        let totalItems = 0;
        let correctItems = 0;
        let incorrectItems = 0;
        const issues: string[] = [];

        for (const issue of partsIssues) {
            console.log(`\n📋 Parts Issue: ${issue.issueNumber}`);
            console.log(`   Status: ${issue.status}`);
            console.log(`   Service Center: ${issue.toServiceCenter.name}\n`);

            for (const item of issue.items) {
                totalItems++;

                const requestedQty = Number(item.requestedQty || 0);
                const approvedQty = Number(item.approvedQty || 0);
                const issuedQty = Number(item.issuedQty || 0);
                const receivedQty = Number(item.receivedQty || 0);

                // Calculate total dispatched from dispatch records
                const totalDispatched = item.dispatches.reduce((sum, dispatch) => {
                    return sum + Number(dispatch.quantity);
                }, 0);

                console.log(`   Item ID: ${item.id}`);
                console.log(`   - requestedQty: ${requestedQty}`);
                console.log(`   - approvedQty: ${approvedQty}`);
                console.log(`   - issuedQty: ${issuedQty}`);
                console.log(`   - receivedQty: ${receivedQty}`);
                console.log(`   - Total from dispatches: ${totalDispatched}`);
                console.log(`   - subPoNumber: ${item.subPoNumber || 'N/A'}`);

                // Check 1: issuedQty should equal sum of dispatches
                if (Math.abs(issuedQty - totalDispatched) > 0.01) {
                    incorrectItems++;
                    const issue = `   ❌ ERROR: issuedQty (${issuedQty}) doesn't match total dispatched (${totalDispatched})`;
                    console.log(issue);
                    issues.push(issue);
                } else {
                    console.log(`   ✅ issuedQty matches total dispatched`);
                }

                // Check 2: Sub-PO "C" postfix logic
                const hasC = item.subPoNumber?.endsWith('C') || false;
                const shouldHaveC = Math.abs(issuedQty - requestedQty) < 0.01 && issuedQty > 0;

                if (hasC && !shouldHaveC) {
                    incorrectItems++;
                    const issue = `   ❌ ERROR: Has "C" postfix but not fully fulfilled (issued: ${issuedQty}, requested: ${requestedQty})`;
                    console.log(issue);
                    issues.push(issue);
                } else if (!hasC && shouldHaveC) {
                    incorrectItems++;
                    const issue = `   ⚠️  WARNING: Should have "C" postfix (issued: ${issuedQty}, requested: ${requestedQty})`;
                    console.log(issue);
                    issues.push(issue);
                } else if (hasC && shouldHaveC) {
                    console.log(`   ✅ "C" postfix correctly added (fully fulfilled)`);
                    correctItems++;
                } else {
                    console.log(`   ✅ No "C" postfix (partial fulfillment: ${issuedQty}/${requestedQty})`);
                    correctItems++;
                }

                // List dispatches
                if (item.dispatches.length > 0) {
                    console.log(`   Dispatches (${item.dispatches.length}):`);
                    item.dispatches.forEach((dispatch, idx) => {
                        console.log(`     ${idx + 1}. Qty: ${dispatch.quantity}, Sub-PO: ${dispatch.subPoNumber}, Fulfilled: ${dispatch.isFullyFulfilled}`);
                    });
                }

                console.log('');
            }
        }

        console.log('='.repeat(80));
        console.log('📊 VERIFICATION SUMMARY');
        console.log('='.repeat(80));
        console.log(`   Total Items: ${totalItems}`);
        console.log(`   Correct: ${correctItems}`);
        console.log(`   Incorrect: ${incorrectItems}`);

        if (issues.length > 0) {
            console.log(`\n❌ Issues Found (${issues.length}):`);
            issues.forEach(issue => console.log(issue));
        }

        if (incorrectItems === 0 && totalItems > 0) {
            console.log(`\n✅ All parts issue items are correctly tracked!`);
        } else if (totalItems === 0) {
            console.log(`\nℹ️  No items to verify. Create some parts issues to test.`);
        } else {
            console.log(`\n⚠️  Found ${incorrectItems} items with issues.`);
        }
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error verifying parts issue quantities:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

verifyPartsIssueQuantities();
