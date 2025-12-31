/**
 * Migration Script: Update IssueStatus Enum
 * Adds new status values: CIM_APPROVED, PENDING_ADMIN_APPROVAL, ADMIN_APPROVED
 * 
 * Usage: node scripts/update-issue-status-enum.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Updating IssueStatus enum in database...');

    try {
        // PostgreSQL doesn't support removing enum values easily, so we'll add new ones
        // First, check if new values already exist
        const checkResult = await prisma.$queryRawUnsafe(`
            SELECT unnest(enum_range(NULL::"IssueStatus"))::text as status;
        `);

        const existingStatuses = checkResult.map(r => r.status);
        console.log('Current enum values:', existingStatuses);

        // Add new enum values if they don't exist
        const newStatuses = ['CIM_APPROVED', 'PENDING_ADMIN_APPROVAL', 'ADMIN_APPROVED'];
        
        for (const status of newStatuses) {
            if (!existingStatuses.includes(status)) {
                await prisma.$executeRawUnsafe(`
                    ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS '${status}';
                `);
                console.log(`✅ Added enum value: ${status}`);
            } else {
                console.log(`ℹ️  Enum value already exists: ${status}`);
            }
        }

        // Update any existing APPROVED statuses to CIM_APPROVED (if needed)
        // This is optional - you may want to keep existing APPROVED as is
        // Uncomment if you want to migrate existing data:
        /*
        const updateCount = await prisma.$executeRawUnsafe(`
            UPDATE "PartsIssue" 
            SET status = 'CIM_APPROVED' 
            WHERE status = 'APPROVED' AND "dispatchedDate" IS NULL;
        `);
        console.log(`✅ Updated ${updateCount} records from APPROVED to CIM_APPROVED`);
        */

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 IssueStatus enum has been updated with new values.');

    } catch (error) {
        console.error('❌ Error updating enum:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

