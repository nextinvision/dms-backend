/**
 * Manual Database Migration Script
 * Run this if Prisma migrate is not working
 * 
 * Usage: node scripts/add-part2-column.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Adding part2 column to JobCard table...');

    try {
        // Add the part2 column if it doesn't exist
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "JobCard" 
            ADD COLUMN IF NOT EXISTS "part2" JSONB;
        `);

        console.log('✅ Successfully added part2 column to JobCard table!');
        console.log('📝 The column can now store Part 2 items (parts and work items)');

        // Verify the column was added
        const result = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'JobCard' AND column_name = 'part2';
        `);

        if (result && result.length > 0) {
            console.log('✅ Verification successful - part2 column exists!');
            console.log(result);
        } else {
            console.log('⚠️  Warning: Could not verify column exists');
        }

    } catch (error) {
        console.error('❌ Error adding column:', error);
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
