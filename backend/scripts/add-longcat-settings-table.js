// Set DATABASE_URL before importing Prisma
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function addLongCatSettingsTable() {
  try {
    console.log('🔄 Adding LongCatSettings table...');
    
    // Check if table already exists
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='LongCatSettings'
    `;
    
    if (tables.length > 0) {
      console.log('ℹ️  LongCatSettings table already exists');
      return;
    }

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "LongCatSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "apiKey" TEXT,
        "model" TEXT DEFAULT 'LongCat-Flash-Chat',
        "baseUrl" TEXT DEFAULT 'https://api.longcat.chat',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `;

    console.log('✅ LongCatSettings table created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addLongCatSettingsTable()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

