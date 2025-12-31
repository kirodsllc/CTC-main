import prisma from '../src/config/database';
import fs from 'fs';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

async function importSubcategories() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file`);
    
    // Extract unique combinations of (category, subcategory)
    const subcategoryMap = new Map<string, Set<string>>(); // category -> Set of subcategories
    
    for (const item of data) {
      const categoryName = item.Catigory?.trim();
      const subcategoryName = item['sub catigory']?.trim();
      
      if (categoryName && subcategoryName) {
        if (!subcategoryMap.has(categoryName)) {
          subcategoryMap.set(categoryName, new Set());
        }
        subcategoryMap.get(categoryName)!.add(subcategoryName);
      }
    }
    
    // Count total unique subcategories
    let totalSubcategories = 0;
    const subcategoryList: Array<{ category: string; subcategory: string }> = [];
    
    for (const [category, subcategories] of subcategoryMap.entries()) {
      for (const subcategory of subcategories) {
        subcategoryList.push({ category, subcategory });
        totalSubcategories++;
      }
    }
    
    console.log(`\n📋 Found ${totalSubcategories} unique subcategory-category combinations:`);
    console.log(`   Across ${subcategoryMap.size} categories\n`);
    
    // Group by category for better display
    for (const [category, subcategories] of Array.from(subcategoryMap.entries()).sort()) {
      console.log(`   ${category}: ${subcategories.size} subcategories`);
      Array.from(subcategories).sort().forEach((sub, idx) => {
        if (idx < 5) {
          console.log(`     - ${sub}`);
        } else if (idx === 5) {
          console.log(`     ... and ${subcategories.size - 5} more`);
        }
      });
    }
    
    // Get all categories from database to map names to IDs
    console.log('\n🔍 Loading categories from database...');
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.name, cat.id);
    }
    
    console.log(`✅ Loaded ${categories.length} categories from database`);
    
    // Import subcategories
    console.log('\n💾 Importing subcategories to database...');
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const missingCategories: string[] = [];
    
    for (const { category, subcategory } of subcategoryList) {
      try {
        // Find category ID
        const categoryId = categoryMap.get(category);
        
        if (!categoryId) {
          if (!missingCategories.includes(category)) {
            missingCategories.push(category);
            console.log(`  ⚠️  Category not found in database: "${category}" - skipping subcategory "${subcategory}"`);
          }
          errorCount++;
          continue;
        }
        
        // Check if subcategory already exists for this category
        const existing = await prisma.subcategory.findFirst({
          where: {
            categoryId: categoryId,
            name: subcategory,
          },
        });
        
        if (existing) {
          skippedCount++;
          // Only log first few skipped items to avoid spam
          if (skippedCount <= 5) {
            console.log(`  ⏭️  Already exists: "${subcategory}" in "${category}"`);
          }
        } else {
          // Create new subcategory
          await prisma.subcategory.create({
            data: {
              name: subcategory,
              categoryId: categoryId,
              status: 'active',
            },
          });
          createdCount++;
          console.log(`  ✅ Created: "${subcategory}" in "${category}"`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`  ❌ Error importing "${subcategory}" in "${category}":`, error.message);
      }
    }
    
    console.log('\n✨ Import completed!');
    console.log(`   Created: ${createdCount} subcategories`);
    console.log(`   Skipped (already exist): ${skippedCount} subcategories`);
    console.log(`   Errors: ${errorCount} subcategories`);
    console.log(`   Total processed: ${totalSubcategories} subcategories`);
    
    if (missingCategories.length > 0) {
      console.log(`\n⚠️  Missing categories (${missingCategories.length}):`);
      missingCategories.forEach(cat => console.log(`   - ${cat}`));
      console.log('\n💡 Tip: Run import-categories-from-json.ts first to ensure all categories exist.');
    }
    
  } catch (error: any) {
    console.error('❌ Error importing subcategories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importSubcategories()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

