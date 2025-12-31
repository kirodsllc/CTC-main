import prisma from '../src/config/database';
import fs from 'fs';
import path from 'path';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

async function importCategories() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file`);
    
    // Extract unique categories (case-insensitive, trimmed)
    const categorySet = new Set<string>();
    
    for (const item of data) {
      if (item.Catigory && typeof item.Catigory === 'string') {
        const categoryName = item.Catigory.trim();
        if (categoryName) {
          categorySet.add(categoryName);
        }
      }
    }
    
    const uniqueCategories = Array.from(categorySet).sort();
    console.log(`\n📋 Found ${uniqueCategories.length} unique categories:`);
    uniqueCategories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat}`);
    });
    
    // Import categories to database using upsert (only creates if doesn't exist)
    console.log('\n💾 Importing categories to database...');
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const categoryName of uniqueCategories) {
      try {
        // Use upsert to create if not exists, or update if exists
        const category = await prisma.category.upsert({
          where: { name: categoryName },
          update: {
            // If exists, ensure it's active
            status: 'active',
          },
          create: {
            name: categoryName,
            status: 'active',
          },
        });
        
        // Check if this was a new creation by checking createdAt vs updatedAt
        // (rough check - if they're very close, it was likely just created)
        const timeDiff = category.updatedAt.getTime() - category.createdAt.getTime();
        if (timeDiff < 1000) {
          // Likely a new record
          createdCount++;
          console.log(`  ✅ Created: ${categoryName}`);
        } else {
          skippedCount++;
          console.log(`  ⏭️  Already exists: ${categoryName}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Error importing "${categoryName}":`, error.message);
      }
    }
    
    console.log('\n✨ Import completed!');
    console.log(`   Created: ${createdCount} categories`);
    console.log(`   Skipped (already exist): ${skippedCount} categories`);
    console.log(`   Total processed: ${uniqueCategories.length} categories`);
    
  } catch (error: any) {
    console.error('❌ Error importing categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importCategories()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

