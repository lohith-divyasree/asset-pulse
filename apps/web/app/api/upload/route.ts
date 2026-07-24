import { NextResponse } from "next/server";
import { db, users } from "@asset-pulse/db";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");

    // Check user activation status if request contains x-user-id header
    if (userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || user.isActive === false) {
        return NextResponse.json(
          {
            success: false,
            code: "ACCOUNT_DEACTIVATED",
            error: "Your account has been deactivated.",
          },
          { status: 401 },
        );
      }
    }

    // Parse the incoming multipart form data
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No photo file provided." },
        { status: 400 },
      );
    }

    // Upload directly to Vercel Blob storage
    const blob = await put(`assets/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error: any) {
    console.error("❌ Error uploading photo to Vercel Blob:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to upload photo.",
      },
      { status: 500 },
    );
  }
}
