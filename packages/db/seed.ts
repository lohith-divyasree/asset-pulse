import fs from 'fs';
import path from 'path';
import { db } from './index'; // Make sure this points to your initialized Drizzle database instance
import { assetCategories, assetSubcategories, properties } from './schema';

interface SeedData {
  properties: (typeof properties.$inferInsert)[];
  categories: (typeof assetCategories.$inferInsert)[];
  subcategories: (typeof assetSubcategories.$inferInsert)[];
}

async function runSeed() {
  console.log('🌱 Starting database seeding from seed-data.json...\n');

  try {
    // 1. Locate and read the seed-data.json file
    const jsonPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Seed file not found at path: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: SeedData = JSON.parse(fileContent);

    // 2. Clear existing data in correct dependency order
    console.log('🧹 Clearing existing data...');
    await db.delete(assetSubcategories);
    await db.delete(assetCategories);
    await db.delete(properties);
    console.log('   ✓ Tables cleared cleanly.\n');

    // 3. Seed Properties
    if (data.properties && data.properties.length > 0) {
      console.log(`🏢 Ingesting ${data.properties.length} properties...`);
      await db.insert(properties).values(data.properties).onConflictDoNothing();
      console.log('   ✓ Properties seeded successfully.');
    }

    // 4. Seed Categories (Root Taxonomy)
    if (data.categories && data.categories.length > 0) {
      console.log(`📦 Ingesting ${data.categories.length} categories...`);
      await db.insert(assetCategories).values(data.categories).onConflictDoNothing();
      console.log('   ✓ Categories seeded successfully.');
    }

    // 5. Seed Subcategories (Linked to Categories via categoryId)
    if (data.subcategories && data.subcategories.length > 0) {
      console.log(`🏷️ Ingesting ${data.subcategories.length} subcategories...`);
      await db.insert(assetSubcategories).values(data.subcategories).onConflictDoNothing();
      console.log('   ✓ Subcategories seeded successfully.');
    }

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    process.exit(1);
  }
}

runSeed();