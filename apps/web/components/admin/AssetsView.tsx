"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

interface Asset {
  id: string;
  // Core Asset Identifiers
  assetName?: string;
  name?: string;
  assetCode?: string;
  code?: string;

  // Joined Taxonomy
  categoryName?: string;
  category?: string;

  // Photos & Dates
  photoUrls?: string[] | null;
  createdAt?: string | Date | null;

  // Joined Spatial Hierarchy Display Names
  propertyName?: string;
  city?: string;
  buildingName?: string;
  floorName?: string;
  roomName?: string;

  // Legacy/Nested Spatial Objects
  room?: {
    name?: string;
    floor?: {
      name?: string;
      building?: {
        name?: string;
        property?: {
          name?: string;
          city?: string;
        };
      };
    };
  };
}

interface AssetsViewProps {
  initialAssets: Asset[];
}

export default function AssetsView({ initialAssets = [] }: AssetsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQrAsset, setSelectedQrAsset] = useState<Asset | null>(null);

  const filteredAssets = initialAssets.filter((asset) => {
    const term = searchTerm.toLowerCase();

    const displayName = asset.assetName || asset.name || "";
    const displayCode = asset.assetCode || asset.code || "";
    const displayCategory = asset.categoryName || asset.category || "";

    const displayProperty =
      asset.propertyName || asset.room?.floor?.building?.property?.name || "";
    const displayCity =
      asset.city || asset.room?.floor?.building?.property?.city || "";
    const displayBuilding =
      asset.buildingName || asset.room?.floor?.building?.name || "";
    const displayFloor = asset.floorName || asset.room?.floor?.name || "";
    const displayRoom = asset.roomName || asset.room?.name || "";

    return (
      displayName.toLowerCase().includes(term) ||
      displayCode.toLowerCase().includes(term) ||
      displayCategory.toLowerCase().includes(term) ||
      displayProperty.toLowerCase().includes(term) ||
      displayCity.toLowerCase().includes(term) ||
      displayBuilding.toLowerCase().includes(term) ||
      displayFloor.toLowerCase().includes(term) ||
      displayRoom.toLowerCase().includes(term)
    );
  });

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0f172a" }}
          >
            All Enterprise Assets
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#64748b",
              marginTop: "0.25rem",
            }}
          >
            Comprehensive inventory mapping assets across properties, buildings,
            floors, and rooms.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Search assets, rooms, codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              width: "250px",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />

          <Link
            href="/"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              color: "#334155",
              fontSize: "0.875rem",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            ← Back to Properties
          </Link>
        </div>
      </div>

      {/* Assets Table */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#fff",
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
          <thead
            style={{
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              color: "#334155",
            }}
          >
            <tr>
              <th style={{ padding: "0.75rem 1rem" }}>Asset Code & Name</th>
              <th style={{ padding: "0.75rem 1rem" }}>QR Tag</th>
              <th style={{ padding: "0.75rem 1rem" }}>Category</th>
              <th style={{ padding: "0.75rem 1rem" }}>Property</th>
              <th style={{ padding: "0.75rem 1rem" }}>Building</th>
              <th style={{ padding: "0.75rem 1rem" }}>Floor / Room</th>
              <th style={{ padding: "0.75rem 1rem" }}>Photos</th>
              <th style={{ padding: "0.75rem 1rem" }}>Registered Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                const displayName =
                  asset.assetName || asset.name || "Untitled Asset";
                const displayCode = asset.assetCode || asset.code || asset.id;
                const displayCategory =
                  asset.categoryName || asset.category || "Uncategorized";

                const propName =
                  asset.propertyName ||
                  asset.room?.floor?.building?.property?.name;
                const propCity =
                  asset.city || asset.room?.floor?.building?.property?.city;
                const bldName =
                  asset.buildingName || asset.room?.floor?.building?.name;
                const flrName = asset.floorName || asset.room?.floor?.name;
                const rmName = asset.roomName || asset.room?.name;

                const photoList = Array.isArray(asset.photoUrls)
                  ? asset.photoUrls
                  : [];

                // Standard Web Scan Deep Link Target URL
                const scanUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/scan/${displayCode}`;

                return (
                  <tr
                    key={asset.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>
                        {displayName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#0284c7",
                          fontFamily: "monospace",
                          fontWeight: "bold",
                        }}
                      >
                        {displayCode}
                      </div>
                    </td>

                    {/* 🔲 QR Code Column */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <button
                        onClick={() => setSelectedQrAsset(asset)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.35rem 0.6rem",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#f8fafc",
                          cursor: "pointer",
                        }}
                      >
                        <QRCodeSVG value={scanUrl} size={36} />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#0284c7",
                            fontWeight: "600",
                          }}
                        >
                          View Label
                        </span>
                      </button>
                    </td>

                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {displayCategory}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {propName ? (
                        `${propName}${propCity ? ` (${propCity})` : ""}`
                      ) : (
                        <span style={{ color: "#94a3b8" }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {bldName || <span style={{ color: "#94a3b8" }}>N/A</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {rmName || flrName ? (
                        <div>
                          <span style={{ fontWeight: "500" }}>
                            {rmName ? `📍 ${rmName}` : "All Rooms"}
                          </span>
                          {flrName && (
                            <div
                              style={{ fontSize: "0.75rem", color: "#64748b" }}
                            >
                              🚪 {flrName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>N/A</span>
                      )}
                    </td>

                    {/* 📷 Photos Column */}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {photoList.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.375rem",
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          {photoList.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.75rem",
                                color: "#0284c7",
                                backgroundColor: "#f0f9ff",
                                border: "1px solid #bae6fd",
                                padding: "0.2rem 0.4rem",
                                borderRadius: "4px",
                                textDecoration: "none",
                                fontWeight: "600",
                              }}
                            >
                              🖼️ Link {idx + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                          No Photos
                        </span>
                      )}
                    </td>

                    {/* 📅 Registered Date Column */}
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        color: "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {asset.createdAt
                        ? new Date(asset.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "N/A"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  No matching assets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔲 QR Code Preview Modal */}
      {selectedQrAsset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "16px",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "bold",
                color: "#0f172a",
                marginBottom: "0.25rem",
              }}
            >
              {selectedQrAsset.assetName || selectedQrAsset.name}
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#0284c7",
                fontWeight: "bold",
                fontFamily: "monospace",
                marginBottom: "1.5rem",
              }}
            >
              {selectedQrAsset.assetCode || selectedQrAsset.code}
            </p>

            <div
              style={{
                display: "inline-block",
                padding: "1rem",
                backgroundColor: "#fff",
                border: "2px solid #e2e8f0",
                borderRadius: "12px",
                marginBottom: "1.5rem",
              }}
            >
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/scan/${selectedQrAsset.assetCode || selectedQrAsset.code}`}
                size={200}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  backgroundColor: "#0284c7",
                  color: "#fff",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                🖨️ Print Tag
              </button>
              <button
                onClick={() => setSelectedQrAsset(null)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  backgroundColor: "#f1f5f9",
                  color: "#334155",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
