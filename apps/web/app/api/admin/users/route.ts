import { NextResponse } from 'next/server';
import { eq, or, isNull } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import { users, userScopes, properties, buildings, floors, rooms } from '@asset-pulse/db/schema';

// GET /api/admin/users - Fetch users along with assigned hierarchical scopes
export async function GET() {
  try {
    const allUsers = await db.select().from(users);

    // Fetch all scopes with joined names for properties, buildings, floors, and rooms
    const allScopes = await db
      .select({
        id: userScopes.id,
        userId: userScopes.userId,
        propertyId: userScopes.propertyId,
        buildingId: userScopes.buildingId,
        floorId: userScopes.floorId,
        roomId: userScopes.roomId,
        propertyName: properties.name,
        buildingName: buildings.name,
        floorName: floors.name,
        roomName: rooms.name,
      })
      .from(userScopes)
      .leftJoin(properties, eq(userScopes.propertyId, properties.id))
      .leftJoin(buildings, eq(userScopes.buildingId, buildings.id))
      .leftJoin(floors, eq(userScopes.floorId, floors.id))
      .leftJoin(rooms, eq(userScopes.roomId, rooms.id));

    // Map scopes onto their respective users
    const formattedUsers = allUsers.map((user) => ({
      ...user,
      passwordHash: undefined,
      scopes: allScopes.filter((scope) => scope.userId === user.id),
    }));

    return NextResponse.json({ success: true, data: formattedUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper to generate a random 6-character OTP
function generateOTP() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role, scopes } = body;

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

    // 2. Assign Granular Scopes
    if (Array.isArray(scopes) && scopes.length > 0) {
      const scopeEntries = scopes.map((scope: any) => ({
        userId: newUser.id,
        propertyId: scope.propertyId || null,
        buildingId: scope.buildingId || null,
        floorId: scope.floorId || null,
        roomId: scope.roomId || null,
        canRegister: true,
        canAudit: true,
      }));
      await db.insert(userScopes).values(scopeEntries);
    }

    return NextResponse.json({
      success: true,
      data: newUser,
      oneTimeCode: tempCode,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/users - Update user assigned hierarchical scopes
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, scopes } = body;

    if (!userId || !Array.isArray(scopes)) {
      return NextResponse.json(
        { success: false, error: 'User ID and scopes array are required.' },
        { status: 400 }
      );
    }

    // 1. Clear existing assigned scopes for the user
    await db.delete(userScopes).where(eq(userScopes.userId, userId));

    // 2. Insert new granular scopes if array is not empty
    if (scopes.length > 0) {
      const scopeEntries = scopes.map((scope: any) => ({
        userId,
        propertyId: scope.propertyId || null,
        buildingId: scope.buildingId || null,
        floorId: scope.floorId || null,
        roomId: scope.roomId || null,
        canRegister: true,
        canAudit: true,
      }));
      await db.insert(userScopes).values(scopeEntries);
    }

    return NextResponse.json({
      success: true,
      message: 'User location scopes updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId, action } = await req.json();

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
          oneTimeCode: null,
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
          isMustChangePassword: true,
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