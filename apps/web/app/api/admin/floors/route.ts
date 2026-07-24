'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Room {
  id: string;
  name: string;
  code: string;
}

interface Floor {
  id: string;
  name: string;
  level: number;
  rooms?: Room[];
}

interface Building {
  id: string;
  name: string;
  code: string;
  floors?: Floor[];
}

interface Property {
  id: string;
  code: string;
  name: string;
  city: string;
  wave: number;
  legacyName?: string | null;
  isAnchor: boolean;
  buildings?: Building[];
}

interface PropertiesViewProps {
  initialProperties: Property[];
}

export default function PropertiesView({ initialProperties }: PropertiesViewProps) {
  const router = useRouter();
  const [properties] = useState<Property[]>(initialProperties);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Controls
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);

  // Manual Property Form States
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [wave, setWave] = useState('1');
  const [legacyName, setLegacyName] = useState('');
  const [isAnchor, setIsAnchor] = useState(false);

  // Building Form States
  const [targetPropertyId, setTargetPropertyId] = useState('');
  const [targetPropertyName, setTargetPropertyName] = useState('');
  const [buildingCode, setBuildingCode] = useState('');
  const [buildingName, setBuildingName] = useState('');

  // CSV States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = () => router.refresh();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'single',
          property: { code, name, city, wave, legacyName, isAnchor },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create property');

      closeModals();
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'single',
          building: { code: buildingCode, name: buildingName, propertyId: targetPropertyId },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create building');

      closeModals();
      refreshData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setSubmitting(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim() !== '');
        if (lines.length < 2) throw new Error('CSV file is empty or missing data rows.');

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const parsedList = [];

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].split(',').map((val) => val.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = currentLine[index];
          });
          if (obj.code && obj.name) parsedList.push(obj);
        }

        const res = await fetch('/api/admin/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulk', propertiesList: parsedList }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to ingest CSV');

        closeModals();
        refreshData();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    };
    reader.readAsText(csvFile);
  };

  const closeModals = () => {
    setIsManualModalOpen(false);
    setIsCsvModalOpen(false);
    setIsBuildingModalOpen(false);
    setCode('');
    setName('');
    setCity('');
    setWave('1');
    setLegacyName('');
    setIsAnchor(false);
    setBuildingCode('');
    setBuildingName('');
    setTargetPropertyId('');
    setTargetPropertyName('');
    setCsvFile(null);
    setError(null);
  };

  const openBuildingModal = (propertyId: string, propertyName: string) => {
    setTargetPropertyId(propertyId);
    setTargetPropertyName(propertyName);
    setIsBuildingModalOpen(true);
  };

  const filteredProperties = properties.filter(
    (prop) =>
      prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0f172a" }}>Property Portfolio</h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
            Manage waves, anchor assets, and spatial configurations.
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Search input filter */}
          <input
            type="text"
            placeholder="Search properties or cities..."
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

          {/* Action Buttons */}
          <button
            onClick={() => setIsCsvModalOpen(true)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              color: "#334155",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            📂 Ingest CSV
          </button>
          
          <button
            onClick={() => setIsManualModalOpen(true)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              backgroundColor: "#0284c7",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            + Add Property
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {filteredProperties.map((property) => (
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
                    marginBottom: "0.75rem",
                  }}
                >
                  ★ Anchor Property
                </span>
              )}

              {/* Spatial Hierarchy View (Buildings, Floors, Rooms) */}
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px solid #f1f5f9",
                  fontSize: "0.85rem",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "600", color: "#334155" }}>Spatial Layout:</span>
                  <button
                    onClick={() => openBuildingModal(property.id, property.name)}
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor: "#e0f2fe",
                      color: "#0369a1",
                      border: "none",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    + Add Building
                  </button>
                </div>

                {property.buildings && property.buildings.length > 0 ? (
                  property.buildings.map((bldg) => (
                    <div key={bldg.id} style={{ marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
                      <span style={{ fontWeight: "500", color: "#0284c7" }}>🏛️ {bldg.name}</span>
                      {bldg.floors?.map((floor) => (
                        <div key={floor.id} style={{ paddingLeft: "1rem", color: "#475569" }}>
                          <span>🚪 {floor.name}</span>
                          <div style={{ paddingLeft: "1rem", display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                            {floor.rooms?.map((room) => (
                              <span
                                key={room.id}
                                style={{
                                  backgroundColor: "#e2e8f0",
                                  color: "#334155",
                                  fontSize: "0.75rem",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {room.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No spatial configuration defined.</span>
                )}
              </div>
            </div>

            {/* View Assets Action Link */}
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

      {/* MANUAL ADD PROPERTY MODAL */}
      {isManualModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem", width: "100%", maxWidth: "480px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Add Single Property</h2>
                <button type="button" onClick={closeModals} style={{ background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#64748b" }}>✕</button>
              </div>

              {error && <div style={{ backgroundColor: "#ffeeee", color: "#dc2626", fontSize: "0.8rem", padding: "0.5rem", borderRadius: "6px" }}>{error}</div>}

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>Property Code</label>
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PROP-001" style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>Property Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Divyasree Chambers" style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>City</label>
                  <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru" style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>Survey Wave</label>
                  <select value={wave} onChange={(e) => setWave(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box", backgroundColor: "#fff" }}>
                    <option value="1">Wave 1</option>
                    <option value="2">Wave 2</option>
                    <option value="3">Wave 3</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>Legacy Name (Optional)</label>
                <input type="text" value={legacyName} onChange={(e) => setLegacyName(e.target.value)} placeholder="e.g. Old Building Name" style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="anchorCheck" checked={isAnchor} onChange={(e) => setIsAnchor(e.target.checked)} />
                <label htmlFor="anchorCheck" style={{ fontSize: "0.8rem", fontWeight: "600", color: "#334155", cursor: "pointer" }}>Mark as Anchor Property</label>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" onClick={closeModals} style={{ flex: 1, backgroundColor: "#f1f5f9", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", color: "#475569" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, backgroundColor: "#0284c7", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", color: "#ffffff" }}>
                  {submitting ? 'Saving...' : 'Save Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BUILDING MODAL */}
      {isBuildingModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleBuildingSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Add Building</h2>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>Property: {targetPropertyName}</p>
                </div>
                <button type="button" onClick={closeModals} style={{ background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#64748b" }}>✕</button>
              </div>

              {error && <div style={{ backgroundColor: "#ffeeee", color: "#dc2626", fontSize: "0.8rem", padding: "0.5rem", borderRadius: "6px" }}>{error}</div>}

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>Building Code</label>
                <input type="text" required value={buildingCode} onChange={(e) => setBuildingCode(e.target.value)} placeholder="e.g. BLDG-A" style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#334155" }}>Building Name</label>
                <input type="text" required value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="e.g. Tower Alpha" style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" onClick={closeModals} style={{ flex: 1, backgroundColor: "#f1f5f9", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", color: "#475569" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, backgroundColor: "#0284c7", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", color: "#ffffff" }}>
                  {submitting ? 'Saving...' : 'Save Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV UPLOAD MODAL */}
      {isCsvModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem", width: "100%", maxWidth: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleCsvUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Ingest Properties from CSV</h2>
                <button type="button" onClick={closeModals} style={{ background: "none", border: "none", fontSize: "1rem", cursor: "pointer", color: "#64748b" }}>✕</button>
              </div>

              {error && <div style={{ backgroundColor: "#ffeeee", color: "#dc2626", fontSize: "0.8rem", padding: "0.5rem", borderRadius: "6px" }}>{error}</div>}

              <div style={{ fontSize: "0.8rem", color: "#475569", backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 0.25rem 0", fontWeight: "600", color: "#334155" }}>Required CSV Columns:</p>
                <code style={{ color: "#0284c7" }}>code, name, city, wave, legacyName, isAnchor</code>
              </div>

              <div>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" onClick={closeModals} style={{ flex: 1, backgroundColor: "#f1f5f9", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", color: "#475569" }}>Cancel</button>
                <button type="submit" disabled={submitting || !csvFile} style={{ flex: 1, backgroundColor: "#0284c7", border: "none", padding: "0.6rem", borderRadius: "6px", fontWeight: "600", cursor: "pointer", color: "#ffffff" }}>
                  {submitting ? 'Uploading...' : 'Upload & Ingest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}