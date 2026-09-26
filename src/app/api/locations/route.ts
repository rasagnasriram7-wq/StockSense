import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const includeVirtual = searchParams.get('includeVirtual') === 'true';
    const type = searchParams.get('type');

    const locations = await prisma.location.findMany({
      where: {
        AND: [
          warehouseId ? { warehouseId } : {},
          !includeVirtual ? { isVirtual: false } : {},
          type ? { type } : {},
        ],
      },
      include: {
        warehouse: true,
        stockQuantities: {
          include: {
            product: { select: { id: true, name: true, sku: true, uom: true } },
          },
        },
      },
      orderBy: [{ isVirtual: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Fetch locations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req, ['manager']);
    if (error || !user) return error;

    const { warehouseId, name, code, isVirtual, type } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Location Name and Code are required.' },
        { status: 400 }
      );
    }

    if (!isVirtual && !warehouseId) {
      return NextResponse.json(
        { error: 'Physical internal locations must belong to a warehouse.' },
        { status: 400 }
      );
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = await prisma.location.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Location code "${cleanCode}" already exists.` },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        warehouseId: isVirtual ? null : warehouseId,
        name: name.trim(),
        code: cleanCode,
        isVirtual: Boolean(isVirtual),
        type: type || 'internal',
      },
      include: { warehouse: true },
    });

    return NextResponse.json({ message: 'Location created', location }, { status: 201 });
  } catch (err: any) {
    console.error('Create location error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create location.' },
      { status: 500 }
    );
  }
}
