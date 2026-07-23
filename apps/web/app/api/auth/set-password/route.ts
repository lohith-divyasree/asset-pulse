import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import { users } from '@asset-pulse/db/schema';

export async function POST(req: Request) {
  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Update password, clear OTP, disable mandatory change flag
    await db
      .update(users)
      .set({
        passwordHash: newPassword, // In prod: await bcrypt.hash(newPassword, 10)
        oneTimeCode: null,
        isMustChangePassword: false,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: 'Password configured successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}