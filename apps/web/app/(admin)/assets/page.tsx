import AssetsView from "@/components/admin/AssetsView";
import { db } from "@asset-pulse/db";
import {
  assets,
  properties,
  buildings,
  floors,
  rooms,
  assetCategories,
  assetSubcategories,
  users,
} from "@asset-pulse/db/schema";
import { asc, desc, eq } from "drizzle-orm";

// Ensure fresh database fetches on every request
export const revalidate = 0;

async function getAssets() {
  try {
    const assetList = await db
      .select({
        // Core Asset Fields
        id: assets.id,
        assetCode: assets.assetCode,
        assetName: assets.assetName,
        make: assets.make,
        modelNumber: assets.modelNumber,
        serialNumber: assets.serialNumber,
        gridReference: assets.gridReference,
        latitude: assets.latitude,
        longitude: assets.longitude,
        conditionRating: assets.conditionRating,
        criticality: assets.criticality,
        operationalStatus: assets.operationalStatus,
        status: assets.status,
        completionScore: assets.completionScore,
        specifications: assets.specifications,
        photoUrls: assets.photoUrls, // 👈 Selected photoUrls
        createdAt: assets.createdAt,
        surveyedAt: assets.surveyedAt,

        // Joined Spatial Hierarchy Names & IDs
        propertyId: assets.propertyId,
        propertyName: properties.name,
        buildingId: assets.buildingId,
        buildingName: buildings.name,
        floorId: assets.floorId,
        floorName: floors.name,
        roomId: assets.roomId,
        roomName: rooms.name,

        // Joined Taxonomy Names
        categoryId: assets.categoryId,
        categoryName: assetCategories.name,
        subcategoryId: assets.subcategoryId,
        subcategoryName: assetSubcategories.name,

        // Surveyor Information
        surveyorName: users.name,
        surveyorEmail: users.email,
      })
      .from(assets)
      .leftJoin(properties, eq(assets.propertyId, properties.id))
      .leftJoin(buildings, eq(assets.buildingId, buildings.id))
      .leftJoin(floors, eq(assets.floorId, floors.id))
      .leftJoin(rooms, eq(assets.roomId, rooms.id))
      .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
      .leftJoin(
        assetSubcategories,
        eq(assets.subcategoryId, assetSubcategories.id),
      )
      .leftJoin(users, eq(assets.surveyorId, users.id))
      .orderBy(asc(buildings.name), desc(assets.createdAt));

    return assetList;
  } catch (error) {
    console.error("❌ Failed to fetch assets from database:", error);
    return [];
  }
}

export default async function AssetsPage() {
  const initialAssets = await getAssets();

  return <AssetsView initialAssets={initialAssets} />;
}
