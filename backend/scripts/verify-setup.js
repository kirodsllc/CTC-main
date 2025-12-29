const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying backend setup...\n');

let allGood = true;

// Check .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('DB_PASSWORD=postgres')) {
    console.log('⚠️  Using default password. Update .env with your actual PostgreSQL password.');
  }
} else {
  console.log('❌ .env file not found');
  console.log('   Creating .env from template...');
  const envExample = `DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_erp
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173`;
  fs.writeFileSync(envPath, envExample);
  console.log('✅ .env file created');
}

// Check node_modules
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules exists');
} else {
  console.log('❌ node_modules not found. Run: npm install');
  allGood = false;
}

// Check dist folder
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ dist folder exists (TypeScript compiled)');
} else {
  console.log('⚠️  dist folder not found. Run: npm run build');
}

// Check source files
const requiredFiles = [
  'src/server.ts',
  'src/config/database.ts',
  'src/routes/parts.ts',
  'src/routes/dropdowns.ts',
  'src/db/migrate.ts',
  'src/db/migrations/001_create_parts_schema.sql',
];

console.log('\n📁 Checking source files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allGood = false;
  }
});

console.log('\n📋 Summary:');
if (allGood) {
  console.log('✅ All files are in place!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Install PostgreSQL if not installed');
  console.log('   2. Create database: CREATE DATABASE inventory_erp;');
  console.log('   3. Run migration: npm run migrate');
  console.log('   4. Start server: npm run dev');
} else {
  console.log('⚠️  Some files are missing. Please check above.');
}

process.exit(allGood ? 0 : 1);

