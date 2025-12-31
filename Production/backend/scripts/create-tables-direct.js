const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

try {
  console.log('Creating Kit table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Kit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "badge" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "sellingPrice" REAL NOT NULL DEFAULT 0,
      "totalCost" REAL NOT NULL DEFAULT 0,
      "itemsCount" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'Active',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);
  console.log('✅ Kit table created');

  console.log('Creating KitItem table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS "KitItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "kitId" TEXT NOT NULL,
      "partId" TEXT NOT NULL,
      "partNo" TEXT NOT NULL,
      "partName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "costPerUnit" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "KitItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "KitItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  console.log('✅ KitItem table created');

  db.exec(`CREATE INDEX IF NOT EXISTS "KitItem_kitId_idx" ON "KitItem"("kitId");`);
  db.exec(`CREATE INDEX IF NOT EXISTS "KitItem_partId_idx" ON "KitItem"("partId");`);
  console.log('✅ Indexes created');

  console.log('✅ All tables created successfully');
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}

