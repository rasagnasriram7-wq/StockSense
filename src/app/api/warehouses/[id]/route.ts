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
    const { name, code, address, managerName, status } = await req.json();

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.toUpperCase().trim() } : {}),
        ...(address !== undefined ? { address: address.trim() } : {}),
        ...(managerName !== undefined ? { managerName: managerName.trim() } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ message: 'Warehouse updated', warehouse: updated });
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

    const locCount = await prisma.location.count({
      where: { warehouseId: id },
    });

    if (locCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete warehouse: it has ${locCount} active locations inside it.` },
        { status: 400 }
      );
    }

    await prisma.warehouse.delete({ where: { id } });
    return NextResponse.json({ message: 'Warehouse deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
}
