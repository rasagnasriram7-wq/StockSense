import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { id } = await params;
    const { name, description } = await req.json();

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
      },
    });

    return NextResponse.json({ message: 'Category updated', category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Failed to update category.' },
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

    const count = await prisma.product.count({
      where: { categoryId: id },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete category: ${count} products are currently linked to it.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category.' },
      { status: 500 }
    );
  }
}
