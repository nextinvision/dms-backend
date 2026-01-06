import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllPartsIssueData() {
    try {
        console.log('🗑️  Starting deletion of ALL parts issue data...\n');

        // Step 1: Delete ALL PartsIssueDispatch records
        const deletedDispatches = await prisma.partsIssueDispatch.deleteMany({});
        console.log(`✅ Deleted ${deletedDispatches.count} parts issue dispatch records`);

        // Step 2: Delete ALL PartsIssueItem records
        const deletedIssueItems = await prisma.partsIssueItem.deleteMany({});
        console.log(`✅ Deleted ${deletedIssueItems.count} parts issue item records`);

        // Step 3: Delete ALL PartsIssue records
        const deletedPartsIssues = await prisma.partsIssue.deleteMany({});
        console.log(`✅ Deleted ${deletedPartsIssues.count} parts issue records`);

        console.log('\n✨ All parts issue related data has been successfully deleted!');
        console.log('\n📊 Summary:');
        console.log('   - Parts Issues: Emptied');
        console.log('   - Parts Issue Items: Emptied');
        console.log('   - Parts Issue Dispatches: Emptied');

    } catch (error) {
        console.error('❌ Error deleting parts issue data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllPartsIssueData();
