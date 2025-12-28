import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicatePhones() {
    console.log('🔍 Checking for duplicate phone numbers...');

    // Find all customers grouped by phone
    const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
    });

    // Group by phone
    const phoneGroups = new Map<string, any[]>();
    customers.forEach((customer) => {
        if (!phoneGroups.has(customer.phone)) {
            phoneGroups.set(customer.phone, []);
        }
        phoneGroups.get(customer.phone)!.push(customer);
    });

    // Find duplicates
    const duplicates = Array.from(phoneGroups.entries()).filter(
        ([phone, customers]) => customers.length > 1
    );

    if (duplicates.length === 0) {
        console.log('✅ No duplicate phone numbers found!');
        return;
    }

    console.log(`⚠️  Found ${duplicates.length} phone numbers with duplicates:`);

    for (const [phone, customers] of duplicates) {
        console.log(`\n📞 Phone: ${phone} (${customers.length} customers)`);
        customers.forEach((c, idx) => {
            console.log(`  ${idx + 1}. ${c.name} (${c.customerNumber}) - Created: ${c.createdAt}`);
        });

        // Keep the oldest (first created), soft delete the rest
        const [keep, ...toDelete] = customers;

        console.log(`  ⇒ Keeping: ${keep.name} (${keep.customerNumber})`);
        console.log(`  ⇒ Soft deleting ${toDelete.length} duplicate(s)`);

        for (const customer of toDelete) {
            await prisma.customer.update({
                where: { id: customer.id },
                data: {
                    deletedAt: new Date(),
                    // Optionally add a suffix to phone to avoid future conflicts
                    phone: `${customer.phone}_DELETED_${customer.id.substring(0, 8)}`
                },
            });
            console.log(`    ✓ Deleted: ${customer.name} (${customer.customerNumber})`);
        }
    }

    console.log('\n✅ Cleanup complete! You can now run: npx prisma migrate dev --name make-phone-unique');
}

cleanupDuplicatePhones()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
