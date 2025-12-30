const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTables() {
  try {
    // Try to query the tables
    const expenseTypes = await prisma.expenseType.findMany();
    const postedExpenses = await prisma.postedExpense.findMany();
    const operationalExpenses = await prisma.operationalExpense.findMany();
    
    console.log('✅ ExpenseType table exists:', expenseTypes.length, 'records');
    console.log('✅ PostedExpense table exists:', postedExpenses.length, 'records');
    console.log('✅ OperationalExpense table exists:', operationalExpenses.length, 'records');
    console.log('\n✅ All expense tables are accessible!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('The tables may not have been created. Please check the migration.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyTables();

