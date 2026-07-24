import { NextResponse } from "next/server";
import { db, properties, users } from "@asset-pulse/db";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");

    // If request comes from Mobile App (where x-user-id is present)
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
          { status: 401 }
        );
      }
    }

    // Web admin or active mobile user -> Return properties
    const data = await db.select().from(properties);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

// POST: Handle Manual Single Property Creation or CSV Bulk Ingestion
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, property, propertiesList } = body;

    // 1. Manual Single Property Creation
    if (action === 'single') {
      if (!property?.code || !property?.name || !property?.city || property?.wave === undefined) {
        return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
      }

      const [newProp] = await db
        .insert(properties)
        .values({
          code: property.code,
          name: property.name,
          city: property.city,
          wave: Number(property.wave),
          legacyName: property.legacyName || null,
          isAnchor: Boolean(property.isAnchor),
        })
        .returning();

      return NextResponse.json({ success: true, data: newProp });
    }

    // 2. Bulk CSV Ingestion
    if (action === 'bulk') {
      if (!Array.isArray(propertiesList) || propertiesList.length === 0) {
        return NextResponse.json({ success: false, error: 'No properties provided for bulk insert.' }, { status: 400 });
      }

      const formattedValues = propertiesList.map((p: any) => ({
        code: p.code,
        name: p.name,
        city: p.city,
        wave: Number(p.wave) || 1,
        legacyName: p.legacyName || null,
        isAnchor: p.isAnchor === 'true' || p.isAnchor === true,
      }));

      const inserted = await db
        .insert(properties)
        .values(formattedValues)
        .onConflictDoNothing() // Prevent crashing if property code already exists
        .returning();

      return NextResponse.json({ success: true, count: inserted.length });
    }

    return NextResponse.json({ success: false, error: 'Invalid action type.' }, { status: 400 });
  } catch (error: any) {
    console.error('❌ Failed to process properties:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}