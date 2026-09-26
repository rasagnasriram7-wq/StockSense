import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026_prod';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function signJwt(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req: NextRequest) {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Check cookie
    const cookieToken = req.cookies.get('stocksense_token')?.value;
    if (cookieToken) token = cookieToken;
  }

  if (!token) return null;

  const payload = verifyJwt(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function requireAuth(req: NextRequest, allowedRoles?: string[]) {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 }),
      user: null,
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 }),
      user: null,
    };
  }

  return { error: null, user };
}
