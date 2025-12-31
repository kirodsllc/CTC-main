import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTables() {
  try {
    // Try to query each table
    const tables = ['User', 'Role', 'ActivityLog', 'ApprovalFlow', 'Backup', 'BackupSchedule', 'CompanyProfile', 'WhatsAppSettings'];
    
    for (const tableName of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        console.log(`✅ Table ${tableName}:`, result);
      } catch (error: any) {
        console.log(`❌ Table ${tableName}:`, error.message);
      }
    }

    // List all tables
    const allTables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    console.log('\n📋 All tables in database:');
    console.log(allTables);

    // Try to count users
    try {
      const userCount = await prisma.user.count();
      console.log(`\n✅ User table exists! Count: ${userCount}`);
    } catch (error: any) {
      console.log(`\n❌ User table error:`, error.message);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTables();

