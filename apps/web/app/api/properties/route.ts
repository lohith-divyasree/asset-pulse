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