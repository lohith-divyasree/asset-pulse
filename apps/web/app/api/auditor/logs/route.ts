import { NextResponse } from "next/server";
import { db } from "@asset-pulse/db";
import { assets, assetMaintenanceLogs } from "@asset-pulse/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing x-user-id header." },
        { status: 401 },
      );
    }

    // Query logs strictly for the current auditor (e.g., Bob)
    const logs = await db
      .select({
        id: assetMaintenanceLogs.id,
        assetId: assets.id,
        assetCode: assets.assetCode,
        assetName: assets.assetName,
        conditionRating: assetMaintenanceLogs.conditionRating,
        operationalStatus: assetMaintenanceLogs.operationalStatus,
        servicedAt: assetMaintenanceLogs.servicedAt,
        createdAt: assetMaintenanceLogs.createdAt,
      })
      .from(assetMaintenanceLogs)
      .innerJoin(assets, eq(assetMaintenanceLogs.assetId, assets.id))
      .where(eq(assetMaintenanceLogs.auditorId, userId))
      .orderBy(desc(assetMaintenanceLogs.createdAt));

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch auditor logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE an audit log record belonging to the current auditor
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing x-user-id header." },
        { status: 401 },
      );
    }

    if (!logId) {
      return NextResponse.json(
        { success: false, error: "Missing log ID parameter." },
        { status: 400 },
      );
    }

    // Ensure the log belongs strictly to the authenticated auditor before deleting
    const deleted = await db
      .delete(assetMaintenanceLogs)
      .where(
        and(
          eq(assetMaintenanceLogs.id, logId),
          eq(assetMaintenanceLogs.auditorId, userId),
        ),
      )
      .returning();

    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: "Log record not found or unauthorized." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Audit record deleted successfully.",
    });
  } catch (error: any) {
    console.error("❌ Failed to delete audit log:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
