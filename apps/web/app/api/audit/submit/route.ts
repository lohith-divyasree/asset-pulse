import { NextResponse } from "next/server";
import { db } from "@asset-pulse/db";
import {
  assetMaintenanceLogs,
  auditLogs,
  assets,
} from "@asset-pulse/db/schema";
import { eq, or, ilike } from "drizzle-orm";

// Helper to verify UUID format
function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const body = await req.json();

    const {
      assetId: identifier, // Can be asset UUID or assetCode
      conditionRating,
      operationalStatus,
      notes,
      photoUrls,
      nextScheduledDate,
      action = "AUDIT_SUBMITTED",
    } = body;

    // 1. Validations
    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: assetId or assetCode.",
        },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing x-user-id header." },
        { status: 401 },
      );
    }

    // 2. Resolve Target Asset by ID or Asset Code
    const identifierCondition = isUuid(identifier)
      ? or(eq(assets.id, identifier), ilike(assets.assetCode, identifier))
      : ilike(assets.assetCode, identifier);

    const [targetAsset] = await db
      .select()
      .from(assets)
      .where(identifierCondition)
      .limit(1);

    if (!targetAsset) {
      return NextResponse.json(
        { success: false, error: `Asset not found for: ${identifier}` },
        { status: 404 },
      );
    }

    const resolvedAssetId = targetAsset.id;

    // Format next scheduled date (default: 6 months out)
    const scheduledDate = nextScheduledDate
      ? new Date(nextScheduledDate).toISOString().split("T")[0]
      : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

    // 3. Sequential Execution (Neon HTTP compatible)

    // A. Insert into asset_maintenance_logs
    const [maintenanceLog] = await db
      .insert(assetMaintenanceLogs)
      .values({
        assetId: resolvedAssetId,
        auditorId: userId,
        conditionRating: conditionRating || targetAsset.conditionRating || "1",
        operationalStatus: operationalStatus || targetAsset.operationalStatus,
        notes: notes ?? null,
        photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
        nextScheduledDate: scheduledDate,
        servicedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    // B. Insert into audit_logs
    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        assetId: resolvedAssetId,
        userId: userId,
        action: action,
        changes: {
          previous: {
            conditionRating: targetAsset.conditionRating,
            operationalStatus: targetAsset.operationalStatus,
          },
          updated: {
            conditionRating: conditionRating || targetAsset.conditionRating,
            operationalStatus:
              operationalStatus || targetAsset.operationalStatus,
            notes,
            photoUrls,
          },
        },
        createdAt: new Date(),
      })
      .returning();

    // C. Sync status onto primary Asset record
    await db
      .update(assets)
      .set({
        ...(conditionRating && { conditionRating }),
        ...(operationalStatus && { operationalStatus }),
        surveyedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, resolvedAssetId));

    return NextResponse.json({
      success: true,
      message: "Audit and maintenance logs persisted successfully.",
      data: {
        maintenanceLog,
        auditLog,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to persist audit and maintenance logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
