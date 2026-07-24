import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@asset-pulse/db';
import { assets } from '@asset-pulse/db/schema';

// 🟢 GET Single Asset (Required for Edit Mode)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const assetId = params.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing x-user-id header.' },
        { status: 401 }
      );
    }

    // 1. Fetch Asset and verify surveyor ownership/access
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.surveyorId, userId)))
      .limit(1);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized to view.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('❌ Failed to fetch asset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// UPDATE Asset
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const assetId = params.id;
    const body = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing x-user-id header.' },
        { status: 401 }
      );
    }

    // 1. Verify Asset Exists and Belongs to the Surveyor
    const [existingAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.surveyorId, userId)))
      .limit(1);

    if (!existingAsset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized to edit.' },
        { status: 404 }
      );
    }

    // 2. Perform Update
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
        operationalStatus: body.operationalStatus ?? existingAsset.operationalStatus,
        completionScore: body.completionScore ?? existingAsset.completionScore,
        specifications: body.specifications ?? existingAsset.specifications,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId))
      .returning();

    return NextResponse.json({ success: true, data: updatedAsset });
  } catch (error: any) {
    console.error('❌ Failed to update asset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE Asset
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    const assetId = params.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing x-user-id header.' },
        { status: 401 }
      );
    }

    // Verify ownership and delete
    const [deletedAsset] = await db
      .delete(assets)
      .where(and(eq(assets.id, assetId), eq(assets.surveyorId, userId)))
      .returning();

    if (!deletedAsset) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized to delete.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Asset deleted successfully.' });
  } catch (error: any) {
    console.error('❌ Failed to delete asset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}