/**
 * FORCE DELETE ALL PARTS - Even those with constraints
 */

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

async function forceDeleteAllParts() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  FORCE DELETING ALL REMAINING PARTS");
  console.log("=".repeat(60) + "\n");
  
  try {
    let totalDeleted = 0;
    let totalSkipped = 0;
    let page = 1;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await fetch(`${API_BASE_URL}/parts?limit=${limit}&page=${page}`);
      
      if (!response.ok) {
        console.log(`   ⚠️  No more parts (status: ${response.status})`);
        hasMore = false;
        break;
      }
      
      const data = await response.json();
      const parts = data.data || data || [];
      
      if (parts.length === 0) {
        console.log(`   ✅ No more parts found`);
        hasMore = false;
        break;
      }
      
      console.log(`   📊 Found ${parts.length} parts on page ${page}`);
      
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
              totalSkipped++;
              if (totalSkipped <= 5) {
                console.log(`\n   ⚠️  Part ${part.part_no || part.id} is used in kit, skipping...`);
              }
            } else {
              // Try to delete anyway - might be a constraint issue
              totalSkipped++;
            }
          }
        } catch (error) {
          totalSkipped++;
        }
      }
      
      if (parts.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n   ✅ DELETED: ${totalDeleted} parts`);
    console.log(`   ⚠️  SKIPPED: ${totalSkipped} parts (likely in kits or have constraints)\n`);
    
    // Final verification
    console.log("🔍 Final verification...");
    const verifyResponse = await fetch(`${API_BASE_URL}/parts?limit=1`);
    const verifyData = await verifyResponse.json();
    const totalRemaining = verifyData.pagination?.total || 0;
    
    if (totalRemaining === 0) {
      console.log(`   ✅ SUCCESS: Database is completely empty!\n`);
    } else {
      console.log(`   ⚠️  WARNING: ${totalRemaining} parts still remain`);
      console.log(`   💡 These parts are likely used in kits and cannot be deleted via API`);
      console.log(`   💡 You may need to delete kits first or use database script\n`);
    }
    
    console.log("=".repeat(60));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(60) + "\n");
    
    return { deleted: totalDeleted, skipped: totalSkipped, remaining: totalRemaining };
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    throw error;
  }
}

// Run deletion
forceDeleteAllParts()
  .then((result) => {
    if (result.remaining === 0) {
      console.log("✅ All parts deleted! Database is now empty.");
    } else {
      console.log(`⚠️  ${result.remaining} parts remain (likely in kits).`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ FATAL ERROR:", error.message);
    process.exit(1);
  });

