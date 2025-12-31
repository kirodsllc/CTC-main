#!/bin/bash

# Check Database Contents
# Run: sudo bash check-database.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

APP_DIR="/var/www/nextapp"

echo "=========================================="
echo "  Checking Database Contents"
echo "=========================================="

cd "$APP_DIR/backend" || exit 1

# Check database file
DB_FILE="$APP_DIR/backend/prisma/dev.db"
if [ -f "$DB_FILE" ]; then
    print_status "Database file found: $DB_FILE"
    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    print_info "Database size: $DB_SIZE"
else
    echo "Database file not found at: $DB_FILE"
    exit 1
fi

# Create a script to check database
cat > "$APP_DIR/backend/check-db.js" << 'NODEEOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 DATABASE CONTENTS CHECK");
  console.log("=".repeat(60) + "\n");
  
  try {
    const partCount = await prisma.part.count();
    console.log(`📦 Parts: ${partCount}`);
    
    if (partCount > 0) {
      const sampleParts = await prisma.part.findMany({
        take: 5,
        select: {
          id: true,
          partNo: true,
          description: true,
        }
      });
      console.log("\n   Sample parts:");
      sampleParts.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.partNo} - ${p.description || 'No description'}`);
      });
    }
    
    const priceHistoryCount = await prisma.priceHistory.count();
    console.log(`\n💰 Price History: ${priceHistoryCount}`);
    
    const stockMovementCount = await prisma.stockMovement.count();
    console.log(`📦 Stock Movements: ${stockMovementCount}`);
    
    console.log("\n" + "=".repeat(60));
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message || error.toString()}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ FATAL ERROR:", error.message || error.toString());
    process.exit(1);
  });
NODEEOF

# Run the check
echo ""
echo "Checking database contents..."
cd "$APP_DIR/backend" && node check-db.js

# Cleanup
rm -f "$APP_DIR/backend/check-db.js"

echo ""
echo "=========================================="
echo "  Check Complete"
echo "=========================================="

