// components/AdminDashboardView.tsx
'use client';

import Link from 'next/link';

interface DashboardStats {
  totalProperties: number;
  totalAssets: number;
  totalUsers: number;
  recentAssets: any[];
}

interface AdminDashboardViewProps {
  stats: DashboardStats;
}

export default function AdminDashboardView({ stats }: AdminDashboardViewProps) {
  return (
    <div style={{ padding: "2.5rem", fontFamily: "sans-serif", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
          Dashboard Overview
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
          Welcome back. Here is a real-time summary of your enterprise portfolio and asset inventory.
        </p>
      </div>

      {/* KPI Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <div style={{ backgroundColor: "#ffffff", padding: "1.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#64748b" }}>Total Properties</div>
          <div style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#0f172a", marginTop: "0.5rem" }}>
            {stats.totalProperties}
          </div>
          <Link href="/properties" style={{ display: "inline-block", fontSize: "0.75rem", color: "#0284c7", fontWeight: "600", textDecoration: "none", marginTop: "0.75rem" }}>
            Manage Properties →
          </Link>
        </div>

        <div style={{ backgroundColor: "#ffffff", padding: "1.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#64748b" }}>Total Assets</div>
          <div style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#0f172a", marginTop: "0.5rem" }}>
            {stats.totalAssets}
          </div>
          <Link href="/assets" style={{ display: "inline-block", fontSize: "0.75rem", color: "#0284c7", fontWeight: "600", textDecoration: "none", marginTop: "0.75rem" }}>
            View All Assets →
          </Link>
        </div>

        <div style={{ backgroundColor: "#ffffff", padding: "1.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#64748b" }}>System Users</div>
          <div style={{ fontSize: "2.25rem", fontWeight: "bold", color: "#0f172a", marginTop: "0.5rem" }}>
            {stats.totalUsers}
          </div>
          <Link href="/users" style={{ display: "inline-block", fontSize: "0.75rem", color: "#0284c7", fontWeight: "600", textDecoration: "none", marginTop: "0.75rem" }}>
            Manage Permissions →
          </Link>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1.5rem", marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e293b", margin: "0 0 1rem 0" }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/properties" style={{ padding: "0.6rem 1rem", backgroundColor: "#0284c7", color: "#ffffff", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>
            🏢 Add / Manage Properties
          </Link>
          <Link href="/assets" style={{ padding: "0.6rem 1rem", backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>
            📦 Audit Asset Inventory
          </Link>
          <Link href="/users" style={{ padding: "0.6rem 1rem", backgroundColor: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>
            👥 Configure Access Control
          </Link>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e293b", margin: 0 }}>Recently Added Assets</h2>
          <Link href="/assets" style={{ fontSize: "0.8125rem", color: "#0284c7", fontWeight: "600", textDecoration: "none" }}>
            View all
          </Link>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
            <tr>
              <th style={{ padding: "0.75rem 1.5rem" }}>Asset Name</th>
              <th style={{ padding: "0.75rem 1.5rem" }}>Code</th>
              <th style={{ padding: "0.75rem 1.5rem" }}>Category</th>
              <th style={{ padding: "0.75rem 1.5rem" }}>Registered Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentAssets.length > 0 ? (
              stats.recentAssets.map((asset: any) => (
                <tr key={asset.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1.5rem", fontWeight: "600", color: "#0f172a" }}>
                    {asset.name}
                  </td>
                  <td style={{ padding: "0.75rem 1.5rem", color: "#64748b" }}>
                    {asset.code}
                  </td>
                  <td style={{ padding: "0.75rem 1.5rem", color: "#475569" }}>
                    {asset.category || 'Uncategorized'}
                  </td>
                  <td style={{ padding: "0.75rem 1.5rem", color: "#64748b" }}>
                    {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  No recent assets recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}