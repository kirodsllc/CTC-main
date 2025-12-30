const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Set DATABASE_URL if not set (must start with file:)
const dbPath = path.resolve(__dirname, '../prisma/dev.db');
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log('✅ Set DATABASE_URL to:', process.env.DATABASE_URL);
}

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    // First check if tables exist
    try {
      await prisma.$queryRaw`SELECT 1 FROM ExpenseType LIMIT 1`;
      console.log('✅ ExpenseType table already exists');
    } catch (e) {
      console.log('📦 Creating ExpenseType table...');
      const migrationPath = path.join(__dirname, '../prisma/migrations/20250102000000_add_expense_models/migration.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolons and execute each statement
      // Remove comments first, then split
      const cleanedSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length > 10); // Filter out very short fragments
      
      console.log(`📝 Found ${statements.length} SQL statements to execute`);
      if (statements.length === 0) {
        console.log('⚠️  No statements found. SQL content preview:');
        console.log(sql.substring(0, 500));
      }
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          try {
            console.log(`\n[${i + 1}/${statements.length}] Executing:`, statement.substring(0, 80).replace(/\n/g, ' '));
            await prisma.$executeRawUnsafe(statement);
            console.log(`✅ Statement ${i + 1} executed successfully`);
          } catch (err) {
            if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
              console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
            } else {
              console.error(`❌ Error in statement ${i + 1}:`, err.message);
              console.error('Statement:', statement.substring(0, 200));
              throw err;
            }
          }
        }
      }
      
      console.log('\n✅ All SQL statements processed');
    }
    
    // Verify tables exist by trying to query them
    try {
      const expenseTypes = await prisma.expenseType.findMany({ take: 1 });
      const postedExpenses = await prisma.postedExpense.findMany({ take: 1 });
      const operationalExpenses = await prisma.operationalExpense.findMany({ take: 1 });
      console.log('✅ All expense tables exist and are accessible!');
      console.log('   - ExpenseType: OK');
      console.log('   - PostedExpense: OK');
      console.log('   - OperationalExpense: OK');
    } catch (verifyError) {
      console.error('❌ Tables verification failed:', verifyError.message);
      throw verifyError;
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration().catch(console.error);

