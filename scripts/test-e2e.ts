import { PrismaClient } from '@prisma/client';
import { validateDocument } from '../src/lib/stock-service';

const prisma = new PrismaClient();

async function runScenarioTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING STOCKSENSE END-TO-END BUSINESS SCENARIO TEST');
  console.log('======================================================\n');

  // 1. Get test users and locations
  const manager = await prisma.user.findFirst({ where: { role: 'manager' } });
  if (!manager) throw new Error('Manager user not found');

  const locMainStore = await prisma.location.findFirst({ where: { code: 'LOC-MAIN-STORE' } });
  const locProdRack = await prisma.location.findFirst({ where: { code: 'LOC-PROD-RACK-A' } });
  const locVend = await prisma.location.findFirst({ where: { code: 'LOC-VEND' } });
  const locCust = await prisma.location.findFirst({ where: { code: 'LOC-CUST' } });

  if (!locMainStore || !locProdRack || !locVend || !locCust) {
    throw new Error('Required locations not found in DB');
  }

  // Find Steel Rods product
  const steel = await prisma.product.findUnique({ where: { sku: 'RAW-STEEL-001' } });
  if (!steel) throw new Error('RAW-STEEL-001 not found');

  // Find Finished Goods Chair
  const chair = await prisma.product.findUnique({ where: { sku: 'FG-CHAIR-001' } });
  if (!chair) throw new Error('FG-CHAIR-001 not found');

  console.log(`Starting Steel stock at Main Store:`);
  const initialSteelStock = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: steel.id, locationId: locMainStore.id } },
  });
  console.log(`- Main Store Steel: ${initialSteelStock?.quantity || 0} kg`);

  // ==========================================================
  // SCENARIO STEP 1: Receive 100kg Steel (Receipt, +100)
  // ==========================================================
  console.log('\n--- Step 1: Create and Validate Receipt for 100kg Steel ---');
  const receiptDoc = await prisma.document.create({
    data: {
      documentNumber: `TEST-REC-${Date.now()}`,
      type: 'receipt',
      partnerName: 'Apex Industrial Supplies',
      status: 'draft',
      notes: 'Test shipment of 100kg structural steel',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: steel.id,
            quantity: 100,
            fromLocationId: locVend.id,
            toLocationId: locMainStore.id,
          },
        ],
      },
    },
  });

  // Verify stock did NOT change while draft
  const steelWhileDraft = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: steel.id, locationId: locMainStore.id } },
  });
  if (steelWhileDraft?.quantity !== initialSteelStock?.quantity) {
    throw new Error('Stock should NOT change while document is in draft state!');
  }
  console.log('✓ Invariant verified: Draft receipt did not alter stock.');

  // Validate Receipt
  await validateDocument(receiptDoc.id, manager.id);

  const steelAfterReceipt = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: steel.id, locationId: locMainStore.id } },
  });
  const expectedSteelAfterReceipt = (initialSteelStock?.quantity || 0) + 100;
  console.log(`✓ Receipt Validated! Steel at Main Store: ${steelAfterReceipt?.quantity} kg (Expected: ${expectedSteelAfterReceipt} kg)`);
  if (steelAfterReceipt?.quantity !== expectedSteelAfterReceipt) {
    throw new Error('Receipt stock addition mismatch!');
  }

  // ==========================================================
  // SCENARIO STEP 2: Transfer Main Store to Production Rack (location change only)
  // ==========================================================
  console.log('\n--- Step 2: Internal Transfer Main Store -> Production Rack (50kg Steel) ---');
  const transferDoc = await prisma.document.create({
    data: {
      documentNumber: `TEST-INT-${Date.now()}`,
      type: 'internal',
      status: 'draft',
      notes: 'Transfer 50kg steel to production staging',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: steel.id,
            quantity: 50,
            fromLocationId: locMainStore.id,
            toLocationId: locProdRack.id,
          },
        ],
      },
    },
  });

  await validateDocument(transferDoc.id, manager.id);

  const steelMainAfterTransfer = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: steel.id, locationId: locMainStore.id } },
  });
  const steelRackAfterTransfer = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: steel.id, locationId: locProdRack.id } },
  });

  console.log(`✓ Transfer Validated!`);
  console.log(`  - Main Store: ${steelMainAfterTransfer?.quantity} kg`);
  console.log(`  - Production Rack A: ${steelRackAfterTransfer?.quantity} kg`);
  console.log(`  - Total Company Steel Stock: ${(steelMainAfterTransfer?.quantity || 0) + (steelRackAfterTransfer?.quantity || 0)} kg`);

  if (
    steelMainAfterTransfer?.quantity !== expectedSteelAfterReceipt - 50 ||
    steelRackAfterTransfer?.quantity !== 50
  ) {
    throw new Error('Internal transfer quantities incorrect!');
  }

  // ==========================================================
  // SCENARIO STEP 3: Deliver 20 units of finished goods (Delivery, -20)
  // ==========================================================
  console.log('\n--- Step 3: Deliver 20 Chairs (Delivery, -20 units) ---');
  const initialChairStock = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: chair.id, locationId: locMainStore.id } },
  });
  console.log(`Initial Chair stock at Main Store: ${initialChairStock?.quantity || 0} units`);

  const deliveryDoc = await prisma.document.create({
    data: {
      documentNumber: `TEST-DEL-${Date.now()}`,
      type: 'delivery',
      partnerName: 'Global Commercial Spaces LLC',
      status: 'draft',
      notes: 'Dispatch 20 ergonomic chairs',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: chair.id,
            quantity: 20,
            fromLocationId: locMainStore.id,
            toLocationId: locCust.id,
          },
        ],
      },
    },
  });

  await validateDocument(deliveryDoc.id, manager.id);

  const chairAfterDelivery = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: chair.id, locationId: locMainStore.id } },
  });
  const expectedChairAfterDelivery = (initialChairStock?.quantity || 0) - 20;
  console.log(`✓ Delivery Validated! Remaining Chairs: ${chairAfterDelivery?.quantity} (Expected: ${expectedChairAfterDelivery})`);
  if (chairAfterDelivery?.quantity !== expectedChairAfterDelivery) {
    throw new Error('Delivery stock deduction mismatch!');
  }

  // Test insufficient stock rejection
  console.log('Testing insufficient stock prevention...');
  const badDelivery = await prisma.document.create({
    data: {
      documentNumber: `TEST-DEL-BAD-${Date.now()}`,
      type: 'delivery',
      partnerName: 'Invalid Customer',
      status: 'draft',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: chair.id,
            quantity: 99999, // Exceeds available
            fromLocationId: locMainStore.id,
            toLocationId: locCust.id,
          },
        ],
      },
    },
  });

  let errorCaught = false;
  try {
    await validateDocument(badDelivery.id, manager.id);
  } catch (err: any) {
    errorCaught = true;
    console.log(`✓ Successfully prevented over-delivery: "${err.message}"`);
  }
  if (!errorCaught) throw new Error('Validation failed to prevent delivery exceeding stock!');

  // ==========================================================
  // SCENARIO STEP 4: Adjust 3kg Steel damaged (Adjustment, -3)
  // ==========================================================
  console.log('\n--- Step 4: Adjust 3kg Steel Damaged at Production Rack (Adjustment, -3kg) ---');
  const currentRackSteel = steelRackAfterTransfer?.quantity || 50;
  const countedPhysical = currentRackSteel - 3; // e.g. 47 kg

  const adjustmentDoc = await prisma.document.create({
    data: {
      documentNumber: `TEST-ADJ-${Date.now()}`,
      type: 'adjustment',
      status: 'draft',
      notes: '3kg steel damaged during rack staging inspection',
      createdById: manager.id,
      items: {
        create: [
          {
            productId: steel.id,
            quantity: 3,
            countedQuantity: countedPhysical,
            difference: -3,
            fromLocationId: locProdRack.id,
            toLocationId: locProdRack.id,
          },
        ],
      },
    },
  });

  await validateDocument(adjustmentDoc.id, manager.id);

  const steelRackAfterAdj = await prisma.stockQuantity.findUnique({
    where: { productId_locationId: { productId: steel.id, locationId: locProdRack.id } },
  });
  console.log(`✓ Adjustment Validated! Production Rack Steel: ${steelRackAfterAdj?.quantity} kg (Expected: ${countedPhysical} kg)`);
  if (steelRackAfterAdj?.quantity !== countedPhysical) {
    throw new Error('Stock adjustment quantity mismatch!');
  }

  // ==========================================================
  // SCENARIO STEP 5: Verify Ledger and Audit Trail
  // ==========================================================
  console.log('\n--- Step 5: Verify Immutable Stock Ledger Entries ---');
  const moves = await prisma.stockMove.findMany({
    where: {
      documentId: { in: [receiptDoc.id, transferDoc.id, deliveryDoc.id, adjustmentDoc.id] },
    },
    include: {
      fromLocation: true,
      toLocation: true,
      product: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${moves.length} ledger transactions for the 4 operations:`);
  moves.forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.transactionType.toUpperCase()}] ${m.quantity} ${m.product.uom} of ${m.product.name} | From: ${m.fromLocation.name} -> To: ${m.toLocation.name} | Ref: ${m.referenceNumber}`);
  });

  if (moves.length !== 4) {
    throw new Error(`Expected exactly 4 ledger entries, found ${moves.length}`);
  }

  console.log('\n🎉 ALL 4 CORE BUSINESS INVENTORY SCENARIOS PASSED WITH 100% ACCURACY!\n');
}

runScenarioTest()
  .catch((err) => {
    console.error('❌ Test scenario failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
