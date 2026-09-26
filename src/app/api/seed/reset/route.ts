import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req, ['manager']);
    if (error || !user) return error;

    // Execute database reset and re-seed
    await prisma.stockMove.deleteMany();
    await prisma.documentItem.deleteMany();
    await prisma.document.deleteMany();
    await prisma.stockQuantity.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.location.deleteMany();
    await prisma.warehouse.deleteMany();

    // 1. Warehouses
    const mainWh = await prisma.warehouse.create({
      data: {
        name: 'Main Distribution Warehouse',
        code: 'WH-MAIN',
        address: '100 Industrial Parkway, North Logistics Hub',
        managerName: 'Alice Vance',
        status: 'active',
      },
    });

    const prodWh = await prisma.warehouse.create({
      data: {
        name: 'Production & Assembly Facility',
        code: 'WH-PROD',
        address: '205 Manufacturing Way, Sector 8',
        managerName: 'David Zhang',
        status: 'active',
      },
    });

    // 2. Locations
    const locVend = await prisma.location.create({
      data: { name: 'Vendors / External Suppliers', code: 'LOC-VEND', isVirtual: true, type: 'supplier' },
    });
    const locCust = await prisma.location.create({
      data: { name: 'Customers / External Deliveries', code: 'LOC-CUST', isVirtual: true, type: 'customer' },
    });
    const locAdj = await prisma.location.create({
      data: { name: 'Inventory Adjustments & Variance', code: 'LOC-ADJ', isVirtual: true, type: 'adjustment' },
    });

    const locMainStore = await prisma.location.create({
      data: { warehouseId: mainWh.id, name: 'Main Store - Bay 1', code: 'LOC-MAIN-STORE', isVirtual: false, type: 'internal' },
    });
    const locMainBulk = await prisma.location.create({
      data: { warehouseId: mainWh.id, name: 'Bulk Pallet Racks - Bay 2', code: 'LOC-MAIN-BULK', isVirtual: false, type: 'internal' },
    });
    const locProdRackA = await prisma.location.create({
      data: { warehouseId: prodWh.id, name: 'Production Rack A', code: 'LOC-PROD-RACK-A', isVirtual: false, type: 'internal' },
    });
    const locProdAssembly = await prisma.location.create({
      data: { warehouseId: prodWh.id, name: 'Assembly Staging Line', code: 'LOC-PROD-ASSEMBLY', isVirtual: false, type: 'internal' },
    });

    // 3. Categories
    const catRaw = await prisma.category.create({
      data: { name: 'Raw Materials', description: 'Primary structural and bulk materials' },
    });
    const catFinished = await prisma.category.create({
      data: { name: 'Finished Goods', description: 'Manufactured products ready for commercial delivery' },
    });
    const catElec = await prisma.category.create({
      data: { name: 'Electronics & Components', description: 'Circuitry and electrical subsystems' },
    });

    // 4. Suppliers
    const supApex = await prisma.supplier.create({
      data: { name: 'Apex Industrial Supplies', contactPerson: 'Robert Sterling', phone: '+1-555-0144', email: 'orders@apexindustrial.com', address: '77 Commerce Blvd, Chicago IL' },
    });

    // 5. Products
    const items = [
      { name: 'Structural Steel Rods', sku: 'RAW-STEEL-001', categoryId: catRaw.id, uom: 'kg', reorderMin: 30, reorderMax: 200, qty: 100, loc: locMainStore.id },
      { name: 'Insulated Copper Cable', sku: 'RAW-COPP-002', categoryId: catRaw.id, uom: 'meters', reorderMin: 100, reorderMax: 500, qty: 320, loc: locMainStore.id },
      { name: 'Anodized Aluminum Sheets', sku: 'RAW-ALUM-003', categoryId: catRaw.id, uom: 'sheets', reorderMin: 25, reorderMax: 100, qty: 8, loc: locMainStore.id },
      { name: 'Ergonomic Task Chair V2', sku: 'FG-CHAIR-001', categoryId: catFinished.id, uom: 'units', reorderMin: 15, reorderMax: 80, qty: 45, loc: locMainStore.id },
      { name: 'Modular Executive Desk', sku: 'FG-DESK-002', categoryId: catFinished.id, uom: 'units', reorderMin: 10, reorderMax: 50, qty: 0, loc: locMainStore.id },
      { name: 'Industrial Standing Air Mover', sku: 'FG-FAN-003', categoryId: catFinished.id, uom: 'units', reorderMin: 12, reorderMax: 60, qty: 4, loc: locProdRackA.id },
      { name: 'ESP32-S3 Microcontroller Board', sku: 'ELEC-MCU-001', categoryId: catElec.id, uom: 'pcs', reorderMin: 50, reorderMax: 300, qty: 180, loc: locMainStore.id },
      { name: 'Industrial Switching PSU 24V 10A', sku: 'ELEC-PSU-002', categoryId: catElec.id, uom: 'pcs', reorderMin: 20, reorderMax: 80, qty: 38, loc: locMainBulk.id },
      { name: 'SMD Ceramic Capacitors Kit', sku: 'ELEC-CAP-003', categoryId: catElec.id, uom: 'packs', reorderMin: 30, reorderMax: 150, qty: 12, loc: locProdRackA.id },
      { name: 'NEMA 23 Bipolar Stepper Motor', sku: 'ELEC-MOT-004', categoryId: catElec.id, uom: 'pcs', reorderMin: 15, reorderMax: 60, qty: 0, loc: locProdRackA.id },
    ];

    for (const it of items) {
      const p = await prisma.product.create({
        data: {
          name: it.name,
          sku: it.sku,
          categoryId: it.categoryId,
          uom: it.uom,
          reorderMin: it.reorderMin,
          reorderMax: it.reorderMax,
        },
      });

      if (it.qty > 0) {
        await prisma.stockQuantity.create({
          data: { productId: p.id, locationId: it.loc, quantity: it.qty },
        });

        await prisma.stockMove.create({
          data: {
            productId: p.id,
            fromLocationId: locVend.id,
            toLocationId: it.loc,
            quantity: it.qty,
            balanceAfter: it.qty,
            transactionType: 'receipt',
            referenceNumber: `INIT-${p.sku}`,
            userId: user.id,
            reason: 'Demo initialization / Stock balance restore',
          },
        });
      }
    }

    return NextResponse.json({ message: 'Demo data reset successfully.' });
  } catch (err: any) {
    console.error('Reset error:', err);
    return NextResponse.json({ error: err.message || 'Reset failed' }, { status: 500 });
  }
}
