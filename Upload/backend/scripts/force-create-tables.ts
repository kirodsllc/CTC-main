import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceCreateTables() {
  try {
    console.log('Creating system administration tables...\n');

    const statements = [
      `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT,
        "role" TEXT NOT NULL DEFAULT 'Staff',
        "status" TEXT NOT NULL DEFAULT 'active',
        "lastLogin" TEXT DEFAULT '-',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Role" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "type" TEXT NOT NULL DEFAULT 'Custom',
        "description" TEXT,
        "permissions" TEXT NOT NULL,
        "usersCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "ActivityLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "timestamp" TEXT NOT NULL,
        "user" TEXT NOT NULL,
        "userRole" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "actionType" TEXT NOT NULL,
        "module" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "ipAddress" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'success',
        "details" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "ApprovalFlow" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "description" TEXT,
        "steps" TEXT NOT NULL,
        "module" TEXT NOT NULL,
        "trigger" TEXT NOT NULL DEFAULT 'On Create',
        "condition" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "Backup" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "tables" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'full',
        "size" TEXT,
        "status" TEXT NOT NULL DEFAULT 'in_progress',
        "createdAt" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS "BackupSchedule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "frequency" TEXT NOT NULL,
        "tables" TEXT NOT NULL,
        "time" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "lastRun" TEXT,
        "nextRun" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "CompanyProfile" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "companyInfo" TEXT NOT NULL,
        "systemSettings" TEXT NOT NULL,
        "invoiceSettings" TEXT NOT NULL,
        "notificationSettings" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS "WhatsAppSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "appKey" TEXT,
        "authKey" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
        console.log(`✅ Created table: ${tableName}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          const tableName = statement.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1];
          console.log(`⚠️  Table ${tableName} already exists (this is okay)`);
        } else {
          console.error(`❌ Error creating table:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ All tables created! Verifying...\n');

    // Verify tables exist
    const tables = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('User', 'Role', 'ActivityLog', 'ApprovalFlow', 'Backup', 'BackupSchedule', 'CompanyProfile', 'WhatsAppSettings')
      ORDER BY name
    `) as Array<{ name: string }>;

    console.log('📋 Created tables:');
    tables.forEach(t => console.log(`   ✅ ${t.name}`));

    // Test User table
    try {
      const count = await prisma.user.count();
      console.log(`\n✅ User table is accessible! Count: ${count}`);
    } catch (error: any) {
      console.error(`\n❌ User table error:`, error.message);
      throw error;
    }

    console.log('\n🎉 All system administration tables are ready!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

forceCreateTables();

