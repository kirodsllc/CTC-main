/**
 * Verify imported data accuracy
 */

const http = require('http');

const API_BASE_URL = "http://localhost:3001/api";

function fetch(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 3001,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verifyData() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 VERIFYING IMPORTED DATA ACCURACY");
  console.log("=".repeat(60) + "\n");
  
  try {
    // Get total count
    const countRes = await fetch(`${API_BASE_URL}/parts?limit=1`);
    const countData = await countRes.json();
    const total = countData.pagination?.total || countData.data?.length || 0;
    
    console.log(`📊 Total items in database: ${total}\n`);
    
    // Get sample items
    const sampleRes = await fetch(`${API_BASE_URL}/parts?limit=10`);
    const sampleData = await sampleRes.json();
    const items = sampleData.data || [];
    
    console.log("📋 SAMPLE ITEMS (First 5):\n");
    
    items.slice(0, 5).forEach((p, i) => {
      console.log(`Item ${i + 1}:`);
      console.log(`  ✅ Master Part No: ${p.master_part_no || 'N/A'}`);
      console.log(`  ✅ Part No: ${p.part_no || 'N/A'}`);
      console.log(`  ✅ Description: ${(p.description || 'N/A').substring(0, 50)}...`);
      console.log(`  ✅ Brand: ${p.brand_name || 'N/A'}`);
      console.log(`  ✅ Category: ${p.category_name || 'N/A'}`);
      console.log(`  ✅ Subcategory: ${p.subcategory_name || 'N/A'}`);
      console.log(`  ✅ Application: ${p.application_name || 'N/A'}`);
      console.log(`  ✅ Cost: ${p.cost || 'N/A'}`);
      console.log(`  ✅ Price A: ${p.price_a || 'N/A'}`);
      console.log(`  ✅ Price B: ${p.price_b || 'N/A'}`);
      console.log(`  ✅ Weight: ${p.weight || 'N/A'}`);
      console.log(`  ✅ Size: ${p.size || 'N/A'}`);
      console.log(`  ✅ Status: ${p.status || 'N/A'}`);
      console.log("");
    });
    
    // Check for missing critical fields
    let missingMasterPart = 0;
    let missingPartNo = 0;
    let missingDescription = 0;
    let missingPrices = 0;
    
    items.forEach(p => {
      if (!p.master_part_no) missingMasterPart++;
      if (!p.part_no) missingPartNo++;
      if (!p.description) missingDescription++;
      if (!p.price_a && !p.price_b) missingPrices++;
    });
    
    console.log("📊 DATA QUALITY CHECK:\n");
    console.log(`  Items with Master Part No: ${items.length - missingMasterPart}/${items.length}`);
    console.log(`  Items with Part No: ${items.length - missingPartNo}/${items.length}`);
    console.log(`  Items with Description: ${items.length - missingDescription}/${items.length}`);
    console.log(`  Items with Prices: ${items.length - missingPrices}/${items.length}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ VERIFICATION COMPLETE");
    console.log("=".repeat(60) + "\n");
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

verifyData();

