#!/bin/bash

# Delete All Parts - Using Correct Database
# Run: sudo bash delete-all-parts-correct.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

APP_DIR="/var/www/nextapp"

echo "=========================================="
echo "  Delete All Parts (Correct Database)"
echo "=========================================="
echo ""
print_warning "This will DELETE ALL PARTS from the database!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

cd "$APP_DIR/backend" || exit 1

# Set the correct database path
DB_PATH="$APP_DIR/backend/prisma/dev.db"
export DATABASE_URL="file:$DB_PATH"

print_status "Using database: $DB_PATH"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database file not found at $DB_PATH"
    exit 1
fi

# Create deletion script with explicit DATABASE_URL
cat > "$APP_DIR/backend/delete-all-correct.js" << 'NODEEOF'
const path = require('path');

// Set DATABASE_URL before importing Prisma
const dbPath = path.resolve(__dirname, 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllParts() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  DELETING ALL PARTS FROM DATABASE");
  console.log("=".repeat(60));
  console.log(`📁 Database: ${process.env.DATABASE_URL}\n`);
  
  try {
    // First, get count
    const count = await prisma.part.count();
    console.log(`📊 Found ${count} parts in database\n`);
    
    if (count === 0) {
      console.log("   ✅ Database is already empty!\n");
      return;
    }
    
    console.log("🗑️  Deleting all parts...\n");
    
    // Delete price history first (no cascade)
    const phCount = await prisma.priceHistory.count();
    if (phCount > 0) {
      const phResult = await prisma.priceHistory.deleteMany({});
      console.log(`   ✓ Deleted ${phResult.count} price history records`);
    }
    
    // Delete all parts
    const result = await prisma.part.deleteMany({});
    console.log(`   ✓ Deleted ${result.count} parts\n`);
    
    // Verify deletion
    const remaining = await prisma.part.count();
    if (remaining === 0) {
      console.log("   ✅ VERIFICATION: Database is completely empty!\n");
    } else {
      console.log(`   ⚠️  WARNING: ${remaining} parts still remain\n`);
    }
    
    console.log("=".repeat(60));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(60) + "\n");
    
  } catch (error) {
    console.error(`\n❌ Error deleting parts: ${error.message || error.toString()}`);
    console.error(`   Stack: ${error.stack}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run deletion
deleteAllParts()
  .then(() => {
    console.log("✅ All done! Database is now empty.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ FATAL ERROR:", error.message || error.toString());
    process.exit(1);
  });
NODEEOF

# Run the script
print_status "Starting deletion process..."
cd "$APP_DIR/backend" && node delete-all-correct.js

# Cleanup
rm -f "$APP_DIR/backend/delete-all-correct.js"

echo ""
echo "=========================================="
echo -e "${GREEN}  Process Complete!${NC}"
echo "=========================================="
echo ""
echo "Verifying deletion..."
sleep 2
curl -s "http://localhost:3001/api/parts?limit=1" | grep -o '"total":[0-9]*' || echo "Check API response manually"

