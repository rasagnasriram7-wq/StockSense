import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { include: { category: true } },
            fromLocation: true,
            toLocation: true,
          },
        },
        stockMoves: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Fetch document detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch document.' }, { status: 500 });
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
    const { status, partnerName, notes } = body;

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    if (existing.status === 'done') {
      return NextResponse.json(
        { error: 'Validated documents cannot be modified.' },
        { status: 400 }
      );
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(partnerName !== undefined ? { partnerName: partnerName.trim() } : {}),
        ...(notes !== undefined ? { notes: notes.trim() } : {}),
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    return NextResponse.json({ message: 'Document updated successfully', document: updated });
  } catch (err: any) {
    console.error('Update document error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update document.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { id } = await params;
    const existing = await prisma.document.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    if (existing.status === 'done') {
      return NextResponse.json(
        { error: 'Completed/validated documents cannot be deleted. Use inventory adjustments for corrections.' },
        { status: 400 }
      );
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete document.' }, { status: 500 });
  }
}
