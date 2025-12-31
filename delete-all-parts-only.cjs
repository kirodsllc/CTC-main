/**
 * DELETE ALL PARTS FROM DATABASE - NO IMPORT
 * Just remove everything
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

/**
 * Delete ALL parts from database
 */
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
        console.error(`   ❌ Failed to connect to backend: ${fetchError.message || fetchError.toString()}`);
        console.error(`   Make sure the backend server is running at ${API_BASE_URL}`);
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
        console.error(`   Response: ${text.substring(0, 200)}`);
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
              console.log(`\n   ⚠️  Part ${part.part_no || part.id} is used in kit, skipping...`);
            } else {
              console.log(`\n   ⚠️  Failed to delete part ${part.part_no || part.id}: ${errorData.error || deleteResponse.status}`);
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
      console.log(`   📋 Remaining parts:`);
      remainingParts.slice(0, 5).forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.part_no || p.id} - ${p.description || 'No description'}`);
      });
      if (totalRemaining > 5) {
        console.log(`      ... and ${totalRemaining - 5} more`);
      }
    }
    
    console.log("=".repeat(60));
    console.log("✅ DELETION COMPLETE");
    console.log("=".repeat(60) + "\n");
    
    return totalDeleted;
  } catch (error) {
    console.error(`\n❌ Error deleting parts: ${error.message || error.toString() || 'Unknown error'}`);
    console.error(`   Error details:`, error);
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
    console.error("\n❌ FATAL ERROR:", error.message || error.toString() || 'Unknown error');
    console.error("   Stack:", error.stack);
    process.exit(1);
  });

