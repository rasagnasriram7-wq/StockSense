import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('categoryId');
    const warehouseId = searchParams.get('warehouseId');
    const statusFilter = searchParams.get('status'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'

    // Fetch products with category and stock quantities at internal locations
    const products = await prisma.product.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { sku: { contains: search } },
                  { description: { contains: search } },
                ],
              }
            : {},
          categoryId && categoryId !== 'all' ? { categoryId } : {},
          { status: 'active' },
        ],
      },
      include: {
        category: true,
        stockQuantities: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stock totals across internal locations
    const enriched = products.map((prod) => {
      // Internal locations only (exclude virtual vendor/customer/adjustment)
      const internalStocks = prod.stockQuantities.filter(
        (sq) => sq.location && !sq.location.isVirtual
      );

      // Filter by warehouse if specified
      const filteredStocks = warehouseId && warehouseId !== 'all'
        ? internalStocks.filter((sq) => sq.location?.warehouseId === warehouseId)
        : internalStocks;

      const totalQuantity = filteredStocks.reduce((sum, sq) => sum + sq.quantity, 0);

      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (totalQuantity <= 0) {
        stockStatus = 'out_of_stock';
      } else if (totalQuantity <= prod.reorderMin) {
        stockStatus = 'low_stock';
      }

      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        categoryId: prod.categoryId,
        categoryName: prod.category.name,
        uom: prod.uom,
        reorderMin: prod.reorderMin,
        reorderMax: prod.reorderMax,
        description: prod.description,
        totalQuantity,
        stockStatus,
        stockPerLocation: filteredStocks.map((sq) => ({
          locationId: sq.locationId,
          locationName: sq.location.name,
          locationCode: sq.location.code,
          warehouseName: sq.location.warehouse?.name || 'Unassigned',
          quantity: sq.quantity,
        })),
        createdAt: prod.createdAt,
      };
    });

    // Apply status filter
    const finalProducts = statusFilter && statusFilter !== 'all'
      ? enriched.filter((p) => p.stockStatus === statusFilter)
      : enriched;

    return NextResponse.json({ products: finalProducts });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const data = await req.json();
    const {
      name,
      sku,
      categoryId,
      uom,
      reorderMin,
      reorderMax,
      description,
      initialStock,
      initialLocationId,
    } = data;

    if (!name || !sku || !categoryId) {
      return NextResponse.json(
        { error: 'Product Name, SKU, and Category are required.' },
        { status: 400 }
      );
    }

    const cleanSku = sku.toUpperCase().trim();

    // Check duplicate SKU
    const existing = await prisma.product.findUnique({
      where: { sku: cleanSku },
    });

    if (existing) {
      return NextResponse.json(
        { error: `SKU already exists: "${cleanSku}". SKU must be unique.` },
        { status: 400 }
      );
    }

    // Create product inside a transaction (including initial stock & ledger if provided)
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          sku: cleanSku,
          categoryId,
          uom: uom || 'units',
          reorderMin: reorderMin !== undefined ? Number(reorderMin) : 10,
          reorderMax: reorderMax !== undefined ? Number(reorderMax) : 100,
          description: description ? description.trim() : null,
          status: 'active',
        },
        include: { category: true },
      });

      const initQty = Number(initialStock) || 0;
      if (initQty > 0 && initialLocationId) {
        // Ensure location exists and is internal
        const loc = await tx.location.findUnique({
          where: { id: initialLocationId },
        });

        if (loc) {
          // Find or create virtual supplier location for initial intake
          let locVend = await tx.location.findFirst({
            where: { code: 'LOC-VEND' },
          });

          if (!locVend) {
            locVend = await tx.location.create({
              data: {
                name: 'Vendors / External Suppliers',
                code: 'LOC-VEND',
                isVirtual: true,
                type: 'supplier',
              },
            });
          }

          // Create stock quantity
          await tx.stockQuantity.create({
            data: {
              productId: created.id,
              locationId: loc.id,
              quantity: initQty,
            },
          });

          // Create permanent initial stock move ledger record
          await tx.stockMove.create({
            data: {
              productId: created.id,
              fromLocationId: locVend.id,
              toLocationId: loc.id,
              quantity: initQty,
              balanceAfter: initQty,
              transactionType: 'receipt',
              referenceNumber: `INIT-${created.sku}`,
              userId: user.id,
              reason: 'Initial stock setup upon product creation',
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json({
      message: 'Product created successfully',
      product,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Create product error:', err);
    return NextResponse.json(
      { error: err.message || 'Product could not be created.' },
      { status: 500 }
    );
  }
}
