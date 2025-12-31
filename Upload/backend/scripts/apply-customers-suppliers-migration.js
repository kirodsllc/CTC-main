// Set DATABASE_URL before importing Prisma
const path = require('path');
const fs = require('fs');
const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Applying Customers and Suppliers migration...');
    
    const migrationSQL = fs.readFileSync(
      path.resolve(__dirname, '..', 'prisma', 'migrations', '20250103000000_add_customers_suppliers', 'migration.sql'),
      'utf8'
    );

    // Split SQL statements and execute them
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
            console.log(`ℹ️  ${statement.substring(0, 50)}... already exists`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Customers and Suppliers tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

