import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth(req, ['manager']);
    if (error || !user) return error;

    const { id } = await params;
    const { name, code, type, warehouseId } = await req.json();

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (code && code.toUpperCase().trim() !== existing.code) {
      const cleanCode = code.toUpperCase().trim();
      const conflict = await prisma.location.findUnique({ where: { code: cleanCode } });
      if (conflict) {
        return NextResponse.json({ error: `Location code ${cleanCode} already exists.` }, { status: 400 });
      }
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.toUpperCase().trim() } : {}),
        ...(type ? { type } : {}),
        ...(warehouseId !== undefined ? { warehouseId } : {}),
      },
    });

    return NextResponse.json({ message: 'Location updated', location: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
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
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        stockQuantities: { where: { quantity: { gt: 0 } } },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.isVirtual) {
      return NextResponse.json({ error: 'System virtual locations cannot be deleted.' }, { status: 400 });
    }

    if (location.stockQuantities.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location: active inventory stock exists in this location.' },
        { status: 400 }
      );
    }

    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ message: 'Location deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
