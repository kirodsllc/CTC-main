import prisma from '../src/config/database';
import fs from 'fs';

const JSON_FILE_PATH = 'c:/Users/Abdullah Rehman/Downloads/CTC_Item_Lists_with_size.json';

async function importModels() {
  try {
    console.log('📖 Reading JSON file...');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log(`✅ Loaded ${data.length} items from JSON file\n`);
    
    // Statistics
    let modelsCreated = 0;
    let modelsUpdated = 0;
    let modelsSkipped = 0;
    let partsNotFound = 0;
    let errors = 0;
    const errorLog: string[] = [];
    const partsNotFoundSet = new Set<string>();
    
    console.log('💾 Starting model import...\n');
    
    // Process each item
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      try {
        const partNo = item['ss part no']?.trim();
        const models = item.models || [];
        
        if (!partNo) {
          errors++;
          if (errors <= 10) {
            errorLog.push(`Row ${i + 1}: Missing part number (ss part no)`);
          }
          continue;
        }
        
        if (!models || !Array.isArray(models) || models.length === 0) {
          // No models for this item, skip
          continue;
        }
        
        // Find the part by part number, or create it if missing
        let part = await prisma.part.findUnique({
          where: { partNo: partNo },
        });
        
        if (!part) {
          // Part doesn't exist, try to create it from the JSON data
          try {
            // Get master part
            let masterPartId = null;
            const masterPartNo = item['Master Part no']?.trim();
            if (masterPartNo) {
              const masterPart = await prisma.masterPart.upsert({
                where: { masterPartNo: masterPartNo },
                update: {},
                create: { masterPartNo: masterPartNo },
              });
              masterPartId = masterPart.id;
            }
            
            // Get brand
            let brandId = null;
            const brandName = item.brand?.trim();
            if (brandName) {
              const brand = await prisma.brand.findUnique({
                where: { name: brandName },
              });
              if (brand) {
                brandId = brand.id;
              }
            }
            
            // Get category
            let categoryId = null;
            const categoryName = item.Catigory?.trim();
            if (categoryName) {
              const category = await prisma.category.findUnique({
                where: { name: categoryName },
              });
              if (category) {
                categoryId = category.id;
              }
            }
            
            // Get subcategory
            let subcategoryId = null;
            if (categoryName && item['sub catigory']?.trim()) {
              const subcategoryName = item['sub catigory'].trim();
              const subcategory = await prisma.subcategory.findFirst({
                where: {
                  name: subcategoryName,
                  category: { name: categoryName },
                },
              });
              if (subcategory) {
                subcategoryId = subcategory.id;
              }
            }
            
            // Get application
            let applicationId = null;
            if (categoryName && item['sub catigory']?.trim() && item.application?.trim()) {
              const subcategoryName = item['sub catigory'].trim();
              const applicationName = item.application.trim();
              const application = await prisma.application.findFirst({
                where: {
                  name: applicationName,
                  subcategory: {
                    name: subcategoryName,
                    category: { name: categoryName },
                  },
                },
              });
              if (application) {
                applicationId = application.id;
              }
            }
            
            // Parse numbers
            const cost = item.cost ? parseFloat(String(item.cost).replace(/,/g, '')) : null;
            const priceA = item['price a'] ? parseFloat(String(item['price a']).replace(/,/g, '')) : null;
            const priceB = item['price b'] ? parseFloat(String(item['price b']).replace(/,/g, '')) : null;
            
            // Create the part
            part = await prisma.part.create({
              data: {
                masterPartId: masterPartId,
                partNo: partNo,
                brandId: brandId,
                description: item.Discription?.trim() || null,
                categoryId: categoryId,
                subcategoryId: subcategoryId,
                applicationId: applicationId,
                cost: isNaN(cost!) ? null : cost,
                priceA: isNaN(priceA!) ? null : priceA,
                priceB: isNaN(priceB!) ? null : priceB,
                size: item.size?.trim() || null,
                status: 'active',
              },
            });
            
            if (!partsNotFoundSet.has(partNo)) {
              partsNotFoundSet.add(partNo);
              console.log(`  ✅ Created missing part: "${partNo}"`);
            }
          } catch (createError: any) {
            partsNotFound++;
            if (!partsNotFoundSet.has(partNo)) {
              partsNotFoundSet.add(partNo);
              if (partsNotFound <= 10) {
                console.log(`  ⚠️  Part not found and could not create: "${partNo}" - ${createError.message}`);
              }
            }
            continue;
          }
        }
        
        // Process each model for this part
        for (const modelData of models) {
          const modelName = modelData.model?.trim();
          const qty = parseInt(modelData.qty || '1', 10) || 1;
          
          if (!modelName) {
            continue; // Skip empty model names
          }
          
          try {
            // Check if model already exists for this part
            const existingModel = await prisma.model.findFirst({
              where: {
                partId: part.id,
                name: modelName,
              },
            });
            
            if (existingModel) {
              // Update existing model if quantity is different
              if (existingModel.qtyUsed !== qty) {
                await prisma.model.update({
                  where: { id: existingModel.id },
                  data: { qtyUsed: qty },
                });
                modelsUpdated++;
              } else {
                modelsSkipped++;
              }
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
                modelsUpdated++;
              }
            } else {
              errors++;
              if (errors <= 10) {
                errorLog.push(`Row ${i + 1}, Model "${modelName}": ${error.message}`);
              }
            }
          }
        }
        
        // Progress indicator
        if ((i + 1) % 500 === 0) {
          console.log(`  Processed ${i + 1}/${data.length} items... (${modelsCreated} created, ${modelsUpdated} updated, ${modelsSkipped} skipped)`);
        }
        
      } catch (error: any) {
        errors++;
        const errorMsg = `Row ${i + 1}: ${error.message}`;
        if (errors <= 10) {
          errorLog.push(errorMsg);
          console.error(`  ❌ ${errorMsg}`);
        }
      }
    }
    
    console.log('\n✨ Import completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Models Created: ${modelsCreated}`);
    console.log(`   Models Updated: ${modelsUpdated}`);
    console.log(`   Models Skipped (already exist with same qty): ${modelsSkipped}`);
    console.log(`   Parts Created (were missing): ${partsNotFoundSet.size}`);
    console.log(`   Parts Still Not Found: ${partsNotFound - partsNotFoundSet.size}`);
    console.log(`   Errors: ${errors}`);
    
    if (errorLog.length > 0 && errors <= 20) {
      console.log(`\n⚠️  Error details:`);
      errorLog.forEach(err => console.log(`   ${err}`));
    } else if (errors > 20) {
      console.log(`\n⚠️  ${errors} errors occurred. First 10 shown above.`);
    }
    
    if (partsNotFoundSet.size > 0 && partsNotFoundSet.size <= 20) {
      console.log(`\n⚠️  Parts not found (${partsNotFoundSet.size} unique):`);
      Array.from(partsNotFoundSet).slice(0, 20).forEach(partNo => {
        console.log(`   - ${partNo}`);
      });
      if (partsNotFoundSet.size > 20) {
        console.log(`   ... and ${partsNotFoundSet.size - 20} more`);
      }
      console.log('\n💡 Tip: Make sure all parts are imported first using import-all-data-from-json.ts');
    }
    
  } catch (error: any) {
    console.error('❌ Error importing models:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importModels()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

