// app/(admin)/page.tsx
import AdminDashboardView from '@/components/admin/AdminDashboardView';
import { db } from '@asset-pulse/db';
import { assets, properties, users } from '@asset-pulse/db/schema';
import { desc, count } from 'drizzle-orm';

async function getDashboardStats() {
  try {
    const [propertyCountRes, assetCountRes, userCountRes, recentAssetsList] = await Promise.all([
      db.select({ value: count() }).from(properties),
      db.select({ value: count() }).from(assets),
      db.select({ value: count() }).from(users),
      db.select().from(assets).orderBy(desc(assets.createdAt)).limit(5),
    ]);

    return {
      totalProperties: propertyCountRes[0]?.value || 0,
      totalAssets: assetCountRes[0]?.value || 0,
      totalUsers: userCountRes[0]?.value || 0,
      recentAssets: recentAssetsList,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error);
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