/**
 * Migration Script: Add HomeService Model
 * This script creates the HomeService table and enum type in the database
 * 
 * Usage: node scripts/add-home-service-migration.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Starting HomeService migration...');

    try {
        // Step 1: Create the HomeServiceStatus enum
        console.log('Creating HomeServiceStatus enum...');
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HomeServiceStatus') THEN
                    CREATE TYPE "HomeServiceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
                ELSE
                    RAISE NOTICE 'HomeServiceStatus enum already exists';
                END IF;
            END $$;
        `);
        console.log('✅ HomeServiceStatus enum created');

        // Step 2: Create HomeService table
        console.log('Creating HomeService table...');
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "HomeService" (
                "id" TEXT NOT NULL,
                "serviceNumber" TEXT NOT NULL,
                "serviceCenterId" TEXT NOT NULL,
                "customerId" TEXT,
                "customerName" TEXT NOT NULL,
                "phone" TEXT NOT NULL,
                "vehicleId" TEXT,
                "vehicleModel" TEXT NOT NULL,
                "registration" TEXT NOT NULL,
                "serviceAddress" TEXT NOT NULL,
                "serviceType" TEXT NOT NULL,
                "scheduledDate" TIMESTAMP(3) NOT NULL,
                "scheduledTime" TEXT NOT NULL,
                "estimatedCost" DECIMAL(65,30) NOT NULL,
                "assignedEngineerId" TEXT,
                "status" "HomeServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
                "startTime" TIMESTAMP(3),
                "completedAt" TIMESTAMP(3),
                "createdById" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,

                CONSTRAINT "HomeService_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✅ HomeService table created');

        // Step 3: Create unique constraint on serviceNumber
        console.log('Creating unique constraint on serviceNumber...');
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'HomeService_serviceNumber_key'
                ) THEN
                    ALTER TABLE "HomeService" 
                    ADD CONSTRAINT "HomeService_serviceNumber_key" UNIQUE ("serviceNumber");
                END IF;
            END $$;
        `);
        console.log('✅ Unique constraint on serviceNumber created');

        // Step 4: Create foreign key constraints
        console.log('Creating foreign key constraints...');
        
        // ServiceCenter foreign key
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'HomeService_serviceCenterId_fkey'
                ) THEN
                    ALTER TABLE "HomeService" 
                    ADD CONSTRAINT "HomeService_serviceCenterId_fkey" 
                    FOREIGN KEY ("serviceCenterId") REFERENCES "ServiceCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ ServiceCenter foreign key created');

        // Customer foreign key
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'HomeService_customerId_fkey'
                ) THEN
                    ALTER TABLE "HomeService" 
                    ADD CONSTRAINT "HomeService_customerId_fkey" 
                    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ Customer foreign key created');

        // Vehicle foreign key
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'HomeService_vehicleId_fkey'
                ) THEN
                    ALTER TABLE "HomeService" 
                    ADD CONSTRAINT "HomeService_vehicleId_fkey" 
                    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ Vehicle foreign key created');

        // Assigned Engineer foreign key
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'HomeService_assignedEngineerId_fkey'
                ) THEN
                    ALTER TABLE "HomeService" 
                    ADD CONSTRAINT "HomeService_assignedEngineerId_fkey" 
                    FOREIGN KEY ("assignedEngineerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ Assigned Engineer foreign key created');

        // Created By foreign key
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'HomeService_createdById_fkey'
                ) THEN
                    ALTER TABLE "HomeService" 
                    ADD CONSTRAINT "HomeService_createdById_fkey" 
                    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
        console.log('✅ Created By foreign key created');

        // Step 5: Create indexes
        console.log('Creating indexes...');
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeService_serviceCenterId_idx" ON "HomeService"("serviceCenterId");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeService_customerId_idx" ON "HomeService"("customerId");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeService_vehicleId_idx" ON "HomeService"("vehicleId");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeService_assignedEngineerId_idx" ON "HomeService"("assignedEngineerId");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeService_status_idx" ON "HomeService"("status");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "HomeService_scheduledDate_idx" ON "HomeService"("scheduledDate");`);
        console.log('✅ Indexes created');

        console.log('✅ HomeService migration completed successfully!');
        console.log('⚠️  Note: You may need to regenerate Prisma client: npx prisma generate');
        
    } catch (error) {
        console.error('❌ Error during migration:', error);
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

