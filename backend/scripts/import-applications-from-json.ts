import prisma from '../src/config/database';
import fs from 'fs';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

async function importApplications() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file`);
    
    // Extract unique combinations of (category, subcategory, application)
    const applicationMap = new Map<string, Map<string, Set<string>>>(); // category -> subcategory -> Set of applications
    
    for (const item of data) {
      const categoryName = item.Catigory?.trim();
      const subcategoryName = item['sub catigory']?.trim();
      const applicationName = item.application?.trim();
      
      // Skip only truly invalid application names (dot, dash, or empty)
      if (applicationName && (applicationName === '.' || applicationName === '-' || applicationName === '')) {
        continue; // Skip invalid applications
      }
      
      if (categoryName && subcategoryName && applicationName) {
        if (!applicationMap.has(categoryName)) {
          applicationMap.set(categoryName, new Map());
        }
        const subcategoryMap = applicationMap.get(categoryName)!;
        
        if (!subcategoryMap.has(subcategoryName)) {
          subcategoryMap.set(subcategoryName, new Set());
        }
        subcategoryMap.get(subcategoryName)!.add(applicationName);
      }
    }
    
    // Count total unique applications
    let totalApplications = 0;
    const applicationList: Array<{ category: string; subcategory: string; application: string }> = [];
    
    for (const [category, subcategories] of applicationMap.entries()) {
      for (const [subcategory, applications] of subcategories.entries()) {
        for (const application of applications) {
          applicationList.push({ category, subcategory, application });
          totalApplications++;
        }
      }
    }
    
    console.log(`\n📋 Found ${totalApplications} unique application-subcategory combinations:`);
    console.log(`   Across ${applicationMap.size} categories\n`);
    
    // Group by category for better display
    for (const [category, subcategories] of Array.from(applicationMap.entries()).sort()) {
      let catTotal = 0;
      for (const apps of subcategories.values()) {
        catTotal += apps.size;
      }
      console.log(`   ${category}: ${catTotal} applications across ${subcategories.size} subcategories`);
    }
    
    // Get all categories and subcategories from database to map names to IDs
    console.log('\n🔍 Loading categories and subcategories from database...');
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
    });
    
    const subcategories = await prisma.subcategory.findMany({
      include: { category: true },
    });
    
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.name, cat.id);
    }
    
    const subcategoryMap = new Map<string, Map<string, string>>(); // category -> subcategory -> id
    for (const sub of subcategories) {
      const catName = sub.category.name;
      if (!subcategoryMap.has(catName)) {
        subcategoryMap.set(catName, new Map());
      }
      subcategoryMap.get(catName)!.set(sub.name, sub.id);
    }
    
    console.log(`✅ Loaded ${categories.length} categories and ${subcategories.length} subcategories from database`);
    
    // Import applications
    console.log('\n💾 Importing applications to database...');
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const missingSubcategories: string[] = [];
    
    for (const { category, subcategory, application } of applicationList) {
      try {
        // Find subcategory ID
        const catMap = subcategoryMap.get(category);
        if (!catMap) {
          if (!missingSubcategories.includes(`${category} -> ${subcategory}`)) {
            missingSubcategories.push(`${category} -> ${subcategory}`);
            console.log(`  ⚠️  Subcategory not found: "${subcategory}" in "${category}" - skipping application "${application}"`);
          }
          errorCount++;
          continue;
        }
        
        const subcategoryId = catMap.get(subcategory);
        if (!subcategoryId) {
          if (!missingSubcategories.includes(`${category} -> ${subcategory}`)) {
            missingSubcategories.push(`${category} -> ${subcategory}`);
            console.log(`  ⚠️  Subcategory not found: "${subcategory}" in "${category}" - skipping application "${application}"`);
          }
          errorCount++;
          continue;
        }
        
        // Check if application already exists for this subcategory
        const existing = await prisma.application.findFirst({
          where: {
            subcategoryId: subcategoryId,
            name: application,
          },
        });
        
        if (existing) {
          skippedCount++;
          // Only log first few skipped items to avoid spam
          if (skippedCount <= 5) {
            console.log(`  ⏭️  Already exists: "${application}" in "${subcategory}" (${category})`);
          }
        } else {
          // Create new application
          await prisma.application.create({
            data: {
              name: application,
              subcategoryId: subcategoryId,
              status: 'active',
            },
          });
          createdCount++;
          console.log(`  ✅ Created: "${application}" in "${subcategory}" (${category})`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`  ❌ Error importing "${application}" in "${subcategory}" (${category}):`, error.message);
      }
    }
    
    console.log('\n✨ Import completed!');
    console.log(`   Created: ${createdCount} applications`);
    console.log(`   Skipped (already exist): ${skippedCount} applications`);
    console.log(`   Errors: ${errorCount} applications`);
    console.log(`   Total processed: ${totalApplications} applications`);
    
    if (missingSubcategories.length > 0) {
      console.log(`\n⚠️  Missing subcategories (${missingSubcategories.length}):`);
      missingSubcategories.forEach(sub => console.log(`   - ${sub}`));
      console.log('\n💡 Tip: Run import-subcategories-from-json.ts first to ensure all subcategories exist.');
    }
    
  } catch (error: any) {
    console.error('❌ Error importing applications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importApplications()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

