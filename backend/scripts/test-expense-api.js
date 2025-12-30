// Simple test to verify expense tables exist
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../prisma/dev.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Check if tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ExpenseType', 'PostedExpense', 'OperationalExpense')", (err, rows) => {
  if (err) {
    console.error('❌ Error checking tables:', err.message);
    db.close();
    process.exit(1);
  }
  
  const tableNames = rows.map(r => r.name);
  console.log('\n📊 Found tables:', tableNames);
  
  if (tableNames.includes('ExpenseType') && tableNames.includes('PostedExpense') && tableNames.includes('OperationalExpense')) {
    console.log('✅ All expense tables exist!');
    
    // Count records
    db.get("SELECT COUNT(*) as count FROM ExpenseType", (err, row) => {
      if (!err) console.log(`   ExpenseType: ${row.count} records`);
    });
    
    db.get("SELECT COUNT(*) as count FROM PostedExpense", (err, row) => {
      if (!err) console.log(`   PostedExpense: ${row.count} records`);
    });
    
    db.get("SELECT COUNT(*) as count FROM OperationalExpense", (err, row) => {
      if (!err) {
        console.log(`   OperationalExpense: ${row.count} records`);
        db.close();
        console.log('\n✅ Database is ready for expense management!');
        process.exit(0);
      }
    });
  } else {
    console.log('❌ Missing tables:', ['ExpenseType', 'PostedExpense', 'OperationalExpense'].filter(t => !tableNames.includes(t)));
    db.close();
    process.exit(1);
  }
});

