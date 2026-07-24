// components/auditor/AuditorReportForm.tsx
"use client";

import { useState } from "react";

interface AuditorReportFormProps {
  assetId: string;
  currentCondition?: string;
  currentOpStatus?: string;
  defaultNextDate: string;
}

export default function AuditorReportForm({
  assetId,
  currentCondition = "GOOD",
  currentOpStatus = "operative",
  defaultNextDate,
}: AuditorReportFormProps) {
  const [condition, setCondition] = useState(currentCondition);
  const [opStatus, setOpStatus] = useState(currentOpStatus);
  const [nextDate, setNextDate] = useState(defaultNextDate);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/audit/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          auditorId: "CURRENT_USER_ID", // Replace with logged-in user session ID
          conditionRating: condition,
          operationalStatus: opStatus,
          notes,
          nextScheduledDate: nextDate,
        }),
      });

      if (res.ok) setSuccess(true);
    } catch (err) {
      console.error("Audit submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p style={{ fontWeight: "bold", color: "#166534", margin: 0 }}>
          ✅ Audit Report Saved Successfully!
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#15803d",
            marginTop: "0.25rem",
          }}
        >
          The next maintenance date has been updated.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #e2e8f0",
        padding: "1.25rem",
        borderRadius: "8px",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0 }}>
        Record Maintenance Audit
      </h3>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.25rem",
          }}
        >
          Condition Rating
        </label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="EXCELLENT">Excellent</option>
          <option value="GOOD">Good / Normal</option>
          <option value="NEEDS_REPAIR">Needs Repair</option>
          <option value="CRITICAL">Critical Replacement Required</option>
        </select>
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.25rem",
          }}
        >
          Operational Status
        </label>
        <select
          value={opStatus}
          onChange={(e) => setOpStatus(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="operative">Operative</option>
          <option value="inoperative">Inoperative</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.25rem",
          }}
        >
          Next Maintenance Service Date
        </label>
        <input
          type="date"
          value={nextDate}
          onChange={(e) => setNextDate(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "0.25rem",
          }}
        >
          Maintenance Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe inspection findings, serviced parts, or recommendations..."
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          backgroundColor: "#0284c7",
          color: "#fff",
          border: "none",
          padding: "0.75rem",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "Submitting Report..." : "Submit Maintenance Report"}
      </button>
    </form>
  );
}
