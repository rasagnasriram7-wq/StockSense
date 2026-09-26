import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: { select: { documents: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Fetch suppliers error:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { name, contactPerson, phone, email, address } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Supplier name is required.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    return NextResponse.json({ message: 'Supplier created', supplier }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create supplier.' }, { status: 500 });
  }
}
