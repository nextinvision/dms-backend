import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Applying invoiceType migration...');
    
    try {
        // Read the migration SQL file
        const migrationPath = join(__dirname, '../prisma/migrations/20250101120000_add_invoice_type/migration.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');
        
        // Execute the migration
        await prisma.$executeRawUnsafe(migrationSQL);
        
        console.log('✅ Migration applied successfully!');
        console.log('📝 The invoiceType column and enum have been added to the Invoice table.');
    } catch (error: any) {
        console.error('❌ Error applying migration:', error.message);
        
        // If it's a duplicate error, that's okay - the migration was already applied
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log('ℹ️  Migration appears to already be applied. This is fine.');
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

