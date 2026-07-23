import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm'; // 👈 MUST IMPORT eq HERE
import { db } from '@asset-pulse/db';
import { assets, assetCategories, assetSubcategories, properties } from '@asset-pulse/db/schema';

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
    const body = await req.json();

    let targetPropertyId = body.propertyId;

    // 1. Verify propertyId exists in DB, or fallback to first seeded property
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

    let targetSubcategoryId = body.subcategoryId;
    let targetCategoryId = body.categoryId;

    // 2. Fallback for subcategory if not provided by payload
    if (!targetSubcategoryId) {
      const [defaultSub] = await db.select().from(assetSubcategories).limit(1);
      targetSubcategoryId = defaultSub?.id;
      if (!targetCategoryId) {
        targetCategoryId = defaultSub?.categoryId;
      }
    }

    // 3. Fallback for category if subcategory was provided but category was missing
    if (!targetCategoryId && targetSubcategoryId) {
      const [foundSub] = await db
        .select()
        .from(assetSubcategories)
        .where(eq(assetSubcategories.id, targetSubcategoryId)) // 👈 USE eq() HERE
        .limit(1);

      targetCategoryId = foundSub?.categoryId;
    }

    // 4. Fallback for root category if no records match
    if (!targetCategoryId) {
      const [defaultCat] = await db.select().from(assetCategories).limit(1);
      targetCategoryId = defaultCat?.id;
    }

    // Insert into Neon Postgres
    const [insertedAsset] = await db
      .insert(assets)
      .values({
        assetName: body.assetName || body.name || 'Untitled Asset',
        propertyId: targetPropertyId,
        categoryId: targetCategoryId,
        subcategoryId: targetSubcategoryId,
        buildingId: body.buildingId || null,
        floorId: body.floorId || null,
        make: body.make || null,
        modelNumber: body.modelNumber || null,
        serialNumber: body.serialNumber || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
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
