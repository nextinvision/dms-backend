/**
 * Migration Script: Add Full Part Data Fields to POItem
 * Adds all part information fields to POItem table
 * 
 * Usage: node scripts/add-poitem-fields.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Adding full part data fields to POItem table...');

    try {
        // Add new columns to POItem table
        const alterStatements = [
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "partNumber" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "oemPartNumber" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "category" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "originType" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "description" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "brandName" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "variant" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "partType" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "color" TEXT;`,
            `ALTER TABLE "POItem" ADD COLUMN IF NOT EXISTS "unit" TEXT;`,
        ];

        for (const statement of alterStatements) {
            await prisma.$executeRawUnsafe(statement);
            console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
        }

        // Populate existing records with data from inventory parts
        console.log('\n📝 Populating existing POItem records with inventory part data...');
        const updateResult = await prisma.$executeRawUnsafe(`
            UPDATE "POItem" poi
            SET 
                "partNumber" = COALESCE(poi."partNumber", inv."partNumber"),
                "oemPartNumber" = COALESCE(poi."oemPartNumber", inv."oemPartNumber"),
                "category" = COALESCE(poi."category", inv."category"),
                "originType" = COALESCE(poi."originType", inv."originType"),
                "description" = COALESCE(poi."description", inv."description"),
                "brandName" = COALESCE(poi."brandName", inv."brandName"),
                "variant" = COALESCE(poi."variant", inv."variant"),
                "partType" = COALESCE(poi."partType", inv."partType"),
                "color" = COALESCE(poi."color", inv."color"),
                "unit" = COALESCE(poi."unit", inv."unit")
            FROM "Inventory" inv
            WHERE poi."inventoryPartId" = inv."id"
            AND poi."inventoryPartId" IS NOT NULL;
        `);
        console.log(`✅ Updated ${updateResult} existing POItem records`);

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 POItem table now includes all part information fields.');

    } catch (error) {
        console.error('❌ Error updating POItem table:', error);
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

