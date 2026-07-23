import fs from 'fs';
import path from 'path';
import { db } from './index';
import { assetCategories, assetSubcategories, properties, assets } from './schema';

interface SeedData {
  properties: any[];
  categories: any[];
  subcategories: any[];
}

async function runSeed() {
  console.log('🌱 Starting database seeding from seed-data.json...\n');

  try {
    const jsonPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Seed file not found at path: ${jsonPath}`);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data: SeedData = JSON.parse(fileContent);

    console.log('🧹 Clearing existing data...');
    // Clear dependent assets first to satisfy Foreign Key constraints
    await db.delete(assets); 
    await db.delete(assetSubcategories);
    await db.delete(assetCategories);
    await db.delete(properties);
    console.log('   ✓ Tables cleared cleanly.\n');

    if (data.properties?.length) {
      console.log(`🏢 Ingesting ${data.properties.length} properties...`);
      await db.insert(properties).values(data.properties).onConflictDoNothing();
      console.log('   ✓ Properties seeded successfully.');
    }

    if (data.categories?.length) {
      console.log(`📦 Ingesting ${data.categories.length} categories...`);
      await db.insert(assetCategories).values(data.categories).onConflictDoNothing();
      console.log('   ✓ Categories seeded successfully.');
    }

    if (data.subcategories?.length) {
      console.log(`🏷️ Ingesting ${data.subcategories.length} subcategories...`);
      
      // Explicitly map keys to accommodate both camelCase and snake_case Drizzle schemas
      const subcategoryValues = data.subcategories.map((sub) => ({
        id: sub.id,
        categoryId: sub.categoryId || sub.category_id,
        code: sub.code,
        name: sub.name,
        // Map curatedMakes for both JS and DB column conventions
        curatedMakes: sub.curatedMakes || sub.curated_makes || [],
        curated_makes: sub.curatedMakes || sub.curated_makes || [],
        // Map specSchema for both JS and DB column conventions
        specSchema: sub.specSchema || sub.spec_schema || [],
        spec_schema: sub.specSchema || sub.spec_schema || [],
      }));

      await db.insert(assetSubcategories).values(subcategoryValues as any).onConflictDoNothing();
      console.log('   ✓ Subcategories seeded successfully with specSchema and curatedMakes.');
    }

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    process.exit(1);
  }
}

runSeed();