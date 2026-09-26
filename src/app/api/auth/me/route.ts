import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error, user } = await requireAuth(req);
  if (error || !user) return error;

  // Also include count of low stock items and pending docs for quick notification badge
  const lowStockCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT p.id) as count
    FROM Product p
    LEFT JOIN StockQuantity sq ON sq.productId = p.id
    GROUP BY p.id, p.reorderMin
    HAVING COALESCE(SUM(sq.quantity), 0) <= p.reorderMin
  `;

  return NextResponse.json({
    user,
    stats: {
      lowStockAlertCount: lowStockCount.length,
    },
  });
}
