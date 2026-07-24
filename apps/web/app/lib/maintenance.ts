import { addDays, differenceInDays } from "date-fns";

interface ComputeMaintenanceParams {
  createdAt: Date | string;
  surveyedAt?: Date | string | null;
  lastServicedAt?: Date | string | null;
  categoryIntervalDays?: number | null;
  subcategoryIntervalDays?: number | null;
}

/**
 * Calculates the projected next maintenance date based on hierarchy cadence:
 * Subcategory Interval -> Category Interval -> Default 90 Days
 */
export function computeNextMaintenanceDate({
  createdAt,
  surveyedAt,
  lastServicedAt,
  categoryIntervalDays,
  subcategoryIntervalDays,
}: ComputeMaintenanceParams): Date {
  // 1. Determine Cadence Interval (Subcategory > Category > Default 90 Days)
  const intervalDays = subcategoryIntervalDays ?? categoryIntervalDays ?? 90;

  // 2. Base Date: Most recent service date -> surveyedAt -> createdAt
  const baseDate = lastServicedAt
    ? new Date(lastServicedAt)
    : surveyedAt
      ? new Date(surveyedAt)
      : new Date(createdAt);

  return addDays(baseDate, intervalDays);
}

/**
 * Returns visual badge status and colors based on days remaining until maintenance
 */
export function getMaintenanceBadgeStatus(nextDateInput: string | Date | null) {
  if (!nextDateInput) {
    return { label: "UNSCHEDULED", color: "#64748b", bg: "#f1f5f9" };
  }

  const today = new Date();
  const nextDate = new Date(nextDateInput);
  const daysLeft = differenceInDays(nextDate, today);

  if (daysLeft < 0) {
    return { label: "OVERDUE", color: "#dc2626", bg: "#fef2f2" };
  }
  if (daysLeft <= 14) {
    return { label: "DUE SOON", color: "#d97706", bg: "#fffbeb" };
  }
  return { label: "UP TO DATE", color: "#16a34a", bg: "#f0fdf4" };
}
