import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockQuantities: {
          include: {
            location: {
              include: { warehouse: true },
            },
          },
        },
        stockMoves: {
          include: {
            fromLocation: true,
            toLocation: true,
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const internalStocks = product.stockQuantities.filter(
      (sq) => sq.location && !sq.location.isVirtual
    );
    const totalQuantity = internalStocks.reduce((sum, sq) => sum + sq.quantity, 0);

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (totalQuantity <= 0) stockStatus = 'out_of_stock';
    else if (totalQuantity <= product.reorderMin) stockStatus = 'low_stock';

    return NextResponse.json({
      product: {
        ...product,
        totalQuantity,
        stockStatus,
      },
    });
  } catch (error) {
    console.error('Fetch product detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product details.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { id } = await params;
    const body = await req.json();
    const { name, sku, categoryId, uom, reorderMin, reorderMax, description, status } = body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Check SKU collision if SKU changed
    if (sku && sku.toUpperCase().trim() !== existing.sku) {
      const cleanSku = sku.toUpperCase().trim();
      const conflict = await prisma.product.findUnique({
        where: { sku: cleanSku },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `SKU already exists: "${cleanSku}".` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        sku: sku ? sku.toUpperCase().trim() : existing.sku,
        categoryId: categoryId || existing.categoryId,
        uom: uom || existing.uom,
        reorderMin: reorderMin !== undefined ? Number(reorderMin) : existing.reorderMin,
        reorderMax: reorderMax !== undefined ? Number(reorderMax) : existing.reorderMax,
        description: description !== undefined ? description : existing.description,
        status: status || existing.status,
      },
      include: { category: true },
    });

    return NextResponse.json({
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (err: any) {
    console.error('Update product error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update product.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth(req, ['manager']);
    if (error || !user) return error;

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMoves: { take: 1 },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // If product has ledger history, archive it rather than delete to preserve audit trail
    if (product.stockMoves.length > 0) {
      await prisma.product.update({
        where: { id },
        data: { status: 'archived' },
      });
      return NextResponse.json({
        message: 'Product has historical ledger transactions and was archived to preserve audit logs.',
      });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product.' },
      { status: 500 }
    );
  }
}
