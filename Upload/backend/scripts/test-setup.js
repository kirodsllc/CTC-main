const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'inventory_erp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Check if database exists
    const dbCheck = await client.query('SELECT current_database()');
    console.log(`✅ Connected to database: ${dbCheck.rows[0].current_database}`);
    
    // Check if tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesCheck.rows.length > 0) {
      console.log(`\n✅ Found ${tablesCheck.rows.length} table(s):`);
      tablesCheck.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('\n⚠️  No tables found. Run migration: npm run migrate');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solutions:');
      console.log('   1. Make sure PostgreSQL is installed and running');
      console.log('   2. Check if PostgreSQL service is started');
      console.log('   3. Verify database credentials in .env file');
      console.log('   4. Try: psql -U postgres -c "SELECT 1;"');
    } else if (error.code === '3D000') {
      console.log('💡 Database does not exist. Create it with:');
      console.log('   psql -U postgres -c "CREATE DATABASE inventory_erp;"');
    } else if (error.code === '28P01') {
      console.log('💡 Authentication failed. Check DB_USER and DB_PASSWORD in .env');
    }
    
    await pool.end();
    return false;
  }
}

// Run test
testDatabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

