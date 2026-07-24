'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Asset {
  id: string;
  name: string;
  code: string;
  category?: string;
  room?: {
    name: string;
    floor?: {
      name: string;
      building?: {
        name: string;
        property?: {
          name: string;
          city: string;
        };
      };
    };
  };
}

interface AssetsViewProps {
  initialAssets: Asset[];
}

export default function AssetsView({ initialAssets }: AssetsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = initialAssets.filter((asset) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = asset.name.toLowerCase().includes(term);
    const codeMatch = asset.code.toLowerCase().includes(term);
    const categoryMatch = asset.category?.toLowerCase().includes(term) || false;
    
    const room = asset.room;
    const floor = room?.floor;
    const building = floor?.building;
    const property = building?.property;

    const roomMatch = room?.name.toLowerCase().includes(term) || false;
    const floorMatch = floor?.name.toLowerCase().includes(term) || false;
    const buildingMatch = building?.name.toLowerCase().includes(term) || false;
    const propertyMatch = property?.name.toLowerCase().includes(term) || property?.city.toLowerCase().includes(term) || false;

    return nameMatch || codeMatch || categoryMatch || roomMatch || floorMatch || buildingMatch || propertyMatch;
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
                const room = asset.room;
                const floor = room?.floor;
                const building = floor?.building;
                const property = building?.property;

                return (
                  <tr key={asset.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{asset.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{asset.code}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {asset.category || 'Uncategorized'}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {property ? `${property.name} (${property.city})` : <span style={{ color: "#94a3b8" }}>N/A</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {building ? building.name : <span style={{ color: "#94a3b8" }}>N/A</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#334155" }}>
                      {room ? (
                        <div>
                          <span style={{ fontWeight: "500" }}>{room.name}</span>
                          {floor && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{floor.name}</div>}
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