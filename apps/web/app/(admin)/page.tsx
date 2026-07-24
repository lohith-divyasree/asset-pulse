// app/(admin)/page.tsx
import AdminDashboardView from "@/components/admin/AdminDashboardView";
import { db } from "@asset-pulse/db";
import {
  assets,
  assetCategories,
  properties,
  users,
} from "@asset-pulse/db/schema";
import { desc, count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDashboardStats() {
  try {
    const [propertyCountRes, assetCountRes, userCountRes, recentAssetsList] =
      await Promise.all([
        db.select({ value: count() }).from(properties),
        db.select({ value: count() }).from(assets),
        db.select({ value: count() }).from(users),

        // 💡 Join assetCategories to retrieve the actual category name
        db
          .select({
            id: assets.id,
            assetName: assets.assetName,
            assetCode: assets.assetCode,
            categoryName: assetCategories.name,
            createdAt: assets.createdAt,
          })
          .from(assets)
          .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
          .orderBy(desc(assets.createdAt))
          .limit(5),
      ]);

    return {
      totalProperties: Number(propertyCountRes[0]?.value || 0),
      totalAssets: Number(assetCountRes[0]?.value || 0),
      totalUsers: Number(userCountRes[0]?.value || 0),
      recentAssets: recentAssetsList,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard metrics:", error);
    return {
      totalProperties: 0,
      totalAssets: 0,
      totalUsers: 0,
      recentAssets: [],
    };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return <AdminDashboardView stats={stats} />;
}
