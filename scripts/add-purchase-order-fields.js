/**
 * Manual Database Migration Script
 * Adds service center inventory fields to PurchaseOrder and POItem tables
 * 
 * Usage: node scripts/add-purchase-order-fields.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Adding service center inventory fields to PurchaseOrder and POItem tables...');

    try {
        // Add columns to PurchaseOrder
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "PurchaseOrder" 
            ADD COLUMN IF NOT EXISTS "fromServiceCenterId" TEXT,
            ADD COLUMN IF NOT EXISTS "requestedById" TEXT,
            ADD COLUMN IF NOT EXISTS "orderNotes" TEXT;
        `);
        console.log('✅ Added columns to PurchaseOrder table');

        // Make supplierId optional
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'PurchaseOrder' 
                    AND column_name = 'supplierId' 
                    AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE "PurchaseOrder" ALTER COLUMN "supplierId" DROP NOT NULL;
                END IF;
            END $$;
        `);
        console.log('✅ Made supplierId optional');

        // Add foreign key constraints for PurchaseOrder
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_fromServiceCenterId_fkey'
                ) THEN
                    ALTER TABLE "PurchaseOrder" 
                    ADD CONSTRAINT "PurchaseOrder_fromServiceCenterId_fkey" 
                    FOREIGN KEY ("fromServiceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrder_requestedById_fkey'
                ) THEN
                    ALTER TABLE "PurchaseOrder" 
                    ADD CONSTRAINT "PurchaseOrder_requestedById_fkey" 
                    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ Added foreign key constraints to PurchaseOrder');

        // Create index for fromServiceCenterId
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "PurchaseOrder_fromServiceCenterId_idx" ON "PurchaseOrder"("fromServiceCenterId");
        `);
        console.log('✅ Created index on fromServiceCenterId');

        // Add columns to POItem
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "POItem" 
            ADD COLUMN IF NOT EXISTS "inventoryPartId" TEXT,
            ADD COLUMN IF NOT EXISTS "partName" TEXT,
            ADD COLUMN IF NOT EXISTS "urgency" TEXT,
            ADD COLUMN IF NOT EXISTS "notes" TEXT;
        `);
        console.log('✅ Added columns to POItem table');

        // Make centralInventoryPartId optional
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'POItem' 
                    AND column_name = 'centralInventoryPartId' 
                    AND is_nullable = 'NO'
                ) THEN
                    ALTER TABLE "POItem" ALTER COLUMN "centralInventoryPartId" DROP NOT NULL;
                END IF;
            END $$;
        `);
        console.log('✅ Made centralInventoryPartId optional');

        // Add foreign key constraint for inventoryPartId
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'POItem_inventoryPartId_fkey'
                ) THEN
                    ALTER TABLE "POItem" 
                    ADD CONSTRAINT "POItem_inventoryPartId_fkey" 
                    FOREIGN KEY ("inventoryPartId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ Added foreign key constraint to POItem');

        // Create index for inventoryPartId
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "POItem_inventoryPartId_idx" ON "POItem"("inventoryPartId");
        `);
        console.log('✅ Created index on inventoryPartId');

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 All required columns and constraints have been added.');

    } catch (error) {
        console.error('❌ Error running migration:', error);
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

