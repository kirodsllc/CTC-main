import prisma from '../src/config/database';
import fs from 'fs';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

// Helper function to parse number strings (handles commas and decimals)
function parseNumber(value: any): number | null {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// Helper function to check if string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function importAllData() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file\n`);
    
    // Pre-load all lookup tables for faster access
    console.log('🔍 Loading lookup tables...');
    const [categories, subcategories, brands, applications] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.subcategory.findMany({ 
        include: { category: true }
      }),
      prisma.brand.findMany({ select: { id: true, name: true } }),
      prisma.application.findMany({ 
        include: { subcategory: { include: { category: true } } }
      }),
    ]);
    
    // Create lookup maps
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => categoryMap.set(cat.name, cat.id));
    
    const subcategoryMap = new Map<string, Map<string, string>>(); // category -> subcategory -> id
    subcategories.forEach(sub => {
      const catName = sub.category.name;
      if (!subcategoryMap.has(catName)) {
        subcategoryMap.set(catName, new Map());
      }
      subcategoryMap.get(catName)!.set(sub.name, sub.id);
    });
    
    const brandMap = new Map<string, string>();
    brands.forEach(brand => brandMap.set(brand.name, brand.id));
    
    const applicationMap = new Map<string, Map<string, Map<string, string>>>(); // category -> subcategory -> application -> id
    applications.forEach(app => {
      const catName = app.subcategory.category.name;
      const subName = app.subcategory.name;
      if (!applicationMap.has(catName)) {
        applicationMap.set(catName, new Map());
      }
      if (!applicationMap.get(catName)!.has(subName)) {
        applicationMap.get(catName)!.set(subName, new Map());
      }
      applicationMap.get(catName)!.get(subName)!.set(app.name, app.id);
    });
    
    console.log(`✅ Loaded ${categories.length} categories, ${subcategories.length} subcategories, ${brands.length} brands, ${applications.length} applications\n`);
    
    // Statistics
    let masterPartsCreated = 0;
    let masterPartsSkipped = 0;
    let partsCreated = 0;
    let partsSkipped = 0;
    let modelsCreated = 0;
    let errors = 0;
    const errorLog: string[] = [];
    
    console.log('💾 Starting import...\n');
    
    // Process each item
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      try {
        // Extract data
        const masterPartNo = item['Master Part no']?.trim();
        const partNo = item['ss part no']?.trim();
        const brandName = item.brand?.trim();
        const categoryName = item.Catigory?.trim();
        const subcategoryName = item['sub catigory']?.trim();
        const applicationName = item.application?.trim();
        const description = item.Discription?.trim();
        const cost = parseNumber(item.cost);
        const priceA = parseNumber(item['price a']);
        const priceB = parseNumber(item['price b']);
        const size = item.size?.trim() || null;
        const models = item.models || [];
        
        // Validate required fields - create a unique part number if missing
        let finalPartNo = partNo;
        if (!finalPartNo) {
          // Generate a unique part number for items without one
          finalPartNo = `AUTO-${masterPartNo || 'UNKNOWN'}-${i + 1}`;
          console.log(`  ⚠️  Row ${i + 1}: Missing part number, generated: ${finalPartNo}`);
        }
        
        // Handle Master Part
        let masterPartId = null;
        if (masterPartNo) {
          try {
            const masterPart = await prisma.masterPart.upsert({
              where: { masterPartNo: masterPartNo },
              update: {},
              create: { masterPartNo: masterPartNo },
            });
            masterPartId = masterPart.id;
            if (masterPart.createdAt.getTime() === masterPart.updatedAt.getTime()) {
              masterPartsCreated++;
            } else {
              masterPartsSkipped++;
            }
          } catch (error: any) {
            // If upsert fails, try to find existing
            const existing = await prisma.masterPart.findUnique({
              where: { masterPartNo: masterPartNo },
            });
            if (existing) {
              masterPartId = existing.id;
              masterPartsSkipped++;
            } else {
              throw error;
            }
          }
        }
        
        // Handle Brand
        let brandId = null;
        if (brandName) {
          brandId = brandMap.get(brandName) || null;
          if (!brandId) {
            // Try to find or create
            try {
              const brand = await prisma.brand.findUnique({
                where: { name: brandName },
              });
              if (brand) {
                brandId = brand.id;
                brandMap.set(brandName, brandId);
              }
            } catch (error) {
              // Brand not found, skip
            }
          }
        }
        
        // Handle Category
        let categoryId = null;
        if (categoryName) {
          categoryId = categoryMap.get(categoryName) || null;
        }
        
        // Handle Subcategory
        let subcategoryId = null;
        if (categoryName && subcategoryName) {
          const subMap = subcategoryMap.get(categoryName);
          if (subMap) {
            subcategoryId = subMap.get(subcategoryName) || null;
          }
        }
        
        // Handle Application
        let applicationId = null;
        if (categoryName && subcategoryName && applicationName) {
          const catMap = applicationMap.get(categoryName);
          if (catMap) {
            const subMap = catMap.get(subcategoryName);
            if (subMap) {
              applicationId = subMap.get(applicationName) || null;
            }
          }
        }
        
        // Check if part already exists
        let part;
        const existingPart = await prisma.part.findUnique({
          where: { partNo: finalPartNo },
        });
        
        if (existingPart) {
          // Update existing part with latest data
          part = await prisma.part.update({
            where: { id: existingPart.id },
            data: {
              masterPartId: masterPartId || existingPart.masterPartId,
              brandId: brandId || existingPart.brandId,
              description: description || existingPart.description,
              categoryId: categoryId || existingPart.categoryId,
              subcategoryId: subcategoryId || existingPart.subcategoryId,
              applicationId: applicationId || existingPart.applicationId,
              cost: cost !== null ? cost : existingPart.cost,
              priceA: priceA !== null ? priceA : existingPart.priceA,
              priceB: priceB !== null ? priceB : existingPart.priceB,
              size: size || existingPart.size,
            },
          });
          partsSkipped++;
        } else {
          // Create new Part
          part = await prisma.part.create({
            data: {
              masterPartId: masterPartId,
              partNo: finalPartNo,
              brandId: brandId,
              description: description || null,
              categoryId: categoryId,
              subcategoryId: subcategoryId,
              applicationId: applicationId,
              cost: cost,
              priceA: priceA,
              priceB: priceB,
              size: size,
              status: 'active',
            },
          });
          partsCreated++;
        }
        
        // Always create/update models for the part (whether new or existing)
        if (models && models.length > 0) {
          for (const modelData of models) {
            const modelName = modelData.model?.trim();
            const qty = parseInt(modelData.qty || '1', 10) || 1;
            
            if (modelName) {
              try {
                // Check if model exists
                const existingModel = await prisma.model.findFirst({
                  where: {
                    partId: part.id,
                    name: modelName,
                  },
                });
                
                if (existingModel) {
                  // Update existing model quantity
                  await prisma.model.update({
                    where: { id: existingModel.id },
                    data: { qtyUsed: qty },
                  });
                } else {
                  // Create new model
                  await prisma.model.create({
                    data: {
                      partId: part.id,
                      name: modelName,
                      qtyUsed: qty,
                    },
                  });
                  modelsCreated++;
                }
              } catch (error: any) {
                // If unique constraint error, model already exists, try to update
                if (error.code === 'P2002') {
                  const existingModel = await prisma.model.findFirst({
                    where: {
                      partId: part.id,
                      name: modelName,
                    },
                  });
                  if (existingModel) {
                    await prisma.model.update({
                      where: { id: existingModel.id },
                      data: { qtyUsed: qty },
                    });
                  }
                }
              }
            }
          }
        }
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`  Processed ${i + 1}/${data.length} items... (${partsCreated} parts created, ${partsSkipped} skipped)`);
        }
        
      } catch (error: any) {
        errors++;
        const errorMsg = `Row ${i + 1}: ${error.message}`;
        errorLog.push(errorMsg);
        if (errors <= 10) {
          console.error(`  ❌ ${errorMsg}`);
        }
      }
    }
    
    console.log('\n✨ Import completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Master Parts: ${masterPartsCreated} created, ${masterPartsSkipped} already existed`);
    console.log(`   Parts: ${partsCreated} created, ${partsSkipped} already existed`);
    console.log(`   Models: ${modelsCreated} created`);
    console.log(`   Errors: ${errors}`);
    
    if (errorLog.length > 0 && errors <= 20) {
      console.log(`\n⚠️  Error details:`);
      errorLog.forEach(err => console.log(`   ${err}`));
    } else if (errors > 20) {
      console.log(`\n⚠️  ${errors} errors occurred. First 10 shown above.`);
    }
    
  } catch (error: any) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importAllData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

