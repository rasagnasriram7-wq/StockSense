import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { name, description } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required.' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const existing = await prisma.category.findUnique({
      where: { name: cleanName },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category "${cleanName}" already exists.` },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({ message: 'Category created', category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category.' },
      { status: 500 }
    );
  }
}
