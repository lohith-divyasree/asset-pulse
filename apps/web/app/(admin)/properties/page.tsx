import React from "react";
import Link from "next/link"; // 1. Added Link import
import { db } from '@asset-pulse/db';
import { properties } from '@asset-pulse/db/schema';

async function getProperties() {
  return await db.select().from(properties);
}

export default async function PropertiesPage() {
  const propertiesList = await getProperties();

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>AssetPulse — Property Portfolio</h1>
      <p style={{ color: "#666" }}>
        Manage waves, anchor assets, and spatial configurations.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        {propertiesList?.map((property: any) => (
          <div
            key={property.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1.25rem",
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                  {property.name}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: property.wave === 1 ? "#e0f2fe" : "#fef3c7",
                    color: property.wave === 1 ? "#0369a1" : "#b45309",
                    fontWeight: "600",
                  }}
                >
                  Wave {property.wave}
                </span>
              </div>

              <p
                style={{
                  margin: "0.5rem 0",
                  color: "#475569",
                  fontSize: "0.9rem",
                }}
              >
                Code: <strong>{property.code}</strong> | City: {property.city}
              </p>

              {property.isAnchor && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#16a34a",
                    fontWeight: "bold",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  ★ Anchor Property
                </span>
              )}
            </div>

            {/* 2. Added View Assets Action Link */}
            <div
              style={{
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Link
                href={`/properties/${property.id}`}
                style={{
                  fontSize: "0.85rem",
                  color: "#0284c7",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                View Assets →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}