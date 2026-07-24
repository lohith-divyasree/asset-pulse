// app/properties/[id]/assets/page.tsx
import { notFound } from "next/navigation";
import { db } from "@asset-pulse/db";
import {
  properties,
  assets,
  assetCategories,
  buildings,
  floors,
  rooms,
} from "@asset-pulse/db/schema";
import { eq } from "drizzle-orm";
import PropertyAssetsView from "@/components/admin/PropertyAssetsView";

export const revalidate = 0;

interface PropertyAssetsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyAssetsPage({ params }: PropertyAssetsPageProps) {
  const { id: propertyId } = await params;

  // 1. Fetch target property
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId));

  if (!property) {
    notFound();
  }

  // 2. Fetch assets with related categories, buildings, floors, and rooms
  const propertyAssets = await db
    .select({
      id: assets.id,
      assetCode: assets.assetCode,
      assetName: assets.assetName,
      make: assets.make,
      modelNumber: assets.modelNumber,
      serialNumber: assets.serialNumber,
      conditionRating: assets.conditionRating,
      criticality: assets.criticality,
      operationalStatus: assets.operationalStatus,
      status: assets.status,
      completionScore: assets.completionScore,
      categoryName: assetCategories.name,
      buildingName: buildings.name,
      floorName: floors.name,
      roomName: rooms.name,
      gridReference: assets.gridReference,
    })
    .from(assets)
    .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
    .leftJoin(buildings, eq(assets.buildingId, buildings.id))
    .leftJoin(floors, eq(assets.floorId, floors.id))
    .leftJoin(rooms, eq(assets.roomId, rooms.id))
    .where(eq(assets.propertyId, propertyId));

  return <PropertyAssetsView property={property} propertyAssets={propertyAssets} />;
}