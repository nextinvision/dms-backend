import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Super Admin user
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash('admin123', saltRounds);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@dms.com' },
    update: {},
    create: {
      email: 'admin@dms.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Created Super Admin:', superAdmin.email);

  // Create a sample Service Center
  const serviceCenter = await prisma.serviceCenter.upsert({
    where: { code: 'SC001' },
    update: {},
    create: {
      name: 'Main Service Center',
      code: 'SC001',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91-1234567890',
      email: 'sc001@dms.com',
      status: 'ACTIVE',
      capacity: 50,
      technicianCount: 10,
      serviceRadius: 25.0,
      homeServiceEnabled: true,
      invoicePrefix: 'SC001-INV-',
      gstNumber: '27AAAAA0000A1Z5',
      serviceTypes: ['Routine Maintenance', 'Repair', 'Inspection'],
      createdBy: superAdmin.id,
    },
  });

  console.log('Created Service Center:', serviceCenter.name);

  // Create sample parts
  const parts = [
    {
      sku: 'PART001',
      name: 'Engine Oil Filter',
      category: 'Filters',
      manufacturer: 'ABC Motors',
      unitPrice: 500.0,
      supplier: 'XYZ Suppliers',
      reorderLevel: 10,
    },
    {
      sku: 'PART002',
      name: 'Brake Pads',
      category: 'Brakes',
      manufacturer: 'DEF Brakes',
      unitPrice: 1500.0,
      supplier: 'XYZ Suppliers',
      reorderLevel: 5,
    },
    {
      sku: 'PART003',
      name: 'Air Filter',
      category: 'Filters',
      manufacturer: 'ABC Motors',
      unitPrice: 300.0,
      supplier: 'XYZ Suppliers',
      reorderLevel: 15,
    },
  ];

  for (const part of parts) {
    await prisma.part.upsert({
      where: { sku: part.sku },
      update: {},
      create: part,
    });
    console.log(`Created part: ${part.name}`);
  }

  // Create inventory for service center
  const createdParts = await prisma.part.findMany();
  for (const part of createdParts) {
    await prisma.inventory.upsert({
      where: {
        serviceCenterId_partId: {
          serviceCenterId: serviceCenter.id,
          partId: part.id,
        },
      },
      update: {},
      create: {
        serviceCenterId: serviceCenter.id,
        partId: part.id,
        quantity: 20,
        minLevel: 10,
        maxLevel: 100,
      },
    });
  }

  console.log('Created inventory items');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

