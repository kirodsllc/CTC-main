import prisma from '../src/config/database';

async function verifyEmpty() {
  try {
    console.log('🔍 Verifying database is empty...\n');

    const checks = [
      { name: 'MainGroups', count: await prisma.mainGroup.count() },
      { name: 'Subgroups', count: await prisma.subgroup.count() },
      { name: 'Accounts', count: await prisma.account.count() },
      { name: 'JournalEntries', count: await prisma.journalEntry.count() },
      { name: 'JournalLines', count: await prisma.journalLine.count() },
      { name: 'ExpenseTypes', count: await prisma.expenseType.count() },
      { name: 'PostedExpenses', count: await prisma.postedExpense.count() },
      { name: 'OperationalExpenses', count: await prisma.operationalExpense.count() },
      { name: 'Parts', count: await prisma.part.count() },
      { name: 'Kits', count: await prisma.kit.count() },
      { name: 'Customers', count: await prisma.customer.count() },
      { name: 'Suppliers', count: await prisma.supplier.count() },
    ];

    let allEmpty = true;
    for (const check of checks) {
      if (check.count > 0) {
        console.log(`❌ ${check.name}: ${check.count} records found`);
        allEmpty = false;
      } else {
        console.log(`✅ ${check.name}: 0 records (empty)`);
      }
    }

    if (allEmpty) {
      console.log('\n✅ Database is completely empty!');
    } else {
      console.log('\n⚠️  Some data still exists. Run clear-data script again.');
    }
  } catch (error: any) {
    console.error('❌ Error verifying:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEmpty();

