import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@asset-pulse/db";
import {
  properties,
  assets,
  assetCategories,
  buildings,
  floors,
} from "@asset-pulse/db/schema";
import { eq } from "drizzle-orm";

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

  // 2. Fetch assets with category, building, and floor details
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
      gridReference: assets.gridReference,
    })
    .from(assets)
    .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
    .leftJoin(buildings, eq(assets.buildingId, buildings.id))
    .leftJoin(floors, eq(assets.floorId, floors.id))
    .where(eq(assets.propertyId, propertyId));

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      {/* Top Bar Navigation */}
      <Link
        href="/properties"
        style={{
          color: "#0284c7",
          textDecoration: "none",
          fontWeight: "600",
          fontSize: "0.875rem",
        }}
      >
        ← Back to Properties
      </Link>

      <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Assets at {property.name}</h1>
        <p style={{ color: "#64748b", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
          Code: <strong>{property.code}</strong> | Total Registered Assets: {propertyAssets.length}
        </p>
      </div>

      {/* Assets Table */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflowX: "auto",
          backgroundColor: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                color: "#475569",
              }}
            >
              <th style={{ padding: "0.75rem 1rem" }}>Asset Code</th>
              <th style={{ padding: "0.75rem 1rem" }}>Asset Name</th>
              <th style={{ padding: "0.75rem 1rem" }}>Category</th>
              <th style={{ padding: "0.75rem 1rem" }}>Location</th>
              <th style={{ padding: "0.75rem 1rem" }}>Make / Model</th>
              <th style={{ padding: "0.75rem 1rem" }}>Op Status</th>
              <th style={{ padding: "0.75rem 1rem" }}>Criticality</th>
              <th style={{ padding: "0.75rem 1rem" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {propertyAssets.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  No assets found for this property.
                </td>
              </tr>
            ) : (
              propertyAssets.map((asset) => (
                <tr
                  key={asset.id}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  {/* Code */}
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily: "monospace",
                      fontWeight: "600",
                      color: "#0284c7",
                    }}
                  >
                    {asset.assetCode || asset.id.slice(0, 8)}
                  </td>

                  {/* Name */}
                  <td style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "#0f172a" }}>
                    {asset.assetName}
                  </td>

                  {/* Category */}
                  <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                    {asset.categoryName || "Uncategorized"}
                  </td>

                  {/* Location (Building / Floor / Grid) */}
                  <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                    {[asset.buildingName, asset.floorName, asset.gridReference]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </td>

                  {/* Make & Model */}
                  <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                    {asset.make || asset.modelNumber
                      ? `${asset.make || ''} ${asset.modelNumber || ''}`.trim()
                      : "—"}
                  </td>

                  {/* Operational Status */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        backgroundColor:
                          asset.operationalStatus === "operative"
                            ? "#dcfce7"
                            : "#fee2e2",
                        color:
                          asset.operationalStatus === "operative"
                            ? "#15803d"
                            : "#b91c1c",
                      }}
                    >
                      {asset.operationalStatus || "operative"}
                    </span>
                  </td>

                  {/* Criticality */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        textTransform: "capitalize",
                        backgroundColor:
                          asset.criticality === "high"
                            ? "#fef2f2"
                            : asset.criticality === "medium"
                            ? "#fffbebe1"
                            : "#f0fdf4",
                        color:
                          asset.criticality === "high"
                            ? "#dc2626"
                            : asset.criticality === "medium"
                            ? "#b45309"
                            : "#166534",
                      }}
                    >
                      {asset.criticality || "medium"}
                    </span>
                  </td>

                  {/* Completion Score */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "6px",
                          backgroundColor: "#e2e8f0",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${asset.completionScore}%`,
                            height: "100%",
                            backgroundColor:
                              asset.completionScore >= 80
                                ? "#22c55e"
                                : asset.completionScore >= 50
                                ? "#eab308"
                                : "#f97316",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {asset.completionScore}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}