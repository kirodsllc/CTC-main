import prisma from '../src/config/database';

async function removeInvalidApplications() {
  try {
    console.log('🔍 Finding invalid applications (single characters, dots, etc.)...\n');
    
    // Find all applications
    const allApplications = await prisma.application.findMany({
      include: {
        parts: true,
        subcategory: {
          include: {
            category: true,
          },
        },
      },
    });
    
    // Filter invalid applications (only dots, dashes, or empty)
    const invalidApps = allApplications.filter(app => {
      const name = app.name.trim();
      // Invalid if: just a dot, dash, or empty (but allow single characters like "C")
      return name === '.' || name === '-' || name === '';
    });
    
    console.log(`📊 Found ${invalidApps.length} invalid applications:\n`);
    
    if (invalidApps.length === 0) {
      console.log('✅ No invalid applications found!');
      return;
    }
    
    // Show invalid applications
    invalidApps.forEach(app => {
      console.log(`  - "${app.name}" (ID: ${app.id})`);
      console.log(`    Category: ${app.subcategory?.category?.name || 'N/A'}`);
      console.log(`    Subcategory: ${app.subcategory?.name || 'N/A'}`);
      console.log(`    Used by ${app.parts.length} parts`);
      console.log('');
    });
    
    // Count parts that will be affected
    const totalPartsAffected = invalidApps.reduce((sum, app) => sum + app.parts.length, 0);
    
    console.log(`\n⚠️  This will affect ${totalPartsAffected} parts.\n`);
    console.log('🗑️  Removing invalid applications and unlinking from parts...\n');
    
    let partsUpdated = 0;
    let appsDeleted = 0;
    
    // Process each invalid application
    for (const app of invalidApps) {
      try {
        // First, unlink all parts from this application
        if (app.parts.length > 0) {
          await prisma.part.updateMany({
            where: { applicationId: app.id },
            data: { applicationId: null },
          });
          partsUpdated += app.parts.length;
          console.log(`  ✅ Unlinked ${app.parts.length} parts from "${app.name}"`);
        }
        
        // Then delete the application
        await prisma.application.delete({
          where: { id: app.id },
        });
        appsDeleted++;
        console.log(`  ✅ Deleted application "${app.name}"`);
        
      } catch (error: any) {
        console.error(`  ❌ Error processing "${app.name}": ${error.message}`);
      }
    }
    
    console.log('\n✨ Cleanup completed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Invalid Applications Deleted: ${appsDeleted}`);
    console.log(`   Parts Unlinked: ${partsUpdated}`);
    console.log(`   Errors: 0`);
    
  } catch (error: any) {
    console.error('❌ Error removing invalid applications:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
removeInvalidApplications()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

