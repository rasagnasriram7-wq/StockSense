import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search')?.trim();

    const documents = await prisma.document.findMany({
      where: {
        AND: [
          type && type !== 'all' ? { type } : {},
          status && status !== 'all' ? { status } : {},
          warehouseId && warehouseId !== 'all' ? { warehouseId } : {},
          search
            ? {
                OR: [
                  { documentNumber: { contains: search } },
                  { partnerName: { contains: search } },
                  { notes: { contains: search } },
                ],
              }
            : {},
          categoryId && categoryId !== 'all'
            ? {
                items: {
                  some: {
                    product: { categoryId },
                  },
                },
              }
            : {},
        ],
      },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const data = await req.json();
    const {
      type, // 'receipt' | 'delivery' | 'internal' | 'adjustment'
      partnerName,
      supplierId,
      warehouseId,
      status, // default 'draft'
      notes,
      items, // array of { productId, quantity, countedQuantity, difference, fromLocationId, toLocationId, notes }
    } = data;

    if (!type || !['receipt', 'delivery', 'internal', 'adjustment'].includes(type)) {
      return NextResponse.json({ error: 'Valid document type is required.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one product item is required.' }, { status: 400 });
    }

    // Generate unique sequential document number
    const prefixMap: Record<string, string> = {
      receipt: 'REC',
      delivery: 'DEL',
      internal: 'INT',
      adjustment: 'ADJ',
    };
    const prefix = prefixMap[type] || 'DOC';
    const year = new Date().getFullYear();

    const count = await prisma.document.count({
      where: { type },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    const documentNumber = `${prefix}-${year}-${seq}`;

    // Create document & items
    const doc = await prisma.document.create({
      data: {
        documentNumber,
        type,
        partnerName: partnerName ? partnerName.trim() : null,
        supplierId: supplierId || null,
        warehouseId: warehouseId || null,
        status: status || 'draft',
        notes: notes ? notes.trim() : null,
        createdById: user.id,
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: Number(it.quantity) || 0,
            countedQuantity: it.countedQuantity !== undefined ? Number(it.countedQuantity) : null,
            difference: it.difference !== undefined ? Number(it.difference) : null,
            fromLocationId: it.fromLocationId || null,
            toLocationId: it.toLocationId || null,
            notes: it.notes || null,
          })),
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Document created successfully',
      document: doc,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Create document error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create document.' }, { status: 500 });
  }
}
