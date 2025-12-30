const path = require('path');
const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumn() {
  try {
    console.log('🔄 Adding administratorPhoneNumber column to WhatsAppSettings...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE WhatsAppSettings 
      ADD COLUMN administratorPhoneNumber TEXT
    `);
    
    console.log('✅ Column added successfully!');
  } catch (error) {
    if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
      console.log('ℹ️  Column already exists');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

