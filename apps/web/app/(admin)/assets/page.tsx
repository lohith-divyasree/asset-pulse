// app/(admin)/assets/page.tsx
import AssetsView from '@/components/admin/AssetsView';
import { db } from '@asset-pulse/db';
import { assets } from '@asset-pulse/db/schema';
import { desc } from 'drizzle-orm';

async function getAssets() {
  try {
    const assetList = await db
      .select()
      .from(assets)
      .orderBy(desc(assets.createdAt)); // Sorts by creation time descending
      
    return assetList;
  } catch (error) {
    console.error('Failed to fetch assets from database:', error);
    return [];
  }
}

export default async function AssetsPage() {
  const initialAssets = await getAssets();

  return <AssetsView initialAssets={initialAssets} />;
}