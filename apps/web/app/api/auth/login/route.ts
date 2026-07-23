import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import { users, userScopes } from '@asset-pulse/db/schema';

export async function POST(req: Request) {
  try {
    const { email, codeOrPassword } = await req.json();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials or inactive account' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Check if logging in with temporary code OR hashed password
    const isOtpMatch = user.oneTimeCode && user.oneTimeCode === codeOrPassword.trim().toUpperCase();
    const isPasswordMatch = user.passwordHash && user.passwordHash === codeOrPassword; // Swap with bcrypt in prod

    if (!isOtpMatch && !isPasswordMatch) {
      return NextResponse.json({ success: false, error: 'Invalid temporary code or password' }, { status: 401 });
    }

    // Fetch allowed properties
    const scopes = await db
      .select({ propertyId: userScopes.propertyId })
      .from(userScopes)
      .where(eq(userScopes.userId, user.id));

    return NextResponse.json({
      success: true,
      mustChangePassword: user.isMustChangePassword || isOtpMatch,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedPropertyIds: scopes.map((s) => s.propertyId),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}