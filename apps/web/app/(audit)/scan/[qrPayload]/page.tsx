// app/audit/scan/[qrPayload]/page.tsx
import { db } from "@asset-pulse/db";
import {
  assets,
  assetCategories,
  assetSubcategories,
  properties,
  buildings,
  floors,
  rooms,
} from "@asset-pulse/db/schema";
import { eq, or } from "drizzle-orm";
import AuditorReportForm from "@/components/auditor/AuditorReportForm";
import {
  computeNextMaintenanceDate,
  getMaintenanceBadgeStatus,
} from "@/app/lib/maintenance";

export default async function AuditScanPage({
  params,
}: {
  params: { qrPayload: string };
}) {
  const [assetData] = await db
    .select({
      id: assets.id,
      assetCode: assets.assetCode,
      assetName: assets.assetName,
      conditionRating: assets.conditionRating,
      operationalStatus: assets.operationalStatus,
      createdAt: assets.createdAt,
      surveyedAt: assets.surveyedAt,
      lastServicedAt: assets.lastServicedAt,
      nextMaintenanceDate: assets.nextMaintenanceDate,
      propertyName: properties.name,
      buildingName: buildings.name,
      floorName: floors.name,
      roomName: rooms.name,
      categoryInterval: assetCategories.defaultMaintenanceIntervalDays,
      subcategoryInterval: assetSubcategories.maintenanceIntervalDays,
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
    .where(
      or(eq(assets.id, params.qrPayload), eq(assets.qrCode, params.qrPayload)),
    );

  if (!assetData) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        ⚠️ Asset not found for this QR code.
      </div>
    );
  }

  const suggestedNextDate = assetData.nextMaintenanceDate
    ? new Date(assetData.nextMaintenanceDate)
    : computeNextMaintenanceDate({
        createdAt: assetData.createdAt,
        surveyedAt: assetData.surveyedAt,
        lastServicedAt: assetData.lastServicedAt,
        categoryIntervalDays: assetData.categoryInterval,
        subcategoryIntervalDays: assetData.subcategoryInterval,
      });

  const badge = getMaintenanceBadgeStatus(suggestedNextDate);

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "1rem",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: "bold", margin: 0 }}>
              {assetData.assetName}
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                margin: "0.25rem 0 0",
              }}
            >
              Code: {assetData.assetCode || "N/A"}
            </p>
          </div>
          <span
            style={{
              backgroundColor: badge.bg,
              color: badge.color,
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: "bold",
              height: "fit-content",
            }}
          >
            {badge.label}
          </span>
        </div>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "#475569",
            marginTop: "0.75rem",
            marginBottom: 0,
          }}
        >
          📍 {assetData.propertyName}{" "}
          {assetData.buildingName ? `• ${assetData.buildingName}` : ""}{" "}
          {assetData.roomName ? `• ${assetData.roomName}` : ""}
        </p>
      </div>

      <AuditorReportForm
        assetId={assetData.id}
        currentCondition={assetData.conditionRating || "GOOD"}
        currentOpStatus={assetData.operationalStatus || "operative"}
        defaultNextDate={suggestedNextDate.toISOString().split("T")[0]}
      />
    </div>
  );
}
