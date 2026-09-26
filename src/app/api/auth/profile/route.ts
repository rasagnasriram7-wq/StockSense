import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = await requireAuth(req);
    if (error || !user) return error;

    const { name, currentPassword, newPassword } = await req.json();

    const updateData: { name?: string; passwordHash?: string } = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      // Fetch user with password
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!fullUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      const match = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!match) {
        return NextResponse.json(
          { error: 'Incorrect current password.' },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json(
      { error: 'Failed to update profile.' },
      { status: 500 }
    );
  }
}
