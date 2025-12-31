const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const migrationPath = path.join(__dirname, '../prisma/migrations/20250102000000_add_expense_models/migration.sql');

console.log('📦 Applying expense tables migration...');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Read migration SQL
const sql = fs.readFileSync(migrationPath, 'utf8');

// Execute migration
db.exec(sql, (err) => {
  if (err) {
    if (err.message.includes('already exists')) {
      console.log('⚠️  Tables may already exist, checking...');
      // Check if tables exist
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ExpenseType', 'PostedExpense', 'OperationalExpense')", (checkErr, rows) => {
        if (checkErr) {
          console.error('❌ Error checking tables:', checkErr.message);
          db.close();
          process.exit(1);
        }
        
        const existingTables = rows.map(r => r.name);
        console.log('📊 Existing tables:', existingTables);
        
        if (existingTables.length === 3) {
          console.log('✅ All expense tables already exist!');
          db.close();
          process.exit(0);
        } else {
          console.error('❌ Some tables are missing:', ['ExpenseType', 'PostedExpense', 'OperationalExpense'].filter(t => !existingTables.includes(t)));
          db.close();
          process.exit(1);
        }
      });
    } else {
      console.error('❌ Error executing migration:', err.message);
      db.close();
      process.exit(1);
    }
  } else {
    console.log('✅ Migration executed successfully!');
    
    // Verify tables were created
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ExpenseType', 'PostedExpense', 'OperationalExpense')", (checkErr, rows) => {
      if (checkErr) {
        console.error('❌ Error verifying tables:', checkErr.message);
        db.close();
        process.exit(1);
      }
      
      const createdTables = rows.map(r => r.name);
      console.log('📊 Created tables:', createdTables);
      
      if (createdTables.length === 3) {
        console.log('✅ All expense tables created successfully!');
      } else {
        console.error('❌ Missing tables:', ['ExpenseType', 'PostedExpense', 'OperationalExpense'].filter(t => !createdTables.includes(t)));
      }
      
      db.close();
      process.exit(createdTables.length === 3 ? 0 : 1);
    });
  }
});

