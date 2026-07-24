import { NextResponse } from "next/server";
import { eq, ilike } from "drizzle-orm";
import { db } from "@asset-pulse/db";
import {
  assets,
  assetCategories,
  assetSubcategories,
  properties,
  buildings,
  floors,
  rooms,
  userScopes,
} from "@asset-pulse/db/schema";

export async function GET() {
  try {
    const allAssets = await db.select().from(assets);
    return NextResponse.json({ success: true, data: allAssets });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const body = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing x-user-id header." },
        { status: 401 },
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
        {
          success: false,
          error: "No properties found in database. Run db:seed first.",
        },
        { status: 400 },
      );
    }

    // 1.1 Scope Permission Validation & Spatial Resolution
    const scopes = await db
      .select()
      .from(userScopes)
      .where(eq(userScopes.userId, userId));

    const targetBuildingId = body.buildingId || null;
    const targetFloorId = body.floorId || null;
    const targetRoomId = body.roomId || null;

    // Resolve parent hierarchy up if lower-level targets were selected
    let actualBuildingId = targetBuildingId;
    let actualFloorId = targetFloorId;
    let actualRoomId = targetRoomId;

    if (actualRoomId && (!actualFloorId || !actualBuildingId)) {
      const [roomRecord] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, actualRoomId))
        .limit(1);
      if (roomRecord) {
        actualFloorId = actualFloorId || roomRecord.floorId;
        actualBuildingId = actualBuildingId || roomRecord.buildingId;
      }
    }

    if (actualFloorId && !actualBuildingId) {
      const [floorRecord] = await db
        .select()
        .from(floors)
        .where(eq(floors.id, actualFloorId))
        .limit(1);
      if (floorRecord) {
        actualBuildingId = actualBuildingId || floorRecord.buildingId;
      }
    }

    const hasPermission = scopes.some((scope) => {
      // Property must match
      if (scope.propertyId !== targetPropertyId) return false;

      // Exact room scope match
      if (scope.roomId) {
        return scope.roomId === actualRoomId;
      }

      // Floor level scope match
      if (scope.floorId) {
        return scope.floorId === actualFloorId;
      }

      // Building level scope match
      if (scope.buildingId) {
        return scope.buildingId === actualBuildingId;
      }

      // Property-wide broad scope
      return true;
    });

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Permission denied: You do not have scope access to add assets to this location.",
        },
        { status: 403 },
      );
    }

    // 2. Category & Subcategory Logic (Manual Overrides & Code Generation)
    let targetCategoryId = body.categoryId;
    let targetSubcategoryId = body.subcategoryId;

    if (body.isManualCategory) {
      // Handle Custom Category
      if (body.customCategory) {
        const catName = body.customCategory.trim();
        let [existingCat] = await db
          .select()
          .from(assetCategories)
          .where(ilike(assetCategories.name, catName))
          .limit(1);

        if (!existingCat) {
          const generatedCode = `CAT-${catName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          [existingCat] = await db
            .insert(assetCategories)
            .values({
              name: catName,
              code: generatedCode,
            })
            .returning();
        }
        targetCategoryId = existingCat.id;
      }

      // Handle Custom Subcategory
      if (body.customSubcategory && targetCategoryId) {
        const subName = body.customSubcategory.trim();
        let [existingSub] = await db
          .select()
          .from(assetSubcategories)
          .where(ilike(assetSubcategories.name, subName))
          .limit(1);

        if (!existingSub) {
          const generatedCode = `SUB-${subName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          [existingSub] = await db
            .insert(assetSubcategories)
            .values({
              name: subName,
              code: generatedCode,
              categoryId: targetCategoryId,
            })
            .returning();
        }
        targetSubcategoryId = existingSub.id;
      }
    }

    // Fallbacks if IDs are missing
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
        {
          success: false,
          error: "Failed to assign a valid Category/Subcategory ID.",
        },
        { status: 400 },
      );
    }

    // 3. Pre-generate IDs, Asset Code, QR Code Payload & Timestamps
    const newAssetId = crypto.randomUUID();
    const generatedAssetCode = `AST-${Date.now().toString(36).toUpperCase()}`;
    const qrPayload = `assetpulse://asset/${newAssetId}`;
    const now = new Date();

    // 4. Single Database Insert into Neon Postgres
    const [insertedAsset] = await db
      .insert(assets)
      .values({
        id: newAssetId,
        assetCode: generatedAssetCode,
        qrCode: qrPayload,
        assetName: body.assetName || body.name || "Untitled Asset",
        propertyId: targetPropertyId,
        buildingId: actualBuildingId,
        floorId: actualFloorId,
        roomId: actualRoomId,
        categoryId: targetCategoryId,
        subcategoryId: targetSubcategoryId,
        gridReference: body.gridReference || null,
        make: body.make || null,
        modelNumber: body.modelNumber || null,
        serialNumber: body.serialNumber || null,
        latitude: body.latitude ? parseFloat(String(body.latitude)) : null,
        longitude: body.longitude ? parseFloat(String(body.longitude)) : null,
        conditionRating: body.conditionRating || null,
        criticality: body.criticality || "medium",
        operationalStatus: body.operationalStatus || "operative",
        completionScore: body.completionScore || 0,
        photoUrls: Array.isArray(body.photoUrls) ? body.photoUrls : [], // 👈 Add this line
        specifications: {
          ...(body.specifications || body.specData || {}),
          ...(body.isManualCategory
            ? {
                customCategory: body.customCategory,
                customSubcategory: body.customSubcategory,
              }
            : {}),
        },
        status: "surveyed",
        surveyorId: userId,
        surveyedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: insertedAsset },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("❌ Database Insert Failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save asset" },
      { status: 500 },
    );
  }
}
