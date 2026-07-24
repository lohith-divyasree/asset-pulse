import { NextResponse } from "next/server";
import { eq, and, or, ilike } from "drizzle-orm";
import { db } from "@asset-pulse/db";
import { assets } from "@asset-pulse/db/schema";

// Helper to check if string is a valid Postgres UUID
function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}

// 🟢 GET Single Asset (Accessible to Auditors, Surveyors, and Admins)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;

    // Build condition safely avoiding UUID type-cast crashes & allow case-insensitive assetCode lookup
    const identifierCondition = isUuid(identifier)
      ? or(eq(assets.id, identifier), ilike(assets.assetCode, identifier))
      : ilike(assets.assetCode, identifier);

    // Fetch Asset without restriction on surveyorId
    const [asset] = await db
      .select()
      .from(assets)
      .where(identifierCondition)
      .limit(1);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    console.error("❌ Failed to fetch asset:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

// 🟡 UPDATE Asset
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = req.headers.get("x-user-id");
    const { id: identifier } = await params;
    const body = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing x-user-id header." },
        { status: 401 },
      );
    }

    const identifierCondition = isUuid(identifier)
      ? or(eq(assets.id, identifier), ilike(assets.assetCode, identifier))
      : ilike(assets.assetCode, identifier);

    // Fetch existing asset record
    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(identifierCondition)
      .limit(1);

    if (!existingAsset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 404 },
      );
    }

    // Perform Update targeting the primary key UUID
    const [updatedAsset] = await db
      .update(assets)
      .set({
        assetName: body.assetName || existingAsset.assetName,
        make: body.make ?? existingAsset.make,
        modelNumber: body.modelNumber ?? existingAsset.modelNumber,
        serialNumber: body.serialNumber ?? existingAsset.serialNumber,
        gridReference: body.gridReference ?? existingAsset.gridReference,
        conditionRating: body.conditionRating ?? existingAsset.conditionRating,
        criticality: body.criticality ?? existingAsset.criticality,
        operationalStatus:
          body.operationalStatus ?? existingAsset.operationalStatus,
        completionScore: body.completionScore ?? existingAsset.completionScore,
        photoUrls: Array.isArray(body.photoUrls)
          ? body.photoUrls
          : existingAsset.photoUrls,
        specifications: body.specifications ?? existingAsset.specifications,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, existingAsset.id))
      .returning();

    return NextResponse.json({ success: true, data: updatedAsset });
  } catch (error: any) {
    console.error("❌ Failed to update asset:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

// 🔴 DELETE Asset
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = req.headers.get("x-user-id");
    const { id: identifier } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing x-user-id header." },
        { status: 401 },
      );
    }

    const identifierCondition = isUuid(identifier)
      ? or(eq(assets.id, identifier), ilike(assets.assetCode, identifier))
      : ilike(assets.assetCode, identifier);

    const [deletedAsset] = await db
      .delete(assets)
      .where(identifierCondition)
      .returning();

    if (!deletedAsset) {
      return NextResponse.json(
        { success: false, error: "Asset not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Asset deleted successfully.",
    });
  } catch (error: any) {
    console.error("❌ Failed to delete asset:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
