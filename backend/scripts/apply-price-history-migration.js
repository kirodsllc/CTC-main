const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Applying PriceHistory migration...');
    
    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS "PriceHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "partId" TEXT,
        "partNo" TEXT NOT NULL,
        "description" TEXT,
        "priceField" TEXT NOT NULL,
        "updateType" TEXT NOT NULL,
        "oldValue" REAL,
        "newValue" REAL,
        "updateValue" REAL,
        "itemsUpdated" INTEGER NOT NULL DEFAULT 1,
        "reason" TEXT NOT NULL,
        "updatedBy" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PriceHistory_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "PriceHistory_partId_idx" ON "PriceHistory"("partId");
      CREATE INDEX IF NOT EXISTS "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");
    `;

    // Execute raw SQL
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log('✅ PriceHistory table created successfully!');
    
    // Verify the table exists
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name='PriceHistory';
    `;
    
    if (tables.length > 0) {
      console.log('✅ Verification: PriceHistory table exists');
    } else {
      console.log('⚠️  Warning: Could not verify PriceHistory table');
    }
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  PriceHistory table already exists');
    } else {
      console.error('❌ Error applying migration:', error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

