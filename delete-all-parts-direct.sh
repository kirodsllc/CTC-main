#!/bin/bash

# Delete All Parts Directly from Database (FASTER)
# Run: sudo bash delete-all-parts-direct.sh

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

APP_DIR="/var/www/nextapp"

echo "=========================================="
echo "  Delete All Parts (Direct Database)"
echo "=========================================="
echo ""
print_warning "This will DELETE ALL PARTS from the database!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

cd "$APP_DIR/backend" || exit 1

# Create a Node.js script in the backend directory
cat > "$APP_DIR/backend/delete-all-parts-direct.js" << 'NODEEOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllParts() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  DELETING ALL PARTS FROM DATABASE (DIRECT)");
  console.log("=".repeat(60) + "\n");
  
  try {
    // First, get count
    const count = await prisma.part.count();
    console.log(`📊 Found ${count} parts in database\n`);
    
    if (count === 0) {
      console.log("   ✅ Database is already empty!\n");
      return;
    }
    
    console.log("🗑️  Deleting all parts...");
    
    // Delete all parts (cascade will handle related records)
    // First delete price history (no cascade)
    await prisma.priceHistory.deleteMany({});
    console.log("   ✓ Deleted price history");
    
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

# Run the script from backend directory
print_status "Starting direct database deletion..."
cd "$APP_DIR/backend" && node delete-all-parts-direct.js

# Cleanup
rm -f "$APP_DIR/backend/delete-all-parts-direct.js"

echo ""
echo "=========================================="
echo -e "${GREEN}  Process Complete!${NC}"
echo "=========================================="
echo ""
echo "Refresh your browser to see the changes."

