import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import { users, userScopes, properties } from '@asset-pulse/db/schema';

// GET /api/admin/users - Fetch users along with assigned properties
export async function GET() {
  try {
    const allUsers = await db.select().from(users);

    // Fetch all scopes with joined property names
    const allScopes = await db
      .select({
        id: userScopes.id,
        userId: userScopes.userId,
        propertyId: userScopes.propertyId,
        propertyName: properties.name,
      })
      .from(userScopes)
      .innerJoin(properties, eq(userScopes.propertyId, properties.id));

    // Map properties onto their respective users
    const formattedUsers = allUsers.map((user) => ({
      ...user,
      passwordHash: undefined, // Hide password hashes
      scopes: allScopes.filter((scope) => scope.userId === user.id),
    }));

    return NextResponse.json({ success: true, data: formattedUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to generate a random 6-character OTP (e.g., "AP-8F3K")
function generateOTP() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, propertyIds } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required' }, { status: 400 });
    }

    const tempCode = generateOTP();

    // 1. Insert User with OTP
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase().trim(),
        oneTimeCode: tempCode,
        isMustChangePassword: true,
        role: role || 'surveyor',
      })
      .returning();

    // 2. Assign Property Scopes
    if (Array.isArray(propertyIds) && propertyIds.length > 0) {
      const scopeEntries = propertyIds.map((propId: string) => ({
        userId: newUser.id,
        propertyId: propId,
        canRegister: true,
        canAudit: true,
      }));
      await db.insert(userScopes).values(scopeEntries);
    }

    return NextResponse.json({
      success: true,
      data: newUser,
      oneTimeCode: tempCode, // Return code to show in Admin UI
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/users - Update user assigned property scopes (HTTP driver friendly)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, propertyIds } = body;

    if (!userId || !Array.isArray(propertyIds)) {
      return NextResponse.json(
        { success: false, error: 'User ID and property IDs array are required.' },
        { status: 400 }
      );
    }

    // 1. Clear existing assigned property scopes for the user directly on `db`
    await db.delete(userScopes).where(eq(userScopes.userId, userId));

    // 2. Insert new property scopes if array is not empty
    if (propertyIds.length > 0) {
      const scopeEntries = propertyIds.map((propId: string) => ({
        userId,
        propertyId: propId,
        canRegister: true,
        canAudit: true,
      }));
      await db.insert(userScopes).values(scopeEntries);
    }

    return NextResponse.json({
      success: true,
      message: 'User property scopes updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, action } = await req.json(); // action: 'deactivate' | 'reactivate'

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'deactivate') {
      await db
        .update(users)
        .set({
          isActive: false,
          oneTimeCode: null, // Clear active credentials
        })
        .where(eq(users.id, userId));

      return NextResponse.json({
        success: true,
        message: 'User deactivated successfully',
      });
    }

    if (action === 'reactivate') {
      const newTempCode = generateOTP();

      await db
        .update(users)
        .set({
          isActive: true,
          oneTimeCode: newTempCode,
          isMustChangePassword: true, // Force password reset on next mobile login
        })
        .where(eq(users.id, userId));

      return NextResponse.json({
        success: true,
        oneTimeCode: newTempCode,
        message: 'User reactivated successfully',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}