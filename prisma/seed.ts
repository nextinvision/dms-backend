import { PrismaClient, UserRole, JobCardStatus, AppointmentStatus, AppointmentLocation, VehicleStatus, PartsRequestStatus, JobCardPriority, QuotationStatus, InvoiceStatus, LeadStatus, IssueStatus, POStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed starting...');

  // --- CLEANUP (Optional: careful in prod, but safe for dev seed) ---
  // In a real scenario, you might want to force clean or just upsert.
  // For this comprehensive seed, we assume we can add data cumulatively or upsert uniqueness.

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // ==============================================================================
  // 1. MASTER DATA (Service Centers, Users, Catalog)
  // ==============================================================================
  console.log('📍 Seeding Service Centers...');

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
      state: 'Maharashtra',
      gstNumber: '27AABCU9603R1Z2',
      panNumber: 'AABCU9603R',
      bankName: 'HDFC Bank',
      bankAccount: '50100012345678',
      bankIFSC: 'HDFC0001234'
    },
  });

  const sc2 = await prisma.serviceCenter.upsert({
    where: { code: 'SC002' },
    update: {},
    create: {
      name: 'South Zone Service Hub',
      code: 'SC002',
      address: '45 Tech Road, Bangalore',
      phone: '080-7654321',
      email: 'bangalore@dms.com',
      city: 'Bangalore',
      state: 'Karnataka',
      gstNumber: '29AABCU9603R1Z2',
    },
  });

  console.log('👥 Seeding Users...');

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@dms.com' },
    update: {},
    create: { email: 'admin@dms.com', password: hashedPassword, name: 'System Administrator', role: UserRole.admin, phone: '9999999999' },
  });

  // SC001 Staff
  const scManager = await prisma.user.upsert({
    where: { email: 'manager@sc001.com' },
    update: {},
    create: { email: 'manager@sc001.com', password: hashedPassword, name: 'Vikram Singh', role: UserRole.sc_manager, serviceCenterId: sc1.id, phone: '9888811111' },
  });

  const engineer1 = await prisma.user.upsert({
    where: { email: 'engineer@sc001.com' },
    update: {},
    create: { email: 'engineer@sc001.com', password: hashedPassword, name: 'Rajesh Kumar', role: UserRole.service_engineer, serviceCenterId: sc1.id, phone: '9777711111' },
  });

  const engineer2 = await prisma.user.upsert({
    where: { email: 'technician@sc001.com' },
    update: {},
    create: { email: 'technician@sc001.com', password: hashedPassword, name: 'Suresh Patil', role: UserRole.service_engineer, serviceCenterId: sc1.id, phone: '9777722222' },
  });

  const advisor = await prisma.user.upsert({
    where: { email: 'advisor@sc001.com' },
    update: {},
    create: { email: 'advisor@sc001.com', password: hashedPassword, name: 'Amit Verma', role: UserRole.service_advisor, serviceCenterId: sc1.id, phone: '9666611111' },
  });

  const inventoryMgr = await prisma.user.upsert({
    where: { email: 'inventory@sc001.com' },
    update: {},
    create: { email: 'inventory@sc001.com', password: hashedPassword, name: 'Sneha Gupta', role: UserRole.inventory_manager, serviceCenterId: sc1.id, phone: '9555511111' },
  });

  const callCenterRep = await prisma.user.upsert({
    where: { email: 'callcenter@sc001.com' },
    update: {},
    create: { email: 'callcenter@sc001.com', password: hashedPassword, name: 'Priya Sharma', role: 'call_center' as UserRole, serviceCenterId: sc1.id, phone: '9444411111' },
  });

  const centralInventoryMgr = await prisma.user.upsert({
    where: { email: 'central-inventory@dms.com' },
    update: {},
    create: { email: 'central-inventory@dms.com', password: hashedPassword, name: 'Arun Deshmukh', role: UserRole.central_inventory_manager, phone: '9333311111' },
  });

  // ==============================================================================
  // 2. INVENTORY CATALOG (Central & Local)
  // ==============================================================================
  console.log('📦 Seeding Inventory...');

  const partsData = [
    { name: 'Li-ion Battery Pack 40kWh', code: 'BATT-NEX-001', cat: 'PARTS', price: 500000, cost: 400000, stock: 50 },
    { name: 'Brake Pad Set (Front)', code: 'BRK-FR-001', cat: 'PARTS', price: 2500, cost: 1500, stock: 100 },
    { name: 'Brake Pad Set (Rear)', code: 'BRK-RR-001', cat: 'PARTS', price: 2200, cost: 1300, stock: 100 },
    { name: 'Cabin Air Filter', code: 'FLT-CAB-001', cat: 'CONSUMABLES', price: 850, cost: 400, stock: 200 },
    { name: 'Wiper Blade Set', code: 'WIP-SET-001', cat: 'CONSUMABLES', price: 1200, cost: 600, stock: 150 },
    { name: 'Coolant (1L)', code: 'OIL-COOL-001', cat: 'FLUIDS', price: 450, cost: 200, stock: 500 },
    { name: 'Brake Fluid (500ml)', code: 'OIL-BRK-001', cat: 'FLUIDS', price: 350, cost: 150, stock: 400 },
    { name: 'Headlight Assembly (L)', code: 'LGT-HD-L-01', cat: 'PARTS', price: 8500, cost: 6000, stock: 30 },
    { name: 'Headlight Assembly (R)', code: 'LGT-HD-R-01', cat: 'PARTS', price: 8500, cost: 6000, stock: 30 },
    { name: 'Front Bumper', code: 'BMP-FR-001', cat: 'PARTS', price: 12000, cost: 8000, stock: 20 },
  ];

  const centralParts = [];
  const scParts = [];

  for (const p of partsData) {
    // Seed Central
    const cp = await prisma.centralInventory.upsert({
      where: { partNumber: p.code },
      update: {},
      create: {
        partName: p.name,
        partNumber: p.code,
        category: p.cat,
        unitPrice: p.price,
        costPrice: p.cost,
        stockQuantity: p.stock,
        gstRate: 18,
        minStockLevel: 10,
        available: p.stock
      }
    });
    centralParts.push(cp);

    // Seed Local SC1
    const sp = await prisma.inventory.create({
      data: {
        serviceCenterId: sc1.id,
        partName: p.name,
        partNumber: p.code,
        category: p.cat,
        unitPrice: p.price,
        costPrice: p.cost,
        stockQuantity: Math.floor(p.stock / 5), // Smaller stock at SC
        gstRate: 18,
        minStockLevel: 5,
        maxStockLevel: 50
      }
    });
    scParts.push(sp);
  }

  // ==============================================================================
  // 3. OPERATIONAL DATA (Customers, Vehicles)
  // ==============================================================================
  console.log('👥 Seeding Customers & Vehicles...');

  const customersData = [
    { name: 'Rahul Sharma', phone: '9820098200', email: 'rahul@example.com', address: 'Bandra West, Mumbai', type: 'B2C' },
    { name: 'Priya Patel', phone: '9820098201', email: 'priya@example.com', address: 'Juhu, Mumbai', type: 'B2C' },
    { name: 'Corporate Fleet Solutions', phone: '9820098202', email: 'fleet@corp.com', address: 'Andheri East, Mumbai', type: 'B2B' },
    { name: 'Amitabh Bachchan', phone: '9820098203', email: 'bigb@example.com', address: 'Juhu, Mumbai', type: 'B2C' },
    { name: 'Sachin Tendulkar', phone: '9820098204', email: 'sachin@example.com', address: 'Bandra West, Mumbai', type: 'B2C' }
  ];

  const customers = [];
  const vehicles = [];

  for (const c of customersData) {
    const cust = await prisma.customer.create({
      data: {
        customerNumber: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        customerType: c.type,
      }
    });
    customers.push(cust);

    // Add 1-2 vehicles per customer
    const numVehicles = c.type === 'B2B' ? 3 : 1;
    for (let i = 0; i < numVehicles; i++) {
      const v = await prisma.vehicle.create({
        data: {
          customerId: cust.id,
          registration: `MH02${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(1000 + Math.random() * 9000)}`,
          vin: `VIN${Date.now()}${Math.floor(Math.random() * 100)}`,
          vehicleMake: 'Tata',
          vehicleModel: i % 2 === 0 ? 'Nexon EV' : 'Tiago EV',
          vehicleYear: 2023,
          vehicleColor: ['White', 'Black', 'Blue', 'Red'][Math.floor(Math.random() * 4)],
          lastServiceCenterId: sc1.id,
          currentStatus: VehicleStatus.AVAILABLE
        }
      });
      vehicles.push(v);
    }
  }

  // ==============================================================================
  // 4. TRANSACTIONAL DATA (Leads, Appointments, Jobs, Quotes)
  // ==============================================================================
  console.log('🔄 Seeding Transactions...');

  // 4.1 Leads
  const leadStatuses = [LeadStatus.NEW, LeadStatus.IN_DISCUSSION, LeadStatus.JOB_CARD_IN_PROGRESS, LeadStatus.CONVERTED, LeadStatus.LOST];
  for (let i = 0; i < 5; i++) {
    await prisma.lead.create({
      data: {
        leadNumber: `LD-${1000 + i}`,
        customerName: `Lead Customer ${i}`,
        phone: `999990000${i}`,
        inquiryType: 'Service',
        source: 'Walk-in',
        status: leadStatuses[i],
        serviceCenterId: sc1.id,
        notes: 'Interested in general service inquiry.'
      }
    });
  }

  // 4.2 Appointments (Past & Future)
  const apptVehicles = vehicles.slice(0, 3); // take first 3 vehicles

  // Future Appointment
  await prisma.appointment.create({
    data: {
      appointmentNumber: 'APT-FUT-01',
      customerId: apptVehicles[0].customerId,
      vehicleId: apptVehicles[0].id,
      serviceCenterId: sc1.id,
      serviceType: 'General Service',
      appointmentDate: new Date(Date.now() + 86400000 * 2), // +2 days
      appointmentTime: '10:00',
      status: AppointmentStatus.CONFIRMED,
      location: AppointmentLocation.STATION
    }
  });

  // Today's Appointment (Pending)
  const todayAppt = await prisma.appointment.create({
    data: {
      appointmentNumber: 'APT-TOD-01',
      customerId: apptVehicles[1].customerId,
      vehicleId: apptVehicles[1].id,
      serviceCenterId: sc1.id,
      serviceType: 'Repair',
      appointmentDate: new Date(),
      appointmentTime: '09:00',
      status: AppointmentStatus.ARRIVED,
      location: AppointmentLocation.STATION,
      customerArrived: true,
      arrivalMode: 'vehicle_present'
    }
  });

  // 4.3 Job Cards & Flows

  // Scenario A: Active Job Card (In Progress)
  const jcActive = await prisma.jobCard.create({
    data: {
      jobCardNumber: 'JC-ACT-001',
      serviceCenterId: sc1.id,
      customerId: todayAppt.customerId,
      vehicleId: todayAppt.vehicleId,
      appointmentId: todayAppt.id,
      assignedEngineerId: engineer1.id,
      serviceType: 'Repair',
      status: JobCardStatus.IN_PROGRESS,
      priority: JobCardPriority.NORMAL,
      createdAt: new Date()
    }
  });

  // Add Items
  await prisma.jobCardItem.create({
    data: {
      jobCardId: jcActive.id,
      srNo: 1,
      itemType: 'part',
      partName: scParts[1].partName, // Brake Pad Front
      partCode: scParts[1].partNumber,
      qty: 1,
      amount: scParts[1].unitPrice,
    }
  });

  // Scenario B: Completed Job Card -> Quotation Approved -> Invoice Unpaid
  const vComp = vehicles[3];
  const jcComp = await prisma.jobCard.create({
    data: {
      jobCardNumber: 'JC-CMP-002',
      serviceCenterId: sc1.id,
      customerId: vComp.customerId,
      vehicleId: vComp.id,
      assignedEngineerId: engineer2.id,
      serviceType: 'Major Service',
      status: JobCardStatus.COMPLETED,
      priority: JobCardPriority.HIGH,
    }
  });

  const quoteComp = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-CMP-002',
      serviceCenterId: sc1.id,
      customerId: vComp.customerId,
      vehicleId: vComp.id,
      status: QuotationStatus.CUSTOMER_APPROVED,
      subtotal: 5000,
      cgst: 450,
      sgst: 450,
      totalAmount: 5900,
      customerApprovalStatus: 'APPROVED'
    }
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-CMP-002',
      serviceCenterId: sc1.id,
      customerId: vComp.customerId,
      vehicleId: vComp.id,
      jobCardId: jcComp.id,
      status: InvoiceStatus.UNPAID,
      subtotal: 5000,
      cgst: 450,
      sgst: 450,
      grandTotal: 5900,
      items: {
        create: [
          { name: 'Service Charges', quantity: 1, unitPrice: 5000, gstRate: 18 }
        ]
      }
    }
  });

  // Scenario C: Draft Quotation
  const vDraft = vehicles[4];
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-DRF-003',
      serviceCenterId: sc1.id,
      customerId: vDraft.customerId,
      vehicleId: vDraft.id,
      status: QuotationStatus.DRAFT,
      subtotal: 1200,
      cgst: 108,
      sgst: 108,
      totalAmount: 1416,
      items: {
        create: [
          { partName: scParts[4].partName, partNumber: scParts[4].partNumber, quantity: 1, rate: scParts[4].unitPrice, gstPercent: 18 }
        ]
      }
    }
  });

  // ==============================================================================
  // 5. INVENTORY FLOWS (Supply Chain)
  // ==============================================================================
  console.log('🚚 Seeding Supply Chain...');

  const supplier = await prisma.supplier.create({
    data: {
      name: 'AutoParts Global Inc',
      contactPerson: 'John Doe',
      email: 'supply@autoglobal.com',
      phone: '1234567890'
    }
  });

  // Purchase Order
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-001',
      supplierId: supplier.id,
      status: POStatus.APPROVED,
      orderDate: new Date(),
      subtotal: 50000,
      cgst: 4500,
      sgst: 4500,
      totalAmount: 59000,
      items: {
        create: {
          centralInventoryPartId: centralParts[0].id, // Battery
          quantity: 5,
          unitPrice: 10000,
          gstRate: 18
        }
      }
    }
  });

  // Parts Issue Request (SC -> Central)
  await prisma.partsIssue.create({
    data: {
      issueNumber: 'PI-REQ-001',
      toServiceCenterId: sc1.id,
      requestedById: scManager.id,
      status: IssueStatus.PENDING_APPROVAL,
      priority: JobCardPriority.CRITICAL,
      items: {
        create: {
          centralInventoryPartId: centralParts[0].id, // Battery
          requestedQty: 2
        }
      }
    }
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
