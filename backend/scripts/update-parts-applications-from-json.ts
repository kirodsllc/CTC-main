import prisma from '../src/config/database';
import fs from 'fs';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

async function updatePartsApplications() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file\n`);
    
    // Pre-load all applications for faster lookup
    console.log('🔍 Loading applications from database...');
    const applications = await prisma.application.findMany({
      include: {
        subcategory: {
          include: {
            category: true,
          },
        },
      },
    });
    
    // Create lookup map: category -> subcategory -> application -> id
    const applicationMap = new Map<string, Map<string, Map<string, string>>>();
    for (const app of applications) {
      const catName = app.subcategory.category.name;
      const subName = app.subcategory.name;
      const appName = app.name;
      
      if (!applicationMap.has(catName)) {
        applicationMap.set(catName, new Map());
      }
      const catMap = applicationMap.get(catName)!;
      
      if (!catMap.has(subName)) {
        catMap.set(subName, new Map());
      }
      const subMap = catMap.get(subName)!;
      
      subMap.set(appName, app.id);
    }
    
    console.log(`✅ Loaded ${applications.length} applications from database\n`);
    
    // Statistics
    let partsUpdated = 0;
    let partsSkipped = 0;
    let applicationsNotFound = 0;
    let errors = 0;
    const notFoundApps = new Set<string>();
    
    console.log('💾 Updating parts with applications...\n');
    
    // Process each item
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      try {
        const partNo = item['ss part no']?.trim();
        const categoryName = item.Catigory?.trim();
        const subcategoryName = item['sub catigory']?.trim();
        const applicationName = item.application?.trim();
        
        if (!partNo) {
          continue;
        }
        
        // Find the part
        const part = await prisma.part.findUnique({
          where: { partNo: partNo },
        });
        
        if (!part) {
          continue; // Part doesn't exist, skip
        }
        
        // Find application ID (skip only truly invalid application names)
        let applicationId = null;
        if (categoryName && subcategoryName && applicationName && 
            applicationName !== '.' && applicationName !== '-' && applicationName !== '') {
          const catMap = applicationMap.get(categoryName);
          if (catMap) {
            const subMap = catMap.get(subcategoryName);
            if (subMap) {
              applicationId = subMap.get(applicationName) || null;
            }
          }
          
          if (!applicationId) {
            applicationsNotFound++;
            const key = `${categoryName} -> ${subcategoryName} -> ${applicationName}`;
            if (!notFoundApps.has(key) && notFoundApps.size < 20) {
              notFoundApps.add(key);
            }
          }
        }
        
        // Update part if application is found and different
        if (applicationId && part.applicationId !== applicationId) {
          await prisma.part.update({
            where: { id: part.id },
            data: { applicationId: applicationId },
          });
          partsUpdated++;
        } else if (!applicationId && part.applicationId) {
          // Application not found, but part has one - keep existing
          partsSkipped++;
        } else if (applicationId && part.applicationId === applicationId) {
          // Already correct
          partsSkipped++;
        } else {
          // No application in JSON and none in DB - skip
          partsSkipped++;
        }
        
        // Progress indicator
        if ((i + 1) % 500 === 0) {
          console.log(`  Processed ${i + 1}/${data.length} items... (${partsUpdated} updated, ${partsSkipped} skipped)`);
        }
        
      } catch (error: any) {
        errors++;
        if (errors <= 10) {
          console.error(`  ❌ Row ${i + 1}: ${error.message}`);
        }
      }
    }
    
    console.log('\n✨ Update completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Parts Updated: ${partsUpdated}`);
    console.log(`   Parts Skipped: ${partsSkipped}`);
    console.log(`   Applications Not Found: ${applicationsNotFound}`);
    console.log(`   Errors: ${errors}`);
    
    if (notFoundApps.size > 0) {
      console.log(`\n⚠️  Applications not found (${notFoundApps.size} unique):`);
      Array.from(notFoundApps).slice(0, 20).forEach(app => {
        console.log(`   - ${app}`);
      });
      console.log('\n💡 Tip: Make sure all applications are imported first using import-applications-from-json.ts');
    }
    
  } catch (error: any) {
    console.error('❌ Error updating parts applications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePartsApplications()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

