import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const categoryId = searchParams.get('categoryId');
    const docType = searchParams.get('docType');
    const status = searchParams.get('status');

    // 1. Fetch all products with current stock quantities
    const products = await prisma.product.findMany({
      where: {
        AND: [
          categoryId && categoryId !== 'all' ? { categoryId } : {},
          { status: 'active' },
        ],
      },
      include: {
        category: true,
        stockQuantities: {
          include: {
            location: true,
          },
        },
      },
    });

    // Compute live stock totals
    let totalProductsInStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: any[] = [];

    // Category distribution map
    const categoryStockMap: Record<string, { name: string; quantity: number; productCount: number }> = {};
    // Warehouse distribution map
    const warehouseStockMap: Record<string, { name: string; quantity: number }> = {};

    products.forEach((prod) => {
      // Filter internal locations only
      let validStocks = prod.stockQuantities.filter((sq) => !sq.location.isVirtual);
      if (warehouseId && warehouseId !== 'all') {
        validStocks = validStocks.filter((sq) => sq.location.warehouseId === warehouseId);
      }

      const totalQty = validStocks.reduce((sum, sq) => sum + sq.quantity, 0);

      if (totalQty > 0) {
        totalProductsInStock++;
      }

      if (totalQty <= 0) {
        outOfStockCount++;
        lowStockItems.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category.name,
          currentStock: totalQty,
          reorderMin: prod.reorderMin,
          uom: prod.uom,
          status: 'out_of_stock',
        });
      } else if (totalQty <= prod.reorderMin) {
        lowStockCount++;
        lowStockItems.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category.name,
          currentStock: totalQty,
          reorderMin: prod.reorderMin,
          uom: prod.uom,
          status: 'low_stock',
        });
      }

      // Aggregate category stock
      if (!categoryStockMap[prod.category.name]) {
        categoryStockMap[prod.category.name] = {
          name: prod.category.name,
          quantity: 0,
          productCount: 0,
        };
      }
      categoryStockMap[prod.category.name].quantity += totalQty;
      categoryStockMap[prod.category.name].productCount += 1;

      // Aggregate warehouse stock
      validStocks.forEach((sq) => {
        const whName = sq.location.warehouseId ? 'Assigned Warehouses' : 'Other';
        // fetch warehouse name if present
        if (!warehouseStockMap[sq.location.warehouseId || 'unassigned']) {
          warehouseStockMap[sq.location.warehouseId || 'unassigned'] = {
            name: sq.location.warehouseId ? 'WH' : 'Other',
            quantity: 0,
          };
        }
        warehouseStockMap[sq.location.warehouseId || 'unassigned'].quantity += sq.quantity;
      });
    });

    // 2. Fetch Document status counts (live)
    const docWhere: any = {
      AND: [
        warehouseId && warehouseId !== 'all' ? { warehouseId } : {},
      ],
    };

    const allDocuments = await prisma.document.findMany({
      where: docWhere,
      select: {
        id: true,
        type: true,
        status: true,
      },
    });

    const pendingReceipts = allDocuments.filter(
      (d) => d.type === 'receipt' && ['draft', 'waiting', 'ready'].includes(d.status)
    ).length;

    const pendingDeliveries = allDocuments.filter(
      (d) => d.type === 'delivery' && ['draft', 'waiting', 'ready'].includes(d.status)
    ).length;

    const scheduledTransfers = allDocuments.filter(
      (d) => d.type === 'internal' && ['draft', 'waiting', 'ready'].includes(d.status)
    ).length;

    // 3. Fetch Warehouses for chart labelling
    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: {
          include: {
            stockQuantities: true,
          },
        },
      },
    });

    const warehouseChartData = warehouses.map((wh) => {
      let totalQty = 0;
      wh.locations.forEach((loc) => {
        loc.stockQuantities.forEach((sq) => {
          totalQty += sq.quantity;
        });
      });
      return {
        name: wh.name.length > 18 ? wh.name.substring(0, 18) + '...' : wh.name,
        code: wh.code,
        quantity: totalQty,
      };
    });

    const categoryChartData = Object.values(categoryStockMap);

    // 4. Fetch recent inventory movements
    const recentMoves = await prisma.stockMove.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        fromLocation: true,
        toLocation: true,
        user: { select: { name: true } },
      },
    });

    // 5. Incoming vs Outgoing stats
    const totalMoves = await prisma.stockMove.findMany({
      select: {
        transactionType: true,
        quantity: true,
      },
    });

    let totalIncomingQty = 0;
    let totalOutgoingQty = 0;
    let totalTransferredQty = 0;
    let totalAdjustedQty = 0;

    totalMoves.forEach((m) => {
      if (m.transactionType === 'receipt') totalIncomingQty += m.quantity;
      if (m.transactionType === 'delivery') totalOutgoingQty += m.quantity;
      if (m.transactionType === 'internal') totalTransferredQty += m.quantity;
      if (m.transactionType === 'adjustment') totalAdjustedQty += m.quantity;
    });

    // 6. Filtered document feed if filter applied
    const filteredDocs = await prisma.document.findMany({
      where: {
        AND: [
          docType && docType !== 'all' ? { type: docType } : {},
          status && status !== 'all' ? { status } : {},
          warehouseId && warehouseId !== 'all' ? { warehouseId } : {},
          categoryId && categoryId !== 'all'
            ? { items: { some: { product: { categoryId } } } }
            : {},
        ],
      },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      kpis: {
        totalProductsInStock,
        totalProductsCount: products.length,
        lowStockCount,
        outOfStockCount,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
      },
      lowStockItems: lowStockItems.slice(0, 8),
      charts: {
        stockByCategory: categoryChartData,
        stockByWarehouse: warehouseChartData,
        movementsDistribution: [
          { name: 'Incoming (Receipts)', value: totalIncomingQty, fill: '#10b981' },
          { name: 'Outgoing (Deliveries)', value: totalOutgoingQty, fill: '#ef4444' },
          { name: 'Internal Transfers', value: totalTransferredQty, fill: '#3b82f6' },
          { name: 'Adjustments', value: totalAdjustedQty, fill: '#f59e0b' },
        ],
      },
      recentMoves: recentMoves.map((m) => ({
        id: m.id,
        time: m.createdAt,
        productName: m.product.name,
        sku: m.product.sku,
        type: m.transactionType,
        quantity: m.quantity,
        uom: m.product.uom,
        from: m.fromLocation.name,
        to: m.toLocation.name,
        user: m.user?.name || 'System',
      })),
      filteredDocuments: filteredDocs,
    });
  } catch (error) {
    console.error('Fetch dashboard data error:', error);
    return NextResponse.json({ error: 'Failed to compute dashboard metrics.' }, { status: 500 });
  }
}
