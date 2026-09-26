import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const productId = searchParams.get('productId');
    const transactionType = searchParams.get('type');
    const locationId = searchParams.get('locationId');
    const warehouseId = searchParams.get('warehouseId');
    const limit = Number(searchParams.get('limit')) || 100;
    const page = Number(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      AND: [
        productId && productId !== 'all' ? { productId } : {},
        transactionType && transactionType !== 'all' ? { transactionType } : {},
        locationId && locationId !== 'all'
          ? {
              OR: [
                { fromLocationId: locationId },
                { toLocationId: locationId },
              ],
            }
          : {},
        warehouseId && warehouseId !== 'all'
          ? {
              OR: [
                { fromLocation: { warehouseId } },
                { toLocation: { warehouseId } },
              ],
            }
          : {},
        search
          ? {
              OR: [
                { referenceNumber: { contains: search } },
                { reason: { contains: search } },
                { product: { name: { contains: search } } },
                { product: { sku: { contains: search } } },
                { fromLocation: { name: { contains: search } } },
                { toLocation: { name: { contains: search } } },
              ],
            }
          : {},
      ],
    };

    const [totalCount, rawMoves] = await Promise.all([
      prisma.stockMove.count({ where: whereClause }),
      prisma.stockMove.findMany({
        where: whereClause,
        include: {
          product: {
            include: { category: true },
          },
          fromLocation: {
            include: { warehouse: true },
          },
          toLocation: {
            include: { warehouse: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          document: {
            select: { id: true, documentNumber: true, type: true, partnerName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    // Format moves with quantityIn and quantityOut semantics
    const formattedMoves = rawMoves.map((m) => {
      const isInternal = m.transactionType === 'internal';
      const isReceipt = m.transactionType === 'receipt';
      const isDelivery = m.transactionType === 'delivery';
      const isAdjustment = m.transactionType === 'adjustment';

      let quantityIn: number | null = null;
      let quantityOut: number | null = null;

      if (isReceipt) {
        quantityIn = m.quantity;
      } else if (isDelivery) {
        quantityOut = m.quantity;
      } else if (isInternal) {
        quantityIn = m.quantity;
        quantityOut = m.quantity;
      } else if (isAdjustment) {
        // If from virtual adjustment location -> location, it's an intake (+)
        if (m.fromLocation.isVirtual) {
          quantityIn = m.quantity;
        } else {
          quantityOut = m.quantity;
        }
      }

      return {
        id: m.id,
        createdAt: m.createdAt,
        product: {
          id: m.product.id,
          name: m.product.name,
          sku: m.product.sku,
          uom: m.product.uom,
          categoryName: m.product.category.name,
        },
        transactionType: m.transactionType,
        referenceNumber: m.referenceNumber,
        fromLocation: {
          id: m.fromLocation.id,
          name: m.fromLocation.name,
          code: m.fromLocation.code,
          isVirtual: m.fromLocation.isVirtual,
          warehouseName: m.fromLocation.warehouse?.name || 'External / System',
        },
        toLocation: {
          id: m.toLocation.id,
          name: m.toLocation.name,
          code: m.toLocation.code,
          isVirtual: m.toLocation.isVirtual,
          warehouseName: m.toLocation.warehouse?.name || 'External / System',
        },
        quantity: m.quantity,
        quantityIn,
        quantityOut,
        balanceAfter: m.balanceAfter,
        user: m.user ? m.user.name : 'System',
        reason: m.reason || 'Standard operation',
        documentId: m.documentId,
      };
    });

    return NextResponse.json({
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      moves: formattedMoves,
    });
  } catch (error) {
    console.error('Fetch ledger moves error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock moves.' }, { status: 500 });
  }
}
