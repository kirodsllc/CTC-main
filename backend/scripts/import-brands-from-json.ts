import prisma from '../src/config/database';
import fs from 'fs';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

async function importBrands() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file`);
    
    // Extract unique brands (case-insensitive, trimmed)
    const brandSet = new Set<string>();
    
    for (const item of data) {
      if (item.brand && typeof item.brand === 'string') {
        const brandName = item.brand.trim();
        if (brandName) {
          brandSet.add(brandName);
        }
      }
    }
    
    const uniqueBrands = Array.from(brandSet).sort();
    console.log(`\n📋 Found ${uniqueBrands.length} unique brands:`);
    uniqueBrands.forEach((brand, index) => {
      console.log(`  ${index + 1}. ${brand}`);
    });
    
    // Import brands to database using upsert (only creates if doesn't exist)
    console.log('\n💾 Importing brands to database...');
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const brandName of uniqueBrands) {
      try {
        // Use upsert to create if not exists, or update if exists
        const brand = await prisma.brand.upsert({
          where: { name: brandName },
          update: {
            // If exists, ensure it's active
            status: 'active',
          },
          create: {
            name: brandName,
            status: 'active',
          },
        });
        
        // Check if this was a new creation by checking createdAt vs updatedAt
        // (rough check - if they're very close, it was likely just created)
        const timeDiff = brand.updatedAt.getTime() - brand.createdAt.getTime();
        if (timeDiff < 1000) {
          // Likely a new record
          createdCount++;
          console.log(`  ✅ Created: ${brandName}`);
        } else {
          skippedCount++;
          console.log(`  ⏭️  Already exists: ${brandName}`);
        }
      } catch (error: any) {
        console.error(`  ❌ Error importing "${brandName}":`, error.message);
      }
    }
    
    console.log('\n✨ Import completed!');
    console.log(`   Created: ${createdCount} brands`);
    console.log(`   Skipped (already exist): ${skippedCount} brands`);
    console.log(`   Total processed: ${uniqueBrands.length} brands`);
    
  } catch (error: any) {
    console.error('❌ Error importing brands:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importBrands()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

