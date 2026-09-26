import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpiresAt: expiresAt,
      },
    });

    console.log(`\n========================================`);
    console.log(`🔐 [StockSense OTP Mock Dispatch]`);
    console.log(`Recipient: ${user.email}`);
    console.log(`One-Time Password (OTP): ${otp}`);
    console.log(`Valid for 15 minutes until: ${expiresAt.toLocaleTimeString()}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      message: 'Password reset OTP has been generated successfully.',
      mockOtp: otp, // As requested in the specification for mock OTP
      expiresInMinutes: 15,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing password reset.' },
      { status: 500 }
    );
  }
}
