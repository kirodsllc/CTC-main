#!/bin/bash

# Force Delete All Parts - More Aggressive
# Run: sudo bash force-delete-all-parts.sh

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
echo "  Force Delete All Parts"
echo "=========================================="
echo ""
print_warning "This will DELETE ALL PARTS and related data!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

cd "$APP_DIR/backend" || exit 1

# Create a more aggressive deletion script
cat > "$APP_DIR/backend/force-delete.js" << 'NODEEOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forceDeleteAll() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  FORCE DELETING ALL PARTS AND RELATED DATA");
  console.log("=".repeat(60) + "\n");
  
  try {
    // Get counts first
    const partCount = await prisma.part.count();
    const priceHistoryCount = await prisma.priceHistory.count();
    const stockMovementCount = await prisma.stockMovement.count();
    
    console.log(`📊 Current counts:`);
    console.log(`   Parts: ${partCount}`);
    console.log(`   Price History: ${priceHistoryCount}`);
    console.log(`   Stock Movements: ${stockMovementCount}\n`);
    
    if (partCount === 0 && priceHistoryCount === 0) {
      console.log("   ✅ Database is already empty!\n");
      return;
    }
    
    console.log("🗑️  Deleting all data...\n");
    
    // Delete in order to respect foreign keys
    // 1. Delete price history first
    if (priceHistoryCount > 0) {
      const phResult = await prisma.priceHistory.deleteMany({});
      console.log(`   ✓ Deleted ${phResult.count} price history records`);
    }
    
    // 2. Delete stock movements
    if (stockMovementCount > 0) {
      const smResult = await prisma.stockMovement.deleteMany({});
      console.log(`   ✓ Deleted ${smResult.count} stock movements`);
    }
    
    // 3. Delete parts (cascade will handle kit items, etc.)
    if (partCount > 0) {
      const partResult = await prisma.part.deleteMany({});
      console.log(`   ✓ Deleted ${partResult.count} parts\n`);
    }
    
    // Verify deletion
    const remainingParts = await prisma.part.count();
    const remainingPH = await prisma.priceHistory.count();
    
    console.log("🔍 Verification:");
    console.log(`   Remaining parts: ${remainingParts}`);
    console.log(`   Remaining price history: ${remainingPH}\n`);
    
    if (remainingParts === 0 && remainingPH === 0) {
      console.log("   ✅ VERIFICATION: Database is completely empty!\n");
    } else {
      console.log(`   ⚠️  WARNING: Some data still remains\n`);
    }
    
    console.log("=".repeat(60));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(60) + "\n");
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message || error.toString()}`);
    console.error(`   Stack: ${error.stack}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run deletion
forceDeleteAll()
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
print_status "Starting force deletion..."
cd "$APP_DIR/backend" && node force-delete.js

# Cleanup
rm -f "$APP_DIR/backend/force-delete.js"

echo ""
echo "=========================================="
echo -e "${GREEN}  Process Complete!${NC}"
echo "=========================================="
echo ""
echo "If the dashboard still shows parts, try:"
echo "  1. Hard refresh browser (Ctrl+Shift+R)"
echo "  2. Clear browser cache"
echo "  3. Check if backend needs restart: pm2 restart backend"

