'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Asset {
  id: string;
  // Core Asset Identifiers (Flat & Nested Aliases)
  assetName?: string;
  name?: string;
  assetCode?: string;
  code?: string;

  // Joined Taxonomy
  categoryName?: string;
  category?: string;

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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = initialAssets.filter((asset) => {
    const term = searchTerm.toLowerCase();

    // 1. Resolve Asset Identity
    const displayName = asset.assetName || asset.name || '';
    const displayCode = asset.assetCode || asset.code || '';
    const displayCategory = asset.categoryName || asset.category || '';

    // 2. Resolve Spatial Names (Flat SQL joins OR legacy nested fallback)
    const displayProperty = asset.propertyName || asset.room?.floor?.building?.property?.name || '';
    const displayCity = asset.city || asset.room?.floor?.building?.property?.city || '';
    const displayBuilding = asset.buildingName || asset.room?.floor?.building?.name || '';
    const displayFloor = asset.floorName || asset.room?.floor?.name || '';
    const displayRoom = asset.roomName || asset.room?.name || '';

    // 3. Safe Keyword Matching
    const nameMatch = displayName.toLowerCase().includes(term);
    const codeMatch = displayCode.toLowerCase().includes(term);
    const categoryMatch = displayCategory.toLowerCase().includes(term);
    const propertyMatch = displayProperty.toLowerCase().includes(term) || displayCity.toLowerCase().includes(term);
    const buildingMatch = displayBuilding.toLowerCase().includes(term);
    const floorMatch = displayFloor.toLowerCase().includes(term);
    const roomMatch = displayRoom.toLowerCase().includes(term);

    return (
      nameMatch ||
      codeMatch ||
      categoryMatch ||
      propertyMatch ||
      buildingMatch ||
      floorMatch ||
      roomMatch
    );
  });

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0f172a" }}>All Enterprise Assets</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            Comprehensive inventory mapping assets across properties, buildings, floors, and rooms.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Search assets, rooms, buildings..."
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
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
            <tr>
              <th style={{ padding: "0.75rem 1rem" }}>Asset Code & Name</th>
              <th style={{ padding: "0.75rem 1rem" }}>Category</th>
              <th style={{ padding: "0.75rem 1rem" }}>Property</th>
              <th style={{ padding: "0.75rem 1rem" }}>Building</th>
              <th style={{ padding: "0.75rem 1rem" }}>Floor / Room</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                // Resolved spatial display values
                const displayName = asset.assetName || asset.name || 'Untitled Asset';
                const displayCode = asset.assetCode || asset.code || 'NO-CODE';
                const displayCategory = asset.categoryName || asset.category || 'Uncategorized';
                
                const propName = asset.propertyName || asset.room?.floor?.building?.property?.name;
                const propCity = asset.city || asset.room?.floor?.building?.property?.city;
                const bldName = asset.buildingName || asset.room?.floor?.building?.name;
                const flrName = asset.floorName || asset.room?.floor?.name;
                const rmName = asset.roomName || asset.room?.name;

                return (
                  <tr key={asset.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{displayName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{displayCode}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {displayCategory}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {propName ? (
                        `${propName}${propCity ? ` (${propCity})` : ''}`
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
                          <span style={{ fontWeight: "500" }}>{rmName ? `📍 ${rmName}` : 'All Rooms'}</span>
                          {flrName && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>🚪 {flrName}</div>}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  No matching assets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}