// app/properties/page.tsx
import { db } from '@asset-pulse/db';
import { properties, buildings, floors, rooms } from '@asset-pulse/db/schema';
import PropertiesView from '@/components/admin/PropertiesView';

export const revalidate = 0;

export default async function PropertiesPage() {
  // Fetch raw hierarchy data from database
  const propertiesList = await db.select().from(properties);
  const allBuildings = await db.select().from(buildings);
  const allFloors = await db.select().from(floors);
  const allRooms = await db.select().from(rooms);

  // Map structural elements into their parent properties
  const propertiesWithHierarchy = propertiesList.map((property) => {
    const propBuildings = allBuildings.filter((b) => b.propertyId === property.id);
    
    const buildingsWithDetails = propBuildings.map((building) => {
      const bldgFloors = allFloors.filter((f) => f.buildingId === building.id);
      
      const floorsWithDetails = bldgFloors.map((floor) => {
        const floorRooms = allRooms.filter((r) => r.floorId === floor.id);
        return { ...floor, rooms: floorRooms };
      });

      return { ...building, floors: floorsWithDetails };
    });

    return {
      ...property,
      buildings: buildingsWithDetails,
    };
  });

  return <PropertiesView initialProperties={propertiesWithHierarchy} />;
}