/**
 * Fix inventoryPartId columns to be nullable
 * This script ensures that inventoryPartId columns in JobCardItem and PartsRequestItem
 * are nullable to match the Prisma schema
 * 
 * Usage: node scripts/fix-inventory-part-id-nullable.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('🔧 Fixing inventoryPartId columns to be nullable...');

        // Fix JobCardItem.inventoryPartId
        console.log('Checking JobCardItem.inventoryPartId...');
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'JobCardItem' 
                    AND column_name = 'inventoryPartId' 
                    AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE "JobCardItem" ALTER COLUMN "inventoryPartId" DROP NOT NULL;
                    RAISE NOTICE 'Made JobCardItem.inventoryPartId nullable';
                ELSE
                    RAISE NOTICE 'JobCardItem.inventoryPartId is already nullable';
                END IF;
            END $$;
        `);
        console.log('✅ Fixed JobCardItem.inventoryPartId');

        // Fix PartsRequestItem.inventoryPartId
        console.log('Checking PartsRequestItem.inventoryPartId...');
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'PartsRequestItem' 
                    AND column_name = 'inventoryPartId' 
                    AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE "PartsRequestItem" ALTER COLUMN "inventoryPartId" DROP NOT NULL;
                    RAISE NOTICE 'Made PartsRequestItem.inventoryPartId nullable';
                ELSE
                    RAISE NOTICE 'PartsRequestItem.inventoryPartId is already nullable';
                END IF;
            END $$;
        `);
        console.log('✅ Fixed PartsRequestItem.inventoryPartId');

        console.log('✅ All inventoryPartId columns are now nullable!');
        console.log('⚠️  Note: You may need to regenerate Prisma client: npx prisma generate');
        
    } catch (error) {
        console.error('❌ Error fixing schema:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

