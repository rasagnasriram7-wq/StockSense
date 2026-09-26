import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StockSense database seeding...');

  // Clean existing data in reverse order of dependencies
  await prisma.stockMove.deleteMany();
  await prisma.documentItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stockQuantity.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users
  const hashedPassword = await bcrypt.hash('password123', 10);
  const managerUser = await prisma.user.create({
    data: {
      name: 'Alice Vance (Manager)',
      email: 'manager@stocksense.io',
      passwordHash: hashedPassword,
      role: 'manager',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: 'Bob Miller (Staff)',
      email: 'staff@stocksense.io',
      passwordHash: hashedPassword,
      role: 'staff',
    },
  });
  console.log('✓ Users created: manager@stocksense.io and staff@stocksense.io');

  // 2. Seed Warehouses
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Distribution Warehouse',
      code: 'WH-MAIN',
      address: '100 Industrial Parkway, North Logistics Hub',
      managerName: 'Alice Vance',
      status: 'active',
    },
  });

  const prodWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Production & Assembly Facility',
      code: 'WH-PROD',
      address: '205 Manufacturing Way, Sector 8',
      managerName: 'David Zhang',
      status: 'active',
    },
  });
  console.log('✓ Warehouses created: WH-MAIN and WH-PROD');

  // 3. Seed Locations (Internal and Virtual)
  // Virtual locations (no warehouseId)
  const locVendors = await prisma.location.create({
    data: {
      name: 'Vendors / External Suppliers',
      code: 'LOC-VEND',
      isVirtual: true,
      type: 'supplier',
    },
  });

  const locCustomers = await prisma.location.create({
    data: {
      name: 'Customers / External Deliveries',
      code: 'LOC-CUST',
      isVirtual: true,
      type: 'customer',
    },
  });

  const locAdjustment = await prisma.location.create({
    data: {
      name: 'Inventory Adjustments & Variance',
      code: 'LOC-ADJ',
      isVirtual: true,
      type: 'adjustment',
    },
  });

  // Physical locations in Main Warehouse
  const locMainStore = await prisma.location.create({
    data: {
      warehouseId: mainWarehouse.id,
      name: 'Main Store - Bay 1',
      code: 'LOC-MAIN-STORE',
      isVirtual: false,
      type: 'internal',
    },
  });

  const locMainBulk = await prisma.location.create({
    data: {
      warehouseId: mainWarehouse.id,
      name: 'Bulk Pallet Racks - Bay 2',
      code: 'LOC-MAIN-BULK',
      isVirtual: false,
      type: 'internal',
    },
  });

  // Physical locations in Production Warehouse
  const locProdRackA = await prisma.location.create({
    data: {
      warehouseId: prodWarehouse.id,
      name: 'Production Rack A',
      code: 'LOC-PROD-RACK-A',
      isVirtual: false,
      type: 'internal',
    },
  });

  const locProdAssembly = await prisma.location.create({
    data: {
      warehouseId: prodWarehouse.id,
      name: 'Assembly Staging Line',
      code: 'LOC-PROD-ASSEMBLY',
      isVirtual: false,
      type: 'internal',
    },
  });
  console.log('✓ Locations created (4 internal, 3 virtual)');

  // 4. Seed Categories
  const catRaw = await prisma.category.create({
    data: {
      name: 'Raw Materials',
      description: 'Primary structural and bulk materials for production',
    },
  });

  const catFinished = await prisma.category.create({
    data: {
      name: 'Finished Goods',
      description: 'Manufactured products ready for commercial delivery',
    },
  });

  const catElec = await prisma.category.create({
    data: {
      name: 'Electronics & Components',
      description: 'Circuitry, microcontrollers, and electrical subsystems',
    },
  });
  console.log('✓ Categories created');

  // 5. Seed Suppliers
  const supApex = await prisma.supplier.create({
    data: {
      name: 'Apex Industrial Supplies',
      contactPerson: 'Robert Sterling',
      phone: '+1-555-0144',
      email: 'orders@apexindustrial.com',
      address: '77 Commerce Blvd, Chicago IL',
    },
  });

  const supTechCore = await prisma.supplier.create({
    data: {
      name: 'TechCore Global Components',
      contactPerson: 'Elena Rostova',
      phone: '+1-555-0288',
      email: 'sales@techcoreglobal.com',
      address: '404 Silicon Parkway, San Jose CA',
    },
  });

  const supVanguard = await prisma.supplier.create({
    data: {
      name: 'Vanguard Hardware & Steel',
      contactPerson: 'Marcus Webb',
      phone: '+1-555-0399',
      email: 'mwebb@vanguardsteel.com',
      address: '12 Foundry Way, Pittsburgh PA',
    },
  });
  console.log('✓ Suppliers created');

  // 6. Seed 10 Products with varied stock levels
  const productsData = [
    {
      name: 'Structural Steel Rods',
      sku: 'RAW-STEEL-001',
      categoryId: catRaw.id,
      uom: 'kg',
      reorderMin: 30,
      reorderMax: 200,
      description: 'High tensile 12mm structural carbon steel rods',
      initialQty: 100,
      initialLoc: locMainStore.id,
    },
    {
      name: 'Insulated Copper Cable',
      sku: 'RAW-COPP-002',
      categoryId: catRaw.id,
      uom: 'meters',
      reorderMin: 100,
      reorderMax: 500,
      description: 'Heavy duty stranded copper wiring 14 AWG',
      initialQty: 320,
      initialLoc: locMainStore.id,
    },
    {
      name: 'Anodized Aluminum Sheets',
      sku: 'RAW-ALUM-003',
      categoryId: catRaw.id,
      uom: 'sheets',
      reorderMin: 25,
      reorderMax: 100,
      description: '2mm lightweight aerospace-grade aluminum sheets',
      initialQty: 8, // LOW STOCK (min 25)
      initialLoc: locMainStore.id,
    },
    {
      name: 'Ergonomic Task Chair V2',
      sku: 'FG-CHAIR-001',
      categoryId: catFinished.id,
      uom: 'units',
      reorderMin: 15,
      reorderMax: 80,
      description: 'Adjustable mesh ergonomic office chair',
      initialQty: 45,
      initialLoc: locMainStore.id,
    },
    {
      name: 'Modular Executive Desk',
      sku: 'FG-DESK-002',
      categoryId: catFinished.id,
      uom: 'units',
      reorderMin: 10,
      reorderMax: 50,
      description: 'Heavy duty steel & walnut executive work table',
      initialQty: 0, // OUT OF STOCK (min 10)
      initialLoc: locMainStore.id,
    },
    {
      name: 'Industrial Standing Air Mover',
      sku: 'FG-FAN-003',
      categoryId: catFinished.id,
      uom: 'units',
      reorderMin: 12,
      reorderMax: 60,
      description: '30-inch commercial high velocity pedestal fan',
      initialQty: 4, // LOW STOCK (min 12)
      initialLoc: locProdRackA.id,
    },
    {
      name: 'ESP32-S3 Microcontroller Board',
      sku: 'ELEC-MCU-001',
      categoryId: catElec.id,
      uom: 'pcs',
      reorderMin: 50,
      reorderMax: 300,
      description: 'Dual-core WiFi/BLE IoT industrial controller unit',
      initialQty: 180,
      initialLoc: locMainStore.id,
    },
    {
      name: 'Industrial Switching PSU 24V 10A',
      sku: 'ELEC-PSU-002',
      categoryId: catElec.id,
      uom: 'pcs',
      reorderMin: 20,
      reorderMax: 80,
      description: 'DIN Rail mount 240W DC switching power supply',
      initialQty: 38,
      initialLoc: locMainBulk.id,
    },
    {
      name: 'SMD Ceramic Capacitors Kit',
      sku: 'ELEC-CAP-003',
      categoryId: catElec.id,
      uom: 'packs',
      reorderMin: 30,
      reorderMax: 150,
      description: 'Assorted surface mount multi-layer ceramic capacitors',
      initialQty: 12, // LOW STOCK (min 30)
      initialLoc: locProdRackA.id,
    },
    {
      name: 'NEMA 23 Bipolar Stepper Motor',
      sku: 'ELEC-MOT-004',
      categoryId: catElec.id,
      uom: 'pcs',
      reorderMin: 15,
      reorderMax: 60,
      description: '1.9Nm high torque hybrid stepper motor',
      initialQty: 0, // OUT OF STOCK (min 15)
      initialLoc: locProdRackA.id,
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId,
        uom: item.uom,
        reorderMin: item.reorderMin,
        reorderMax: item.reorderMax,
        description: item.description,
        status: 'active',
      },
    });

    if (item.initialQty > 0) {
      // Set initial stock quantity
      await prisma.stockQuantity.create({
        data: {
          productId: product.id,
          locationId: item.initialLoc,
          quantity: item.initialQty,
        },
      });

      // Record initial stock move in immutable ledger
      await prisma.stockMove.create({
        data: {
          productId: product.id,
          fromLocationId: locVendors.id,
          toLocationId: item.initialLoc,
          quantity: item.initialQty,
          balanceAfter: item.initialQty,
          transactionType: 'receipt',
          referenceNumber: `INIT-${product.sku}`,
          userId: managerUser.id,
          reason: 'Initial warehouse intake / system initialization',
        },
      });
    }
  }
  console.log('✓ 10 Products created with varied stock & ledger history');

  // 7. Seed sample draft documents so dashboard shows realistic pending tasks
  const sampleDoc = await prisma.document.create({
    data: {
      documentNumber: 'REC-2026-0001',
      type: 'receipt',
      partnerName: 'Apex Industrial Supplies',
      supplierId: supApex.id,
      warehouseId: mainWarehouse.id,
      status: 'waiting',
      notes: 'Scheduled delivery arriving by end of week',
      createdById: managerUser.id,
    },
  });

  const p1 = await prisma.product.findUnique({ where: { sku: 'RAW-STEEL-001' } });
  if (p1) {
    await prisma.documentItem.create({
      data: {
        documentId: sampleDoc.id,
        productId: p1.id,
        quantity: 50,
        fromLocationId: locVendors.id,
        toLocationId: locMainStore.id,
      },
    });
  }

  const sampleDelivery = await prisma.document.create({
    data: {
      documentNumber: 'DEL-2026-0001',
      type: 'delivery',
      partnerName: 'Acme MegaCorp Ltd',
      warehouseId: mainWarehouse.id,
      status: 'ready',
      notes: 'Customer pickup order waiting for dispatch',
      createdById: staffUser.id,
    },
  });

  const pChair = await prisma.product.findUnique({ where: { sku: 'FG-CHAIR-001' } });
  if (pChair) {
    await prisma.documentItem.create({
      data: {
        documentId: sampleDelivery.id,
        productId: pChair.id,
        quantity: 5,
        fromLocationId: locMainStore.id,
        toLocationId: locCustomers.id,
      },
    });
  }

  console.log('✓ Sample pending documents created for dashboard indicators');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
