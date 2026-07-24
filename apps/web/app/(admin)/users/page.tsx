// app/admin/users/page.tsx
import { db } from '@asset-pulse/db';
import { users, properties, buildings, floors, rooms, userScopes } from '@asset-pulse/db/schema';
import { eq } from 'drizzle-orm';
import UsersView from '@/components/admin/UsersView';

export const revalidate = 0; 

export default async function UsersPage() {
  const rawProperties = await db.select().from(properties);
  const rawBuildings = await db.select().from(buildings);
  const rawFloors = await db.select().from(floors);
  const rawRooms = await db.select().from(rooms);
  const rawUsers = await db.select().from(users);

  const rawScopes = await db
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

  const formattedUsers = rawUsers.map((user) => {
    const scopes = rawScopes.filter((s) => s.userId === user.id);
    return { ...user, scopes };
  });

  return (
    <UsersView
      initialUsers={formattedUsers}
      initialProperties={rawProperties}
      initialBuildings={rawBuildings}
      initialFloors={rawFloors}
      initialRooms={rawRooms}
    />
  );
}