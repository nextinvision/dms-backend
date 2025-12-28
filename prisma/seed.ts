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
  // 2. INVENTORY CATALOG (Central & Local) - COMPREHENSIVE PARTS DATA
  // ==============================================================================
  console.log('📦 Seeding Comprehensive Inventory...');

  const comprehensivePartsData = [
    {
      // Battery Pack
      oemPartNumber: 'EV_BAT_40KWH_001',
      partName: 'Li-ion Battery Pack 40kWh',
      partNumber: 'BATT-NEX-001',
      originType: 'NEW',
      category: 'BATTERY',
      description: 'High-performance lithium-ion battery pack, 40kWh capacity, 8-year warranty',
      brandName: 'Tata AutoComp',
      variant: 'Nexon EV, Tigor EV',
      partType: 'GENUINE',
      color: 'N/A',

      // Pricing - Purchase
      costPrice: 400000,
      pricePreGst: 400000,
      gstRateInput: 18,
      gstInput: 72000,

      // Pricing - Sale
      unitPrice: 500000,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 590000,
      totalGst: 90000,

      // Stock
      stockQuantity: 50,
      minStockLevel: 10,
      maxStockLevel: 100,
      unit: 'piece',
      location: 'A-01-BATTERY',

      // Labor
      labourName: 'Battery Replacement',
      labourCode: 'LAB-BATT-001',
      labourWorkTime: '4.0H',
      labourRate: 500,
      labourGstRate: 18,
      labourPrice: 2360, // (4 * 500 * 1.18)

      highValuePart: true,

      central: { stock: 50, price: 500000, cost: 400000 },
      sc: { stock: 10, price: 500000, cost: 400000 }
    },
    {
      // Brake Pads - Front
      oemPartNumber: 'EV_BRK_FR_CERAMIC_001',
      partName: 'Brake Pad Set (Front) - Ceramic',
      partNumber: 'BRK-FR-001',
      originType: 'NEW',
      category: 'BRAKES',
      description: 'Premium ceramic brake pads for front wheels, low dust, low noise',
      brandName: 'Bosch',
      variant: 'Nexon EV, XUV400',
      partType: 'GENUINE',
      color: 'N/A',

      costPrice: 1500,
      pricePreGst: 1500,
      gstRateInput: 18,
      gstInput: 270,

      unitPrice: 2500,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 2950,
      totalGst: 450,

      stockQuantity: 100,
      minStockLevel: 20,
      maxStockLevel: 200,
      unit: 'set',
      location: 'B-03-BRAKES',

      labourName: 'Front Brake Pad Replacement',
      labourCode: 'LAB-BRK-FR-001',
      labourWorkTime: '1.5H',
      labourRate: 400,
      labourGstRate: 18,
      labourPrice: 708, // (1.5 * 400 * 1.18)

      highValuePart: false,

      central: { stock: 100, price: 2500, cost: 1500 },
      sc: { stock: 20, price: 2500, cost: 1500 }
    },
    {
      // Brake Pads - Rear
      oemPartNumber: 'EV_BRK_RR_CERAMIC_001',
      partName: 'Brake Pad Set (Rear) - Ceramic',
      partNumber: 'BRK-RR-001',
      originType: 'NEW',
      category: 'BRAKES',
      description: 'Premium ceramic brake pads for rear wheels, extended life',
      brandName: 'Bosch',
      variant: 'Nexon EV, XUV400',
      partType: 'GENUINE',
      color: 'N/A',

      costPrice: 1300,
      pricePreGst: 1300,
      gstRateInput: 18,
      gstInput: 234,

      unitPrice: 2200,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 2596,
      totalGst: 396,

      stockQuantity: 100,
      minStockLevel: 20,
      maxStockLevel: 200,
      unit: 'set',
      location: 'B-03-BRAKES',

      labourName: 'Rear Brake Pad Replacement',
      labourCode: 'LAB-BRK-RR-001',
      labourWorkTime: '1.0H',
      labourRate: 400,
      labourGstRate: 18,
      labourPrice: 472, // (1.0 * 400 * 1.18)

      highValuePart: false,

      central: { stock: 100, price: 2200, cost: 1300 },
      sc: { stock: 20, price: 2200, cost: 1300 }
    },
    {
      // Air Filter
      oemPartNumber: 'EV_FLT_CAB_HEPA_001',
      partName: 'Cabin Air Filter - HEPA',
      partNumber: 'FLT-CAB-001',
      originType: 'NEW',
      category: 'FILTERS',
      description: 'HEPA cabin air filter, PM2.5 filtration, antibacterial coating',
      brandName: 'Mahle',
      variant: 'Universal EV',
      partType: 'AFTERMARKET',
      color: 'White',

      costPrice: 400,
      pricePreGst: 400,
      gstRateInput: 18,
      gstInput: 72,

      unitPrice: 850,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 1003,
      totalGst: 153,

      stockQuantity: 200,
      minStockLevel: 50,
      maxStockLevel: 300,
      unit: 'piece',
      location: 'C-05-FILTERS',

      labourName: 'Cabin Filter Replacement',
      labourCode: 'LAB-FLT-001',
      labourWorkTime: '0.25H',
      labourRate: 300,
      labourGstRate: 18,
      labourPrice: 89, // (0.25 * 300 * 1.18)

      highValuePart: false,

      central: { stock: 200, price: 850, cost: 400 },
      sc: { stock: 40, price: 850, cost: 400 }
    },
    {
      // Wiper Blades
      oemPartNumber: 'EV_WIP_PREMIUM_SET_001',
      partName: 'Premium Wiper Blade Set',
      partNumber: 'WIP-SET-001',
      originType: 'NEW',
      category: 'ACCESSORIES',
      description: 'Silicone wiper blades, all-weather performance, front pair',
      brandName: 'Hella',
      variant: 'Nexon EV',
      partType: 'GENUINE',
      color: 'Black',

      costPrice: 600,
      pricePreGst: 600,
      gstRateInput: 18,
      gstInput: 108,

      unitPrice: 1200,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 1416,
      totalGst: 216,

      stockQuantity: 150,
      minStockLevel: 30,
      maxStockLevel: 250,
      unit: 'set',
      location: 'D-02-ACCESSORIES',

      labourName: 'Wiper Blade Installation',
      labourCode: 'LAB-WIP-001',
      labourWorkTime: '0.15H',
      labourRate: 250,
      labourGstRate: 18,
      labourPrice: 44, // (0.15 * 250 * 1.18)

      highValuePart: false,

      central: { stock: 150, price: 1200, cost: 600 },
      sc: { stock: 30, price: 1200, cost: 600 }
    },
    {
      // Coolant
      oemPartNumber: 'EV_COOL_G12_1L_001',
      partName: 'EV Coolant G12+ (1L)',
      partNumber: 'OIL-COOL-001',
      originType: 'NEW',
      category: 'FLUIDS',
      description: 'Long-life coolant for electric vehicle thermal management system',
      brandName: 'Mobil',
      variant: 'All EV Models',
      partType: 'GENUINE',
      color: 'Pink',

      costPrice: 200,
      pricePreGst: 200,
      gstRateInput: 18,
      gstInput: 36,

      unitPrice: 450,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 531,
      totalGst: 81,

      stockQuantity: 500,
      minStockLevel: 100,
      maxStockLevel: 800,
      unit: 'litre',
      location: 'E-01-FLUIDS',

      labourName: 'Coolant Top-up',
      labourCode: 'LAB-COOL-001',
      labourWorkTime: '0.20H',
      labourRate: 250,
      labourGstRate: 18,
      labourPrice: 59, // (0.20 * 250 * 1.18)

      highValuePart: false,

      central: { stock: 500, price: 450, cost: 200 },
      sc: { stock: 100, price: 450, cost: 200 }
    },
    {
      // Brake Fluid
      oemPartNumber: 'EV_BRK_FL_DOT4_500ML_001',
      partName: 'Brake Fluid DOT-4 (500ml)',
      partNumber: 'OIL-BRK-001',
      originType: 'NEW',
      category: 'FLUIDS',
      description: 'High-performance DOT-4 brake fluid, high boiling point',
      brandName: 'Castrol',
      variant: 'Universal',
      partType: 'GENUINE',
      color: 'Amber',

      costPrice: 150,
      pricePreGst: 150,
      gstRateInput: 18,
      gstInput: 27,

      unitPrice: 350,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 413,
      totalGst: 63,

      stockQuantity: 400,
      minStockLevel: 80,
      maxStockLevel: 600,
      unit: 'bottle',
      location: 'E-01-FLUIDS',

      labourName: 'Brake Fluid Replacement',
      labourCode: 'LAB-BRK-FL-001',
      labourWorkTime: '0.50H',
      labourRate: 350,
      labourGstRate: 18,
      labourPrice: 207, // (0.50 * 350 * 1.18)

      highValuePart: false,

      central: { stock: 400, price: 350, cost: 150 },
      sc: { stock: 80, price: 350, cost: 150 }
    },
    {
      // Headlight - Left
      oemPartNumber: 'EV_LGT_HD_LED_L_001',
      partName: 'LED Headlight Assembly (Left)',
      partNumber: 'LGT-HD-L-01',
      originType: 'NEW',
      category: 'LIGHTING',
      description: 'Full LED headlight assembly with DRL, projector type, left side',
      brandName: 'Valeo',
      variant: 'Nexon EV XZ+ onwards',
      partType: 'GENUINE',
      color: 'Clear',

      costPrice: 6000,
      pricePreGst: 6000,
      gstRateInput: 18,
      gstInput: 1080,

      unitPrice: 8500,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 10030,
      totalGst: 1530,

      stockQuantity: 30,
      minStockLevel: 5,
      maxStockLevel: 50,
      unit: 'piece',
      location: 'F-04-LIGHTING',

      labourName: 'Headlight Assembly Replacement',
      labourCode: 'LAB-LGT-001',
      labourWorkTime: '1.0H',
      labourRate: 450,
      labourGstRate: 18,
      labourPrice: 531, // (1.0 * 450 * 1.18)

      highValuePart: true,

      central: { stock: 30, price: 8500, cost: 6000 },
      sc: { stock: 6, price: 8500, cost: 6000 }
    },
    {
      // Headlight - Right
      oemPartNumber: 'EV_LGT_HD_LED_R_001',
      partName: 'LED Headlight Assembly (Right)',
      partNumber: 'LGT-HD-R-01',
      originType: 'NEW',
      category: 'LIGHTING',
      description: 'Full LED headlight assembly with DRL, projector type, right side',
      brandName: 'Valeo',
      variant: 'Nexon EV XZ+ onwards',
      partType: 'GENUINE',
      color: 'Clear',

      costPrice: 6000,
      pricePreGst: 6000,
      gstRateInput: 18,
      gstInput: 1080,

      unitPrice: 8500,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 10030,
      totalGst: 1530,

      stockQuantity: 30,
      minStockLevel: 5,
      maxStockLevel: 50,
      unit: 'piece',
      location: 'F-04-LIGHTING',

      labourName: 'Headlight Assembly Replacement',
      labourCode: 'LAB-LGT-001',
      labourWorkTime: '1.0H',
      labourRate: 450,
      labourGstRate: 18,
      labourPrice: 531,

      highValuePart: true,

      central: { stock: 30, price: 8500, cost: 6000 },
      sc: { stock: 6, price: 8500, cost: 6000 }
    },
    {
      // Front Bumper
      oemPartNumber: 'EV_BMP_FR_PAINTED_001',
      partName: 'Front Bumper Assembly (Painted)',
      partNumber: 'BMP-FR-001',
      originType: 'NEW',
      category: 'BODY PARTS',
      description: 'Complete front bumper assembly, pre-painted, includes grille and fog lamp housings',
      brandName: 'Tata AutoComp',
      variant: 'Nexon EV',
      partType: 'GENUINE',
      color: 'Multiple (As per VIN)',

      costPrice: 8000,
      pricePreGst: 8000,
      gstRateInput: 18,
      gstInput: 1440,

      unitPrice: 12000,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 14160,
      totalGst: 2160,

      stockQuantity: 20,
      minStockLevel: 3,
      maxStockLevel: 30,
      unit: 'piece',
      location: 'G-01-BODYPARTS',

      labourName: 'Front Bumper Replacement & Fitment',
      labourCode: 'LAB-BMP-001',
      labourWorkTime: '2.5H',
      labourRate: 500,
      labourGstRate: 18,
      labourPrice: 1475, // (2.5 * 500 * 1.18)

      highValuePart: true,

      central: { stock: 20, price: 12000, cost: 8000 },
      sc: { stock: 4, price: 12000, cost: 8000 }
    },
    {
      // Tire
      oemPartNumber: 'EV_TYR_215_60_R16_001',
      partName: 'EV Tire 215/60 R16',
      partNumber: 'TYR-EV-001',
      originType: 'NEW',
      category: 'TIRES',
      description: 'Low rolling resistance tire designed for electric vehicles, 215/60 R16',
      brandName: 'MRF',
      variant: 'Nexon EV, ZS EV',
      partType: 'GENUINE',
      color: 'Black',

      costPrice: 4500,
      pricePreGst: 4500,
      gstRateInput: 18,
      gstInput: 810,

      unitPrice: 6500,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 7670,
      totalGst: 1170,

      stockQuantity: 80,
      minStockLevel: 16,
      maxStockLevel: 120,
      unit: 'piece',
      location: 'H-01-TIRES',

      labourName: 'Tire Replacement & Balancing',
      labourCode: 'LAB-TYR-001',
      labourWorkTime: '0.50H',
      labourRate: 400,
      labourGstRate: 18,
      labourPrice: 236, // (0.50 * 400 * 1.18)

      highValuePart: false,

      central: { stock: 80, price: 6500, cost: 4500 },
      sc: { stock: 16, price: 6500, cost: 4500 }
    },
    {
      // Charger Cable
      oemPartNumber: 'EV_CHG_TYPE2_5M_001',
      partName: 'Type-2 AC Charging Cable (5m)',
      partNumber: 'CHG-CABLE-001',
      originType: 'NEW',
      category: 'CHARGING',
      description: 'Type-2 AC charging cable, 32A capacity, 5 meter length, weather resistant',
      brandName: 'Delta',
      variant: 'Universal EV',
      partType: 'GENUINE',
      color: 'Black',

      costPrice: 3500,
      pricePreGst: 3500,
      gstRateInput: 18,
      gstInput: 630,

      unitPrice: 5500,
      gstRate: 18,
      gstRateOutput: 18,
      totalPrice: 6490,
      totalGst: 990,

      stockQuantity: 40,
      minStockLevel: 10,
      maxStockLevel: 60,
      unit: 'piece',
      location: 'I-01-CHARGING',

      labourName: 'Charging Cable Inspection',
      labourCode: 'LAB-CHG-001',
      labourWorkTime: '0.15H',
      labourRate: 300,
      labourGstRate: 18,
      labourPrice: 53, // (0.15 * 300 * 1.18)

      highValuePart: true,

      central: { stock: 40, price: 5500, cost: 3500 },
      sc: { stock: 8, price: 5500, cost: 3500 }
    }
  ];

  const centralParts = [];
  const scParts = [];

  for (const p of comprehensivePartsData) {
    // Seed Central Inventory with all fields
    const cp = await prisma.centralInventory.upsert({
      where: { partNumber: p.partNumber },
      update: {},
      create: {
        partName: p.partName,
        partNumber: p.partNumber,
        category: p.category,
        unitPrice: p.central.price,
        costPrice: p.central.cost,
        stockQuantity: p.central.stock,
        gstRate: p.gstRate,
        minStockLevel: p.minStockLevel,
        available: p.central.stock
      }
    });
    centralParts.push(cp);

    // Seed Local SC1 Inventory with ALL available fields
    const sp = await prisma.inventory.create({
      data: {
        serviceCenterId: sc1.id,

        // Basic Part Information
        oemPartNumber: p.oemPartNumber,
        partName: p.partName,
        partNumber: p.partNumber,
        originType: p.originType,
        category: p.category,
        description: p.description,

        // Stock Information
        stockQuantity: p.sc.stock,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        unit: p.unit,
        location: p.location,

        // Part Details
        brandName: p.brandName,
        variant: p.variant,
        partType: p.partType,
        color: p.color,

        // Pricing - Purchase
        costPrice: p.sc.cost,
        pricePreGst: p.pricePreGst,
        gstRateInput: p.gstRateInput,
        gstInput: p.gstInput,

        // Pricing - Sale
        unitPrice: p.sc.price,
        gstRate: p.gstRate,
        gstRateOutput: p.gstRateOutput,
        totalPrice: p.totalPrice,
        totalGst: p.totalGst,

        // Labour Information
        labourName: p.labourName,
        labourCode: p.labourCode,
        labourWorkTime: p.labourWorkTime,
        labourRate: p.labourRate,
        labourGstRate: p.labourGstRate,
        labourPrice: p.labourPrice,

        // Flags
        highValuePart: p.highValuePart
      }
    });
    scParts.push(sp);
  }

  console.log(`✅ Created ${centralParts.length} central parts and ${scParts.length} SC parts with comprehensive data!`);

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
