/**
 * DELETE ALL ITEMS (PARTS) FROM DATABASE
 * Direct database deletion using Prisma
 */

const path = require('path');
const fs = require('fs');

// Set up environment
const backendRoot = path.resolve(__dirname, 'backend');
const dbPath = path.resolve(backendRoot, 'prisma/dev.db');

// Set DATABASE_URL
process.env.DATABASE_URL = `file:${dbPath}`;

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database file not found: ${dbPath}`);
  process.exit(1);
}

console.log(`📁 Database: ${dbPath}`);
console.log(`📊 Database size: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB\n`);

// Import Prisma Client from backend
let PrismaClient;
try {
  // Try to load from backend node_modules first
  const backendNodeModules = path.resolve(backendRoot, 'node_modules/@prisma/client');
  if (fs.existsSync(backendNodeModules)) {
    PrismaClient = require(backendNodeModules).PrismaClient;
  } else {
    // Fallback to root node_modules
    PrismaClient = require('@prisma/client').PrismaClient;
  }
} catch (error) {
  console.error('❌ Error loading Prisma Client. Make sure to run: cd backend && npx prisma generate');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Delete all parts from database
 */
async function deleteAllItems() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  DELETING ALL ITEMS FROM DATABASE');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Count items before deletion
    const countBefore = await prisma.part.count();
    console.log(`📊 Found ${countBefore} items in database\n`);
    
    if (countBefore === 0) {
      console.log('   ✅ Database is already empty!\n');
      return;
    }
    
    // Delete in order (respecting foreign key constraints)
    console.log('🗑️  Deleting items...\n');
    
    // 1. Delete Models first (they reference Parts)
    const modelCount = await prisma.model.count();
    if (modelCount > 0) {
      console.log(`   Deleting ${modelCount} models...`);
      await prisma.model.deleteMany({});
      console.log(`   ✅ Deleted ${modelCount} models\n`);
    }
    
    // 2. Delete Parts
    console.log(`   Deleting ${countBefore} parts...`);
    const deleteResult = await prisma.part.deleteMany({});
    console.log(`   ✅ Deleted ${deleteResult.count} parts\n`);
    
    // Verify deletion
    const countAfter = await prisma.part.count();
    const modelCountAfter = await prisma.model.count();
    
    if (countAfter === 0 && modelCountAfter === 0) {
      console.log('   ✅ VERIFICATION: Database is completely empty!\n');
    } else {
      console.log(`   ⚠️  WARNING: ${countAfter} parts and ${modelCountAfter} models still remain in database\n`);
    }
    
    console.log('✅ All items deleted successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error deleting items:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('foreign key constraint')) {
      console.log('💡 Tip: Try deleting related records first (models, kits, etc.)\n');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await deleteAllItems();
    
    // Show final database size
    if (fs.existsSync(dbPath)) {
      const finalSize = fs.statSync(dbPath).size;
      console.log(`📊 Final database size: ${(finalSize / 1024).toFixed(2)} KB\n`);
    }
    
    console.log('='.repeat(60));
    console.log('✅ COMPLETE');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Failed to delete items');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

main();

