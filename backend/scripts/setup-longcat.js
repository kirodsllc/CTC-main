// Setup script for LongCat API integration
const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function setupLongCat() {
  console.log('🚀 Setting up LongCat API integration...\n');

  try {
    // Step 1: Check if table exists, if not create it
    console.log('📊 Step 1: Checking database...');
    const dbPath = path.resolve(__dirname, '..', 'prisma', 'dev.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
    
    const prisma = new PrismaClient();
    
    try {
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='LongCatSettings'
      `;
      
      if (tables.length === 0) {
        console.log('   Creating LongCatSettings table...');
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "LongCatSettings" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "apiKey" TEXT,
            "model" TEXT DEFAULT 'LongCat-Flash-Chat',
            "baseUrl" TEXT DEFAULT 'https://api.longcat.chat',
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
          )
        `;
        console.log('   ✅ Table created!');
      } else {
        console.log('   ✅ Table already exists!');
      }
      
      // Initialize with default API key if no settings exist
      const existing = await prisma.longCatSettings.findFirst();
      if (!existing) {
        console.log('   Initializing with default API key...');
        await prisma.longCatSettings.create({
          data: {
            apiKey: 'ak_2No6Dx1vk4Di5so3aB53O3gd0B61t',
            model: 'LongCat-Flash-Chat',
            baseUrl: 'https://api.longcat.chat',
          },
        });
        console.log('   ✅ Default settings initialized!');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      await prisma.$disconnect();
      throw error;
    }

    // Step 2: Generate Prisma client
    console.log('\n📦 Step 2: Generating Prisma client...');
    try {
      execSync('npx prisma generate', { 
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
      });
      console.log('   ✅ Prisma client generated!');
    } catch (error) {
      console.log('   ⚠️  Prisma client generation failed (server may be running)');
      console.log('   ℹ️  This is OK - the client will regenerate when server restarts');
      console.log('   ℹ️  Or stop the server and run: cd backend && npx prisma generate');
    }

    console.log('\n✅ LongCat API integration setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Go to Settings → LongCat AI tab');
    console.log('   3. Your API key is already configured!');
    console.log('   4. Test the chat functionality\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

setupLongCat();

