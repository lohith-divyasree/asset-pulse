import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import {
  properties,
  buildings,
  floors,
  rooms,
  userScopes,
} from '@asset-pulse/db/schema';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing x-user-id header.' },
        { status: 401 }
      );
    }

    // 1. Fetch all scopes assigned to this user
    const scopes = await db
      .select()
      .from(userScopes)
      .where(eq(userScopes.userId, userId));

    if (scopes.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Create precise lookup sets for each level based on user_scopes rows
    const assignedPropertyIds = new Set(scopes.map((s) => s.propertyId));
    const assignedBuildingIds = new Set(scopes.map((s) => s.buildingId).filter(Boolean));
    const assignedFloorIds = new Set(scopes.map((s) => s.floorId).filter(Boolean));
    const assignedRoomIds = new Set(scopes.map((s) => s.roomId).filter(Boolean));

    // 2. Fetch all necessary hierarchy tables
    const propertyRecords = await db.select().from(properties);
    const allBuildings = await db.select().from(buildings);
    const allFloors = await db.select().from(floors);
    const allRooms = await db.select().from(rooms);

    // 3. Construct hierarchical response with explicit `isAssigned` flags
    const result = propertyRecords
      .filter((p) => assignedPropertyIds.has(p.id) || allBuildings.some((b) => b.propertyId === p.id && (assignedBuildingIds.has(b.id) || allFloors.some((f) => f.buildingId === b.id && assignedFloorIds.has(f.id)))))
      .map((property) => {
        const isPropertyAssigned = assignedPropertyIds.has(property.id);

        const propertyBuildings = allBuildings
          .filter((b) => b.propertyId === property.id)
          .map((building) => {
            const isBuildingAssigned = assignedBuildingIds.has(building.id);

            const buildingFloors = allFloors
              .filter((f) => f.buildingId === building.id)
              .map((floor) => {
                const isFloorAssigned = assignedFloorIds.has(floor.id);

                const floorRooms = allRooms
                  .filter((r) => r.floorId === floor.id)
                  .map((room) => ({
                    ...room,
                    isAssigned: isPropertyAssigned || isBuildingAssigned || isFloorAssigned || assignedRoomIds.has(room.id),
                  }))
                  .filter((r) => isPropertyAssigned || isBuildingAssigned || isFloorAssigned || assignedRoomIds.has(r.id));

                return {
                  ...floor,
                  isAssigned: isPropertyAssigned || isBuildingAssigned || isFloorAssigned,
                  rooms: floorRooms,
                };
              })
              .filter((f) => isPropertyAssigned || isBuildingAssigned || f.isAssigned || f.rooms.length > 0);

            return {
              ...building,
              isAssigned: isPropertyAssigned || isBuildingAssigned,
              floors: buildingFloors,
            };
          })
          .filter((b) => isPropertyAssigned || b.isAssigned || b.floors.length > 0);

        return {
          ...property,
          isAssigned: isPropertyAssigned,
          buildings: propertyBuildings,
        };
      });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ Failed to fetch user scopes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}