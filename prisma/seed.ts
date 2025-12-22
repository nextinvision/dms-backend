import { PrismaClient, UserRole, JobCardStatus, AppointmentStatus, AppointmentLocation, VehicleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed starting...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 1. Service Centers
  const sc1 = await prisma.serviceCenter.upsert({
    where: { code: 'SC001' },
    update: {},
    create: {
      name: 'Main Metro Service Center',
      code: 'SC001',
      address: '123 Metro Plaza, Mumbai',
      phone: '022-1234567',
      email: 'mumbai@dms.com',
      city: 'Mumbai',
      state: 'Maharashtra'
    },
  });

  await prisma.serviceCenter.upsert({
    where: { code: 'SC002' },
    update: {},
    create: {
      name: 'South Zone Service Hub',
      code: 'SC002',
      address: '45 Tech Road, Bangalore',
      phone: '080-7654321',
      email: 'bangalore@dms.com',
      city: 'Bangalore',
      state: 'Karnataka'
    },
  });

  // 2. Users
  await prisma.user.upsert({
    where: { email: 'admin@dms.com' },
    update: {},
    create: {
      email: 'admin@dms.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: UserRole.admin,
      phone: '9999999999'
    },
  });

  const scManager = await prisma.user.upsert({
    where: { email: 'manager@sc001.com' },
    update: {},
    create: {
      email: 'manager@sc001.com',
      password: hashedPassword,
      name: 'Mumbai Manager',
      role: UserRole.sc_manager,
      serviceCenterId: sc1.id,
      phone: '9888888888'
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@sc001.com' },
    update: {},
    create: {
      email: 'engineer@sc001.com',
      password: hashedPassword,
      name: 'Lead Mechanic',
      role: UserRole.service_engineer,
      serviceCenterId: sc1.id,
      phone: '9777777777'
    },
  });

  await prisma.user.upsert({
    where: { email: 'advisor@sc001.com' },
    update: {},
    create: {
      email: 'advisor@sc001.com',
      password: hashedPassword,
      name: 'Service Advisor',
      role: UserRole.service_advisor,
      serviceCenterId: sc1.id,
      phone: '9666666666'
    },
  });

  await prisma.user.upsert({
    where: { email: 'callcenter@sc001.com' },
    update: {},
    create: {
      email: 'callcenter@sc001.com',
      password: hashedPassword,
      name: 'Call Center Agent',
      role: UserRole.call_center,
      serviceCenterId: sc1.id,
      phone: '9600000000'
    },
  });

  await prisma.user.upsert({
    where: { email: 'inventory@sc001.com' },
    update: {},
    create: {
      email: 'inventory@sc001.com',
      password: hashedPassword,
      name: 'SC Inventory Manager',
      role: UserRole.inventory_manager,
      serviceCenterId: sc1.id,
      phone: '9555555555'
    },
  });

  await prisma.user.upsert({
    where: { email: 'central-inventory@dms.com' },
    update: {},
    create: {
      email: 'central-inventory@dms.com',
      password: hashedPassword,
      name: 'Central Inventory Manager',
      role: UserRole.central_inventory_manager,
      phone: '9444444444'
    },
  });

  // 3. Customers
  const customer = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-' + Date.now() + Math.floor(Math.random() * 1000),
      name: 'Rahul Sharma',
      phone: '9123456780',
      email: 'rahul@example.com',
      address: 'Apt 402, Sea View Society',
      cityState: 'Mumbai, MH',
    }
  });

  // 3.1 Vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      customerId: customer.id,
      registration: 'MH01AB' + Math.floor(Math.random() * 100000),
      vin: 'VIN' + Date.now() + Math.floor(Math.random() * 1000),
      vehicleMake: 'Tata',
      vehicleModel: 'Nexon EV',
      vehicleYear: 2023,
      currentStatus: VehicleStatus.AVAILABLE,
      lastServiceCenterId: sc1.id
    }
  });

  const vehicleId = vehicle.id;

  // 4. Central Inventory
  const centralPart = await prisma.centralInventory.upsert({
    where: { partNumber: 'BATT-NEX-001' },
    update: {},
    create: {
      partName: 'Li-ion Battery Pack 40kWh',
      partNumber: 'BATT-NEX-001',
      category: 'PARTS',
      stockQuantity: 50,
      unitPrice: 500000,
      costPrice: 400000,
      gstRate: 18,
      minStockLevel: 5,
      available: 50
    }
  });

  // 5. SC Inventory
  const scPart = await prisma.inventory.create({
    data: {
      serviceCenterId: sc1.id,
      partName: 'Brake Pad Set',
      partNumber: 'BRK-001',
      category: 'PARTS',
      stockQuantity: 20,
      unitPrice: 2500,
      costPrice: 1800,
      gstRate: 18,
      minStockLevel: 5,
      maxStockLevel: 50
    }
  });

  // 6. Appointment
  await prisma.appointment.create({
    data: {
      appointmentNumber: 'APT-' + Date.now() + Math.floor(Math.random() * 1000),
      customerId: customer.id,
      vehicleId: vehicleId,
      serviceCenterId: sc1.id,
      serviceType: 'Annual Maintenance',
      appointmentDate: new Date(),
      appointmentTime: '10:00 AM',
      status: AppointmentStatus.PENDING,
      location: AppointmentLocation.STATION
    }
  });

  // 7. Job Card
  const jobCard = await prisma.jobCard.create({
    data: {
      jobCardNumber: 'JC-MUM-' + Date.now() + Math.floor(Math.random() * 1000),
      serviceCenterId: sc1.id,
      customerId: customer.id,
      vehicleId: vehicleId,
      assignedEngineerId: engineer.id,
      serviceType: 'Initial Inspection',
      status: JobCardStatus.ASSIGNED,
    }
  });

  await prisma.jobCardItem.createMany({
    data: [
      {
        jobCardId: jobCard.id,
        srNo: 1,
        itemType: 'part',
        partName: 'Brake Pad Set',
        partCode: 'BRK-001',
        qty: 1,
        amount: 2500,
        isWarranty: false
      },
      {
        jobCardId: jobCard.id,
        srNo: 2,
        itemType: 'work_item',
        partName: 'Labour - Cleaning',
        partCode: 'LBR-01',
        qty: 1,
        amount: 500,
        isWarranty: false
      }
    ]
  });

  // 8. Parts Request
  await prisma.partsRequest.create({
    data: {
      jobCardId: jobCard.id,
      status: 'PENDING',
      urgency: 'MEDIUM',
      items: {
        create: {
          inventoryPartId: scPart.id,
          requestedQty: 1
        }
      }
    }
  });

  // 9. Quotation
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-MUM-' + Date.now() + Math.floor(Math.random() * 1000),
      serviceCenterId: sc1.id,
      customerId: customer.id,
      vehicleId: vehicleId,
      status: 'DRAFT',
      subtotal: 2500,
      cgst: 225,
      sgst: 225,
      totalAmount: 2950,
      items: {
        create: [
          {
            partName: 'Brake Pad Set',
            partNumber: 'BRK-001',
            quantity: 1,
            rate: 2500,
            gstPercent: 18
          }
        ]
      }
    }
  });

  // 10. Invoice
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-MUM-' + Date.now() + Math.floor(Math.random() * 1000),
      serviceCenterId: sc1.id,
      customerId: customer.id,
      vehicleId: vehicleId,
      jobCardId: jobCard.id,
      status: 'UNPAID',
      subtotal: 2500,
      cgst: 225,
      sgst: 225,
      grandTotal: 2950,
      items: {
        create: [
          {
            name: 'Brake Pad Set',
            quantity: 1,
            unitPrice: 2500,
            gstRate: 18
          }
        ]
      }
    }
  });

  // 11. Supplier
  const supplier = await prisma.supplier.create({
    data: {
      name: 'AutoParts India Pvt Ltd ' + Date.now(),
      contactPerson: 'Amit Gupta',
      email: 'amit' + Date.now() + '@autoparts.com',
      phone: '9876543210'
    }
  });

  // 12. Purchase Order
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-MUM-' + Date.now() + Math.floor(Math.random() * 1000),
      supplierId: supplier.id,
      status: 'DRAFT',
      orderDate: new Date(),
      subtotal: 18000,
      cgst: 1620,
      sgst: 1620,
      totalAmount: 21240,
      items: {
        create: {
          centralInventoryPartId: centralPart.id,
          quantity: 10,
          unitPrice: 1800,
          gstRate: 18
        }
      }
    }
  });

  // 13. Parts Issue
  await prisma.partsIssue.create({
    data: {
      issueNumber: 'PI-MUM-' + Date.now() + Math.floor(Math.random() * 1000),
      toServiceCenterId: sc1.id,
      requestedById: scManager.id,
      status: 'PENDING_APPROVAL',
      items: {
        create: {
          centralInventoryPartId: centralPart.id,
          requestedQty: 5
        }
      }
    }
  });

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
