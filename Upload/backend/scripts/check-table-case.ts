import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Check what tables Prisma sees
    const tables = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log('📋 All tables in database:');
    console.log(JSON.stringify(tables, null, 2));
    
    // Check specifically for User table
    const userTable = await prisma.$queryRawUnsafe(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='User'
    `);
    
    console.log('\n🔍 User table check:');
    console.log(JSON.stringify(userTable, null, 2));
    
    // Try to query User table directly
    try {
      const users = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "User"`);
      console.log('\n✅ Direct SQL query works:');
      console.log(users);
    } catch (error: any) {
      console.log('\n❌ Direct SQL query failed:');
      console.log(error.message);
    }
    
    // Try Prisma query
    try {
      const count = await prisma.user.count();
      console.log(`\n✅ Prisma query works! Count: ${count}`);
    } catch (error: any) {
      console.log('\n❌ Prisma query failed:');
      console.log(error.message);
      console.log('\nFull error:');
      console.log(error);
    }
    
  } catch (error: any) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

