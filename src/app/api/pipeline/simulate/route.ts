import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastPipelineEvent } from '@/lib/pipeline-events';

export async function POST(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      include: { stockQuantities: { include: { location: true } } },
      take: 6,
    });

    const locations = await prisma.location.findMany({
      where: { isVirtual: false },
      take: 4,
    });

    if (products.length === 0 || locations.length === 0) {
      return NextResponse.json({ error: 'No products or locations available.' }, { status: 400 });
    }

    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const destLoc = locations.find((l) => l.id !== randomLoc.id) || locations[0];

    const actions = ['receipt_arrived', 'internal_movement', 'order_dispatched', 'quality_check'];
    const chosenAction = actions[Math.floor(Math.random() * actions.length)];
    const qty = Math.floor(Math.random() * 25) + 5;

    let emittedEvent: any;

    if (chosenAction === 'receipt_arrived') {
      emittedEvent = broadcastPipelineEvent({
        type: 'receipt',
        stage: 'inbound',
        title: `INBOUND: Supplier Truck Docked at Bay 1`,
        message: `Carrier Vanguard Steel delivered +${qty} ${randomProduct.uom} of ${randomProduct.name}`,
        documentNumber: `REC-LIVE-${Date.now().toString().slice(-4)}`,
        productName: randomProduct.name,
        sku: randomProduct.sku,
        quantity: qty,
        uom: randomProduct.uom,
        fromLocation: 'Vendors / External Suppliers',
        toLocation: randomLoc.name,
        user: 'Dock Automation',
        status: 'ready',
      });
    } else if (chosenAction === 'internal_movement') {
      emittedEvent = broadcastPipelineEvent({
        type: 'internal',
        stage: 'internal',
        title: `TRANSFER: Automated Rack Conveyor`,
        message: `Autonomous AGV moved ${qty} ${randomProduct.uom} of ${randomProduct.name} to ${destLoc.name}`,
        documentNumber: `INT-LIVE-${Date.now().toString().slice(-4)}`,
        productName: randomProduct.name,
        sku: randomProduct.sku,
        quantity: qty,
        uom: randomProduct.uom,
        fromLocation: randomLoc.name,
        toLocation: destLoc.name,
        user: 'Robotics Line 2',
        status: 'done',
      });
    } else if (chosenAction === 'order_dispatched') {
      emittedEvent = broadcastPipelineEvent({
        type: 'delivery',
        stage: 'outbound',
        title: `DISPATCH: Express Customer Freight Packed`,
        message: `Order verified: -${qty} ${randomProduct.uom} of ${randomProduct.name} loaded on outbound courier`,
        documentNumber: `DEL-LIVE-${Date.now().toString().slice(-4)}`,
        productName: randomProduct.name,
        sku: randomProduct.sku,
        quantity: qty,
        uom: randomProduct.uom,
        fromLocation: randomLoc.name,
        toLocation: 'Customers / External Deliveries',
        user: 'Packaging Team',
        status: 'done',
      });
    } else {
      emittedEvent = broadcastPipelineEvent({
        type: 'status_change',
        stage: 'staging',
        title: `TELEMETRY: Quality Audit Staging Verified`,
        message: `Sensors verified ambient storage conditions and batch integrity for ${randomProduct.name}`,
        documentNumber: `AUDIT-${Date.now().toString().slice(-4)}`,
        productName: randomProduct.name,
        sku: randomProduct.sku,
        quantity: qty,
        uom: randomProduct.uom,
        fromLocation: randomLoc.name,
        toLocation: randomLoc.name,
        user: 'IoT Gateway',
        status: 'waiting',
      });
    }

    return NextResponse.json({
      success: true,
      event: emittedEvent,
      message: 'Live pipeline telemetry event broadcast successfully.',
    });
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: error.message || 'Simulation failed' }, { status: 500 });
  }
}
