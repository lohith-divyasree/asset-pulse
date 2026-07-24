import { NextResponse } from 'next/server';
import { eq, ilike } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import {
  assets,
  assetCategories,
  assetSubcategories,
  properties,
  buildings,
  floors,
  rooms,
  userScopes,
} from '@asset-pulse/db/schema';

export async function GET() {
  try {
    const allAssets = await db.select().from(assets);
    return NextResponse.json({ success: true, data: allAssets });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const body = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing x-user-id header.' },
        { status: 401 }
      );
    }

    // 1. Property Verification & Fallback
    let targetPropertyId = body.propertyId;

    if (targetPropertyId) {
      const [existingProp] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, targetPropertyId))
        .limit(1);

      if (!existingProp) {
        targetPropertyId = null; // Stale ID provided
      }
    }

    if (!targetPropertyId) {
      const [defaultProperty] = await db.select().from(properties).limit(1);
      targetPropertyId = defaultProperty?.id;
    }

    if (!targetPropertyId) {
      return NextResponse.json(
        { success: false, error: 'No properties found in database. Run db:seed first.' },
        { status: 400 }
      );
    }

    // 1.1 Scope Permission Validation (Granular & Bottom-Up Aware)
    const scopes = await db
      .select()
      .from(userScopes)
      .where(eq(userScopes.userId, userId));

    const targetBuildingId = body.buildingId || null;
    const targetFloorId = body.floorId || null;
    const targetRoomId = body.roomId || null;

    // Automatically resolve parent hierarchy if only a child is provided
    let actualBuildingId = targetBuildingId;
    let actualFloorId = targetFloorId;
    let actualRoomId = targetRoomId;

    if (actualRoomId && (!actualFloorId || !actualBuildingId)) {
      const [roomRecord] = await db.select().from(rooms).where(eq(rooms.id, actualRoomId)).limit(1);
      if (roomRecord) {
        actualFloorId = actualFloorId || roomRecord.floorId;
      }
    }

    if (actualFloorId && !actualBuildingId) {
      const [floorRecord] = await db.select().from(floors).where(eq(floors.id, actualFloorId)).limit(1);
      if (floorRecord) {
        actualBuildingId = actualBuildingId || floorRecord.buildingId;
      }
    }

    const hasPermission = scopes.some((scope) => {
      // Property must match
      if (scope.propertyId !== targetPropertyId) return false;

      // If scope specifies a exact room, it must match
      if (scope.roomId) {
        return scope.roomId === actualRoomId;
      }

      // If scope specifies a floor (e.g., Floor 7), allow the floor and any rooms inside it
      if (scope.floorId) {
        return scope.floorId === actualFloorId;
      }

      // If scope specifies a building, allow the building and anything inside it
      if (scope.buildingId) {
        return scope.buildingId === actualBuildingId;
      }

      // If scope is broad property-level access only, everything inside is allowed
      return true;
    });

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You do not have scope access to add assets to this location.' },
        { status: 403 }
      );
    }

    // 2. Category & Subcategory Logic (Manual Overrides & Fallbacks)
    let targetCategoryId = body.categoryId;
    let targetSubcategoryId = body.subcategoryId;

    if (body.isManualCategory) {
      // Handle Manual Category/Subcategory Creation
      if (body.customCategory) {
        let [existingCat] = await db
          .select()
          .from(assetCategories)
          .where(ilike(assetCategories.name, body.customCategory.trim()))
          .limit(1);

        if (!existingCat) {
          [existingCat] = await db
            .insert(assetCategories)
            .values({ name: body.customCategory.trim() })
            .returning();
        }
        targetCategoryId = existingCat.id;
      }

      if (body.customSubcategory && targetCategoryId) {
        let [existingSub] = await db
          .select()
          .from(assetSubcategories)
          .where(ilike(assetSubcategories.name, body.customSubcategory.trim()))
          .limit(1);

        if (!existingSub) {
          [existingSub] = await db
            .insert(assetSubcategories)
            .values({
              name: body.customSubcategory.trim(),
              categoryId: targetCategoryId,
            })
            .returning();
        }
        targetSubcategoryId = existingSub.id;
      }
    }

    // Fallbacks if IDs are still missing
    if (!targetSubcategoryId) {
      const [defaultSub] = await db.select().from(assetSubcategories).limit(1);
      targetSubcategoryId = defaultSub?.id;
      if (!targetCategoryId) {
        targetCategoryId = defaultSub?.categoryId;
      }
    }

    if (!targetCategoryId && targetSubcategoryId) {
      const [foundSub] = await db
        .select()
        .from(assetSubcategories)
        .where(eq(assetSubcategories.id, targetSubcategoryId))
        .limit(1);

      targetCategoryId = foundSub?.categoryId;
    }

    if (!targetCategoryId) {
      const [defaultCat] = await db.select().from(assetCategories).limit(1);
      targetCategoryId = defaultCat?.id;
    }

    if (!targetCategoryId || !targetSubcategoryId) {
      return NextResponse.json(
        { success: false, error: 'Failed to assign a valid Category/Subcategory ID.' },
        { status: 400 }
      );
    }

    // 3. Insert into Neon Postgres
    const [insertedAsset] = await db
      .insert(assets)
      .values({
        assetName: body.assetName || body.name || 'Untitled Asset',
        propertyId: targetPropertyId,
        categoryId: targetCategoryId,
        subcategoryId: targetSubcategoryId,
        buildingId: targetBuildingId,
        floorId: targetFloorId,
        roomId: targetRoomId,
        gridReference: body.gridReference || null,
        make: body.make || null,
        modelNumber: body.modelNumber || null,
        serialNumber: body.serialNumber || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        conditionRating: body.conditionRating || null,
        criticality: body.criticality || 'medium',
        operationalStatus: body.operationalStatus || 'operative',
        completionScore: body.completionScore || 0,
        status: 'draft',
        surveyorId: userId || null,
        surveyedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: insertedAsset }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Database Insert Failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save asset' },
      { status: 500 }
    );
  }
}