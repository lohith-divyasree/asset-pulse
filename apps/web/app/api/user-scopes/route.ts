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

    // 1. Fetch user scopes assigned explicitly
    const scopes = await db
      .select()
      .from(userScopes)
      .where(eq(userScopes.userId, userId));

    if (scopes.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Extract exact explicit level assignments
    // Note: If scope has buildingId = NULL, it's a PROPERTY-level scope.
    const explicitPropertyIds = new Set(
      scopes.filter((s) => !s.buildingId && !s.floorId && !s.roomId).map((s) => s.propertyId)
    );
    const explicitBuildingIds = new Set(
      scopes.filter((s) => s.buildingId && !s.floorId && !s.roomId).map((s) => s.buildingId!)
    );
    const explicitFloorIds = new Set(
      scopes.filter((s) => s.floorId && !s.roomId).map((s) => s.floorId!)
    );
    const explicitRoomIds = new Set(
      scopes.filter((s) => s.roomId).map((s) => s.roomId!)
    );

    // Also track all property/building/floor IDs present anywhere in user_scopes for tree visibility checks
    const targetPropertyIds = new Set(scopes.map((s) => s.propertyId));
    const targetBuildingIds = new Set(scopes.map((s) => s.buildingId).filter(Boolean) as string[]);
    const targetFloorIds = new Set(scopes.map((s) => s.floorId).filter(Boolean) as string[]);

    // 2. Query spatial hierarchy records
    const propertyRecords = await db.select().from(properties);
    const allBuildings = await db.select().from(buildings);
    const allFloors = await db.select().from(floors);
    const allRooms = await db.select().from(rooms);

    // 3. Construct spatial tree with cascading permissions & structural visibility
    const result = propertyRecords
      .filter((property) => {
        // Show property if it is explicitly scoped or if any child building/floor/room belongs to it
        return (
          explicitPropertyIds.has(property.id) ||
          targetPropertyIds.has(property.id) ||
          allBuildings.some((b) => b.propertyId === property.id && targetBuildingIds.has(b.id))
        );
      })
      .map((property) => {
        const isPropertyExplicit = explicitPropertyIds.has(property.id);

        const propertyBuildings = allBuildings
          .filter((b) => b.propertyId === property.id)
          .map((building) => {
            const isBuildingExplicit = explicitBuildingIds.has(building.id);
            // Permitted if explicitly assigned to this building or inherited from parent property
            const isBuildingPermitted = isPropertyExplicit || isBuildingExplicit;

            const buildingFloors = allFloors
              .filter((f) => f.buildingId === building.id)
              .map((floor) => {
                const isFloorExplicit = explicitFloorIds.has(floor.id);
                // Permitted if inherited from building or explicitly assigned to this floor
                const isFloorPermitted = isBuildingPermitted || isFloorExplicit;

                const floorRooms = allRooms
                  .filter((r) => r.floorId === floor.id)
                  .map((room) => {
                    const isRoomExplicit = explicitRoomIds.has(room.id);
                    // Permitted if inherited from floor or explicitly assigned to this room
                    const isRoomPermitted = isFloorPermitted || isRoomExplicit;

                    return {
                      ...room,
                      isExplicitlyAssigned: isRoomExplicit,
                      isPermitted: isRoomPermitted,
                    };
                  })
                  .filter((r) => r.isPermitted || targetFloorIds.has(r.floorId));

                return {
                  ...floor,
                  isExplicitlyAssigned: isFloorExplicit,
                  isPermitted: isFloorPermitted,
                  rooms: floorRooms,
                };
              })
              .filter((f) => f.isPermitted || f.rooms.length > 0);

            return {
              ...building,
              isExplicitlyAssigned: isBuildingExplicit,
              isPermitted: isBuildingPermitted,
              floors: buildingFloors,
            };
          })
          .filter((b) => b.isPermitted || b.floors.length > 0);

        return {
          ...property,
          isExplicitlyAssigned: isPropertyExplicit,
          isPermitted: isPropertyExplicit,
          buildings: propertyBuildings,
        };
      })
      .filter((p) => p.isPermitted || p.buildings.length > 0);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ Failed to compute user scopes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}