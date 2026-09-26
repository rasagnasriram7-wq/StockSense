import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRecentPipelineEvents } from '@/lib/pipeline-events';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');

    const whereBase: any = warehouseId && warehouseId !== 'all' ? { warehouseId } : {};

    // Fetch active pipeline documents in parallel
    const [inboundDocs, internalDocs, outboundDocs, recentMoves] = await Promise.all([
      prisma.document.findMany({
        where: {
          ...whereBase,
          type: 'receipt',
          status: { in: ['draft', 'waiting', 'ready', 'done'] },
        },
        include: {
          supplier: true,
          warehouse: true,
          items: { include: { product: true, toLocation: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.document.findMany({
        where: {
          ...whereBase,
          type: 'internal',
          status: { in: ['draft', 'ready', 'done'] },
        },
        include: {
          warehouse: true,
          items: { include: { product: true, fromLocation: true, toLocation: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.document.findMany({
        where: {
          ...whereBase,
          type: 'delivery',
          status: { in: ['draft', 'waiting', 'ready', 'done'] },
        },
        include: {
          warehouse: true,
          items: { include: { product: true, fromLocation: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.stockMove.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    // Calculate pipeline stage quantities
    let inboundDraftUnits = 0;
    let inboundInTransitUnits = 0;
    let inboundReadyUnits = 0;
    let inboundCompletedUnits = 0;

    inboundDocs.forEach((d) => {
      const units = d.items.reduce((s, it) => s + it.quantity, 0);
      if (d.status === 'draft') inboundDraftUnits += units;
      else if (d.status === 'waiting') inboundInTransitUnits += units;
      else if (d.status === 'ready') inboundReadyUnits += units;
      else if (d.status === 'done') inboundCompletedUnits += units;
    });

    let outboundDraftUnits = 0;
    let outboundPickingUnits = 0;
    let outboundReadyUnits = 0;
    let outboundDispatchedUnits = 0;

    outboundDocs.forEach((d) => {
      const units = d.items.reduce((s, it) => s + it.quantity, 0);
      if (d.status === 'draft') outboundDraftUnits += units;
      else if (d.status === 'waiting') outboundPickingUnits += units;
      else if (d.status === 'ready') outboundReadyUnits += units;
      else if (d.status === 'done') outboundDispatchedUnits += units;
    });

    let internalPendingUnits = 0;
    let internalCompletedUnits = 0;

    internalDocs.forEach((d) => {
      const units = d.items.reduce((s, it) => s + it.quantity, 0);
      if (d.status !== 'done' && d.status !== 'cancelled') internalPendingUnits += units;
      else if (d.status === 'done') internalCompletedUnits += units;
    });

    const recentStreamEvents = getRecentPipelineEvents();

    return NextResponse.json({
      metrics: {
        activeInboundUnits: inboundDraftUnits + inboundInTransitUnits + inboundReadyUnits,
        activeOutboundUnits: outboundDraftUnits + outboundPickingUnits + outboundReadyUnits,
        activeInternalTransferUnits: internalPendingUnits,
        totalCompletedFlowUnits: inboundCompletedUnits + outboundDispatchedUnits + internalCompletedUnits,
        liveThroughputPerHour: Math.round((recentMoves.length * 12) + (inboundCompletedUnits * 0.4)),
      },
      stages: {
        inbound: {
          draft: inboundDocs.filter((d) => d.status === 'draft'),
          inTransit: inboundDocs.filter((d) => d.status === 'waiting'),
          dockReady: inboundDocs.filter((d) => d.status === 'ready'),
          received: inboundDocs.filter((d) => d.status === 'done').slice(0, 5),
          stats: { draft: inboundDraftUnits, inTransit: inboundInTransitUnits, ready: inboundReadyUnits, completed: inboundCompletedUnits },
        },
        internal: {
          scheduled: internalDocs.filter((d) => d.status !== 'done' && d.status !== 'cancelled'),
          completed: internalDocs.filter((d) => d.status === 'done').slice(0, 5),
          stats: { pending: internalPendingUnits, completed: internalCompletedUnits },
        },
        outbound: {
          draft: outboundDocs.filter((d) => d.status === 'draft'),
          picking: outboundDocs.filter((d) => d.status === 'waiting'),
          packed: outboundDocs.filter((d) => d.status === 'ready'),
          dispatched: outboundDocs.filter((d) => d.status === 'done').slice(0, 5),
          stats: { draft: outboundDraftUnits, picking: outboundPickingUnits, packed: outboundReadyUnits, dispatched: outboundDispatchedUnits },
        },
      },
      recentEvents: recentStreamEvents,
      recentMoves: recentMoves.map((m) => ({
        id: m.id,
        timestamp: m.createdAt,
        product: `${m.product.name} (${m.product.sku})`,
        type: m.transactionType,
        quantity: m.quantity,
        uom: m.product.uom,
        from: m.fromLocation.name,
        to: m.toLocation.name,
        operator: m.user?.name || 'System',
      })),
    });
  } catch (error) {
    console.error('Fetch pipeline data error:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline snapshot.' }, { status: 500 });
  }
}
