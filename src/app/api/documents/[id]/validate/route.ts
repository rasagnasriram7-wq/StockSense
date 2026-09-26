import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validateDocument } from '@/lib/stock-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { id } = await params;

    const result = await validateDocument(id, user.id);

    return NextResponse.json({
      message: 'Document successfully validated and stock movements logged in ledger.',
      document: result.document,
      moves: result.moves,
    });
  } catch (err: any) {
    console.error('Validate document error:', err);
    return NextResponse.json(
      { error: err.message || 'Validation failed.' },
      { status: 400 }
    );
  }
}
