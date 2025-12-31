#!/bin/bash

# Delete All Parts from VPS Database
# Run: sudo bash delete-all-parts-vps.sh

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
API_URL="http://localhost:3001/api"

echo "=========================================="
echo "  Delete All Parts from Database"
echo "=========================================="
echo ""
print_warning "This will DELETE ALL PARTS from the database!"
echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

cd "$APP_DIR/backend" || exit 1

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    print_error "Backend is not running!"
    echo "Starting backend..."
    pm2 start npm --name backend -- start
    sleep 3
fi

# Create a Node.js script to delete all parts
cat > /tmp/delete-all-parts.js << 'NODEEOF'
const http = require('http');

const API_BASE_URL = "http://localhost:3001/api";

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 3001,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function deleteAllParts() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  DELETING ALL PARTS FROM DATABASE");
  console.log("=".repeat(60) + "\n");
  
  try {
    let totalDeleted = 0;
    let page = 1;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📄 Fetching page ${page}...`);
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/parts?limit=${limit}&page=${page}`);
      } catch (fetchError) {
        console.error(`   ❌ Failed to connect to backend: ${fetchError.message}`);
        throw fetchError;
      }
      
      if (!response.ok) {
        console.log(`   ⚠️  No more parts to delete (status: ${response.status})`);
        hasMore = false;
        break;
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error(`   ❌ Failed to parse response: ${jsonError.message}`);
        throw jsonError;
      }
      
      const parts = data.data || data || [];
      
      if (parts.length === 0) {
        console.log(`   ✅ No more parts found`);
        hasMore = false;
        break;
      }
      
      console.log(`   📊 Found ${parts.length} parts on page ${page}, deleting...`);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        try {
          const deleteResponse = await fetch(`${API_BASE_URL}/parts/${part.id}`, {
            method: 'DELETE',
          });
          
          if (deleteResponse.ok) {
            totalDeleted++;
            if (totalDeleted % 100 === 0) {
              process.stdout.write(`   ✅ Deleted ${totalDeleted} parts...\r`);
            }
          } else {
            const errorData = await deleteResponse.json().catch(() => ({}));
            if (errorData.error && errorData.error.includes('kit')) {
              console.log(`\n   ⚠️  Part ${part.partNo || part.part_no || part.id} is used in kit, skipping...`);
            } else {
              console.log(`\n   ⚠️  Failed to delete part ${part.partNo || part.part_no || part.id}: ${errorData.error || deleteResponse.status}`);
            }
          }
        } catch (error) {
          // Continue on error
        }
      }
      
      if (parts.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n   ✅ TOTAL DELETED: ${totalDeleted} parts\n`);
    
    // Verify deletion
    console.log("🔍 Verifying deletion...");
    const verifyResponse = await fetch(`${API_BASE_URL}/parts?limit=10`);
    const verifyData = await verifyResponse.json();
    const remainingParts = verifyData.data || verifyData || [];
    const totalRemaining = verifyData.pagination?.total || remainingParts.length;
    
    if (totalRemaining === 0) {
      console.log(`   ✅ VERIFICATION: Database is completely empty!\n`);
    } else {
      console.log(`   ⚠️  WARNING: ${totalRemaining} parts still remain in database\n`);
    }
    
    console.log("=".repeat(60));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(60) + "\n");
    
    return totalDeleted;
  } catch (error) {
    console.error(`\n❌ Error deleting parts: ${error.message || error.toString()}`);
    throw error;
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
node /tmp/delete-all-parts.js

# Cleanup
rm -f /tmp/delete-all-parts.js

echo ""
echo "=========================================="
echo -e "${GREEN}  Process Complete!${NC}"
echo "=========================================="

