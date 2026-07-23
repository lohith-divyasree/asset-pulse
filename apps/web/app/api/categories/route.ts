// app/api/categories/route.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { db } from '@asset-pulse/db';
import { assetCategories, assetSubcategories } from '@asset-pulse/db/schema';

export async function GET() {
  try {
    // Standard Drizzle select query
    const categories = await db.select().from(assetCategories);
    const subcategories = await db.select().from(assetSubcategories);

    return NextResponse.json(
      {
        success: true,
        categories,
        subcategories, // Automatically returns mapped { id, categoryId, code, name, curatedMakes, specSchema }
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}