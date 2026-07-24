import { NextResponse } from 'next/server';
import { db } from '@asset-pulse/db';
import { buildings } from '@asset-pulse/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, building, buildingsList } = body;

    // 1. Manual Single Building Creation
    if (action === 'single') {
      if (!building?.code || !building?.name || !building?.propertyId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields (code, name, propertyId).' },
          { status: 400 }
        );
      }

      const [newBuilding] = await db
        .insert(buildings)
        .values({
          code: building.code,
          name: building.name,
          propertyId: building.propertyId,
        })
        .returning();

      return NextResponse.json({ success: true, data: newBuilding });
    }

    // 2. Bulk CSV Ingestion for Buildings
    if (action === 'bulk') {
      if (!Array.isArray(buildingsList) || buildingsList.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No buildings provided for bulk insert.' },
          { status: 400 }
        );
      }

      const formattedValues = buildingsList.map((b: any) => ({
        code: b.code,
        name: b.name,
        propertyId: b.propertyId,
      }));

      const inserted = await db
        .insert(buildings)
        .values(formattedValues)
        .onConflictDoNothing()
        .returning();

      return NextResponse.json({ success: true, count: inserted.length });
    }

    return NextResponse.json({ success: false, error: 'Invalid action type.' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Failed to process buildings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}