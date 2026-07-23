import { NextResponse } from 'next/server';
import { eq, ilike } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import {
  assets,
  assetCategories,
  assetSubcategories,
  properties,
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
        buildingId: body.buildingId || null,
        floorId: body.floorId || null,
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