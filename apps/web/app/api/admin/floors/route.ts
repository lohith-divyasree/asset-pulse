import { NextResponse } from 'next/server';
import { db } from '@asset-pulse/db';
import { floors } from '@asset-pulse/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, floor, floorsList } = body;

    // 1. Manual Single Floor Creation
    if (action === 'single') {
      if (!floor?.name || floor?.level === undefined || !floor?.propertyId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields (name, level, propertyId).' },
          { status: 400 }
        );
      }

      const [newFloor] = await db
        .insert(floors)
        .values({
          name: floor.name,
          level: Number(floor.level),
          propertyId: floor.propertyId,
          buildingId: floor.buildingId || null,
        })
        .returning();

      return NextResponse.json({ success: true, data: newFloor });
    }

    // 2. Bulk CSV Ingestion for Floors
    if (action === 'bulk') {
      if (!Array.isArray(floorsList) || floorsList.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No floors provided for bulk insert.' },
          { status: 400 }
        );
      }

      const formattedValues = floorsList.map((f: any) => ({
        name: f.name,
        level: Number(f.level),
        propertyId: f.propertyId,
        buildingId: f.buildingId || null,
      }));

      const inserted = await db
        .insert(floors)
        .values(formattedValues)
        .onConflictDoNothing()
        .returning();

      return NextResponse.json({ success: true, count: inserted.length });
    }

    return NextResponse.json({ success: false, error: 'Invalid action type.' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Failed to process floors:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}