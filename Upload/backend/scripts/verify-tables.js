// Verify Customer and Supplier tables are accessible
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('🔍 Verifying tables...');
    
    const customers = await prisma.customer.findMany();
    const suppliers = await prisma.supplier.findMany();
    
    console.log('✅ Prisma can access tables!');
    console.log(`   Customers: ${customers.length} records`);
    console.log(`   Suppliers: ${suppliers.length} records`);
    console.log('\n✅ All tables are ready. Server should work now!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

