import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory specifically (override any existing env vars)
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, override: true });

// Force SQLite DATABASE_URL for this project (override any system/env vars)
// This ensures we always use SQLite regardless of what's in system environment
// Always resolve to absolute path to avoid path issues when running from dist/
const backendRoot = path.resolve(__dirname, '../..');
const dbPath = path.resolve(backendRoot, 'prisma/dev.db');

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  const sqliteUrl = `file:${dbPath}`;
  process.env.DATABASE_URL = sqliteUrl;
  console.log(`✅ Overriding DATABASE_URL to SQLite: ${sqliteUrl}`);
} else {
  // If DATABASE_URL is set but relative, resolve it to absolute path
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl.includes('./') || dbUrl.includes('prisma/dev.db')) {
    process.env.DATABASE_URL = `file:${dbPath}`;
    console.log(`✅ Resolved DATABASE_URL to absolute path: ${process.env.DATABASE_URL}`);
  }
}

// Validate DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl.startsWith('file:')) {
  throw new Error(`DATABASE_URL must start with 'file:' protocol. Current value: ${databaseUrl}`);
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
