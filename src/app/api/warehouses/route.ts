import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: {
          include: {
            stockQuantities: {
              include: { product: true },
            },
          },
        },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Format summary
    const formatted = warehouses.map((wh) => {
      let totalStockUnits = 0;
      wh.locations.forEach((loc) => {
        loc.stockQuantities.forEach((sq) => {
          totalStockUnits += sq.quantity;
        });
      });

      return {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        address: wh.address,
        managerName: wh.managerName,
        status: wh.status,
        locationsCount: wh.locations.length,
        totalStockUnits,
        locations: wh.locations.map((loc) => ({
          id: loc.id,
          name: loc.name,
          code: loc.code,
          type: loc.type,
          isVirtual: loc.isVirtual,
          itemCount: loc.stockQuantities.length,
          totalQty: loc.stockQuantities.reduce((s, q) => s + q.quantity, 0),
        })),
      };
    });

    return NextResponse.json({ warehouses: formatted });
  } catch (error) {
    console.error('Fetch warehouses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouses.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req, ['manager']);
    if (error || !user) return error;

    const { name, code, address, managerName, status } = await req.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Warehouse name and code are required.' },
        { status: 400 }
      );
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = await prisma.warehouse.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Warehouse code "${cleanCode}" already exists.` },
        { status: 400 }
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        address: address ? address.trim() : null,
        managerName: managerName ? managerName.trim() : null,
        status: status || 'active',
      },
    });

    return NextResponse.json({ message: 'Warehouse created', warehouse }, { status: 201 });
  } catch (err: any) {
    console.error('Create warehouse error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create warehouse.' },
      { status: 500 }
    );
  }
}
