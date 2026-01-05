import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Applying PartsIssueItem fix...');
    
    try {
        // Execute SQL statements one by one
        console.log('Adding issuedQty column...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "PartsIssueItem" ADD COLUMN IF NOT EXISTS "issuedQty" INTEGER NOT NULL DEFAULT 0;
        `);
        
        console.log('Adding subPoNumber column...');
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "PartsIssueItem" ADD COLUMN IF NOT EXISTS "subPoNumber" TEXT;
        `);
        
        console.log('Creating PartsIssueDispatch table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PartsIssueDispatch" (
                "id" TEXT NOT NULL,
                "issueItemId" TEXT NOT NULL,
                "issueId" TEXT NOT NULL,
                "quantity" INTEGER NOT NULL,
                "subPoNumber" TEXT NOT NULL,
                "isFullyFulfilled" BOOLEAN NOT NULL DEFAULT false,
                "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "dispatchedById" TEXT,
                "transportDetails" JSONB,
                CONSTRAINT "PartsIssueDispatch_pkey" PRIMARY KEY ("id")
            );
        `);
        
        console.log('Creating indexes...');
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "PartsIssueDispatch_issueItemId_idx" ON "PartsIssueDispatch"("issueItemId");
        `);
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "PartsIssueDispatch_issueId_idx" ON "PartsIssueDispatch"("issueId");
        `);
        
        console.log('Adding foreign keys...');
        // Add foreign keys using DO block
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PartsIssueDispatch_issueItemId_fkey') THEN
                    ALTER TABLE "PartsIssueDispatch" ADD CONSTRAINT "PartsIssueDispatch_issueItemId_fkey" 
                    FOREIGN KEY ("issueItemId") REFERENCES "PartsIssueItem"("id") ON DELETE CASCADE;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PartsIssueDispatch_issueId_fkey') THEN
                    ALTER TABLE "PartsIssueDispatch" ADD CONSTRAINT "PartsIssueDispatch_issueId_fkey" 
                    FOREIGN KEY ("issueId") REFERENCES "PartsIssue"("id") ON DELETE CASCADE;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PartsIssueDispatch_dispatchedById_fkey') THEN
                    ALTER TABLE "PartsIssueDispatch" ADD CONSTRAINT "PartsIssueDispatch_dispatchedById_fkey" 
                    FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);
        
        console.log('✅ Fix applied successfully!');
        console.log('📝 The issuedQty and subPoNumber columns have been added to PartsIssueItem table.');
        console.log('📝 The PartsIssueDispatch table has been created.');
        
        // Verify the column was added
        const result = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'PartsIssueItem' AND column_name = 'issuedQty';
        `);

        if (result && Array.isArray(result) && result.length > 0) {
            console.log('✅ Verification successful - issuedQty column exists!');
        } else {
            console.log('⚠️  Warning: Could not verify column exists');
        }
        
    } catch (error: any) {
        console.error('❌ Error applying fix:', error.message);
        
        // If it's a duplicate/already exists error, that's okay
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('IF NOT EXISTS')) {
            console.log('ℹ️  Some parts of the fix appear to already be applied. This is fine.');
        } else {
            throw error;
        }
    } finally {
        await prisma.$disconnect();
    }
}

main()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

