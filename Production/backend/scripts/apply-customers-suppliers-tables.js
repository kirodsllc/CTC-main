// Apply Customers and Suppliers tables migration
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Applying Customers and Suppliers tables...');
    
    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS "Customer" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "address" TEXT,
        "email" TEXT,
        "cnic" TEXT,
        "contactNo" TEXT,
        "openingBalance" REAL NOT NULL DEFAULT 0,
        "creditLimit" REAL NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'active',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "name" TEXT,
        "companyName" TEXT NOT NULL,
        "address" TEXT,
        "city" TEXT,
        "state" TEXT,
        "country" TEXT,
        "zipCode" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "cnic" TEXT,
        "contactPerson" TEXT,
        "taxId" TEXT,
        "paymentTerms" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_code_key" ON "Supplier"("code");
    `;

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`   ℹ️  Table/index already exists`);
          } else {
            throw error;
          }
        }
      }
    }

    // Verify tables were created
    const tables = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('Customer', 'Supplier')
    `);

    console.log('✅ Migration applied successfully!');
    console.log(`   Tables found: ${tables.map(t => t.name).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Done! Tables are ready.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

