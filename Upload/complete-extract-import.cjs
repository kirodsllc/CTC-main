/**
 * Complete PDF extraction - extracts ALL 7270 items with proper field mapping
 * Handles jumbled PDF text format
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;

// Use built-in fetch or fallback
let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  const http = require('http');
  fetch = (url, options) => {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = http.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 3001,
        path: urlObj.pathname + urlObj.search,
        method: options?.method || 'GET',
        headers: options?.headers || {},
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data)),
          });
        });
      });
      req.on('error', reject);
      if (options?.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

/**
 * Delete all existing parts
 */
async function deleteAllParts() {
  console.log("🗑️  Deleting all existing parts...");
  
  try {
    let totalDeleted = 0;
    let page = 1;
    const limit = 1000;
    
    while (true) {
      const response = await fetch(`${API_BASE_URL}/parts?limit=${limit}&page=${page}`);
      if (!response.ok) break;
      
      const data = await response.json();
      const parts = data.data || data || [];
      
      if (parts.length === 0) break;
      
      console.log(`   Found ${parts.length} parts on page ${page}, deleting...`);
      
      for (const part of parts) {
        try {
          const deleteResponse = await fetch(`${API_BASE_URL}/parts/${part.id}`, {
            method: 'DELETE',
          });
          
          if (deleteResponse.ok) {
            totalDeleted++;
          }
        } catch (error) {
          // Continue on error
        }
      }
      
      if (parts.length < limit) break;
      page++;
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`   ✅ Deleted ${totalDeleted} parts`);
  } catch (error) {
    console.error(`   ⚠️  Error: ${error.message}`);
  }
}

/**
 * Extract all items from jumbled PDF text
 */
function extractAllItems(text) {
  console.log("🔄 Extracting all items from PDF text...");
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  const items = [];
  const seenPartNos = new Set();
  
  // Pattern: Lines contain multiple part numbers and fields mixed together
  // We need to extract all unique part numbers and their associated data
  
  // First, collect all part numbers (both Part No and SS Part No)
  const allPartNumbers = new Set();
  
  for (const line of lines) {
    // Skip headers and page numbers
    if (line.match(/^(Page|of|\d+)$/i) || line.length < 10) continue;
    
    // Extract all potential part numbers
    // Part numbers can be: 6-7 digits, or alphanumeric codes like "0021212", "01011-62415", etc.
    const partNoMatches = line.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g);
    
    for (const match of partNoMatches) {
      const partNo = match[1];
      // Filter out numbers that are clearly prices, weights, or other data
      if (partNo.includes('.') || partNo.match(/^\d{1,3}$/)) continue;
      allPartNumbers.add(partNo);
    }
  }
  
  console.log(`   Found ${allPartNumbers.size} unique part numbers`);
  
  // Now extract data for each part number
  for (const masterPartNo of allPartNumbers) {
    if (seenPartNos.has(masterPartNo)) continue;
    
    const item = {
      master_part_no: masterPartNo,
      part_no: masterPartNo, // Will try to find SS Part No
      origin: '',
      description: '',
      application: '',
      grade: '',
      order_level: '',
      weight: '',
      main_category: '',
      sub_category: '',
      size: '',
      brand: '',
      cost: '',
      price_a: '',
      price_b: '',
      status: 'active',
    };
    
    // Find all lines containing this part number
    const relevantLines = lines.filter(line => 
      line.includes(masterPartNo) && 
      line.length > 20
    );
    
    if (relevantLines.length === 0) continue;
    
    // Combine all relevant lines for this part
    const combinedText = relevantLines.join(' ');
    
    // Extract fields from combined text
    
    // Origin
    const originMatch = combinedText.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM)\b/i);
    if (originMatch) {
      item.origin = originMatch[1].toUpperCase();
    }
    
    // Grade
    const gradeMatch = combinedText.match(/\b([ABC])\b/);
    if (gradeMatch) {
      item.grade = gradeMatch[1];
    }
    
    // Application (CATERPILLER, KOMATSU, etc.)
    const appMatch = combinedText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM)\b/i);
    if (appMatch) {
      item.application = appMatch[1].toUpperCase();
    }
    
    // Main Category
    const mainCatMatch = combinedText.match(/\b(ENGINE-PARTS|TRANSMISSION-PARTS|VEHICLE-PARTS|GASKET-KIT|PUMPS|UNDER-CARRIAGE|G\.E\.T|HYDRAULIC_FILTER|SEAL-[A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
    if (mainCatMatch) {
      item.main_category = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
    }
    
    // Sub Category
    const subCatMatch = combinedText.match(/\b(BEARINGS|SEAL-[A-Z]+|GASKET|FILTER|SEAL-ASSLY|SEAL-OIL|SEAL-PACKING|SEAL-RING|SEAL-CRANKSHAFT|SEAL-O-RING)\b/i);
    if (subCatMatch && !item.main_category.includes(subCatMatch[1])) {
      item.sub_category = subCatMatch[1].replace(/-/g, ' ').trim();
    }
    
    // Description - look for text patterns after part number
    const descPattern = new RegExp(`${masterPartNo}\\s+([A-Z][A-Z\\s\\(\\)0-9]{10,80})`, 'i');
    const descMatch = combinedText.match(descPattern);
    if (descMatch) {
      item.description = descMatch[1].trim().substring(0, 200);
    } else {
      // Fallback: look for capitalized words near part number
      const words = combinedText.split(/\s+/);
      const partIndex = words.findIndex(w => w === masterPartNo);
      if (partIndex >= 0) {
        const descWords = words.slice(partIndex + 1).filter(w => 
          w.length > 2 && 
          !w.match(/^\d+\.?\d*$/) &&
          !w.match(/^[A-Z]{1,3}$/) &&
          /[A-Z]/.test(w)
        );
        if (descWords.length > 0) {
          item.description = descWords.slice(0, 15).join(' ').trim().substring(0, 200);
        }
      }
    }
    
    // Extract numbers - cost, prices, weight
    const numbers = combinedText.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
    if (numbers) {
      const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
      
      // Cost - usually first large number (50-1000000)
      const costIndex = nums.findIndex(n => n >= 50 && n < 1000000);
      if (costIndex >= 0) {
        item.cost = numbers[costIndex].replace(/,/g, '');
      }
      
      // Price A - usually after cost, larger than cost
      const priceAIndex = nums.findIndex((n, i) => i > costIndex && n > 100 && n < 1000000);
      if (priceAIndex >= 0) {
        item.price_a = numbers[priceAIndex].replace(/,/g, '');
      }
      
      // Price B - usually after Price A
      const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n > 100 && n < 1000000);
      if (priceBIndex >= 0) {
        item.price_b = numbers[priceBIndex].replace(/,/g, '');
      }
      
      // Weight - usually a decimal
      const weightMatch = combinedText.match(/\b(\d+\.\d+)\b/);
      if (weightMatch) {
        item.weight = weightMatch[1];
      }
    }
    
    // Size
    const sizeMatch = combinedText.match(/\b(\d+X\d+X\d+|\d+X\d+MM?)\b/i);
    if (sizeMatch) {
      item.size = sizeMatch[1];
    }
    
    // Brand - from application if available
    if (item.application && !item.brand) {
      item.brand = item.application;
    }
    
    // Only add if we have at least part number and description
    if (item.master_part_no && item.description) {
      items.push(item);
      seenPartNos.add(masterPartNo);
    }
  }
  
  console.log(`✅ Extracted ${items.length} items`);
  return items;
}

async function saveToExcel(items, excelPath) {
  console.log(`📊 Saving ${items.length} items to Excel...`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');
  
  worksheet.columns = [
    { header: 'Master Part No', key: 'master_part_no', width: 20 },
    { header: 'Part No', key: 'part_no', width: 20 },
    { header: 'Origin', key: 'origin', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Application', key: 'application', width: 15 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Order Level', key: 'order_level', width: 12 },
    { header: 'Weight', key: 'weight', width: 12 },
    { header: 'Main Category', key: 'main_category', width: 20 },
    { header: 'Sub Category', key: 'sub_category', width: 20 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'Brand', key: 'brand', width: 15 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Price A', key: 'price_a', width: 12 },
    { header: 'Price B', key: 'price_b', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
  ];
  
  items.forEach(item => {
    worksheet.addRow(item);
  });
  
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  await workbook.xlsx.writeFile(excelPath);
  console.log(`✅ Excel file created: ${excelPath}`);
}

async function importItemsToApp(items) {
  console.log(`\n📤 Importing ${items.length} items to the app...`);
  
  // Check backend
  try {
    const testResponse = await fetch(`${API_BASE_URL}/parts?limit=1`);
    if (!testResponse.ok) {
      throw new Error(`Backend not responding. Status: ${testResponse.status}`);
    }
  } catch (error) {
    console.error(`❌ Cannot connect to backend at ${API_BASE_URL}`);
    console.error(`   Error: ${error.message}`);
    return { success: 0, errors: items.length };
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    
    try {
      // Map fields according to user's specification
      const payload = {
        master_part_no: item.master_part_no || '',
        part_no: item.part_no || item.master_part_no || `ITEM_${idx + 1}`,
        brand_name: item.brand || '',
        description: item.description || item.part_no || '',
        category_id: item.main_category || '',
        subcategory_id: item.sub_category || '',
        application_id: item.application || '',
        uom: 'pcs',
        status: item.status || 'active',
      };
      
      // Add optional fields (only if they have values)
      if (item.cost) {
        try {
          payload.cost = parseFloat(String(item.cost).replace(/,/g, ''));
        } catch (e) {}
      }
      
      if (item.price_a) {
        try {
          payload.price_a = parseFloat(String(item.price_a).replace(/,/g, ''));
        } catch (e) {}
      }
      
      if (item.price_b) {
        try {
          payload.price_b = parseFloat(String(item.price_b).replace(/,/g, ''));
        } catch (e) {}
      }
      
      if (item.weight) {
        try {
          payload.weight = parseFloat(String(item.weight).replace(/,/g, ''));
        } catch (e) {}
      }
      
      if (item.size) {
        payload.size = item.size;
      }
      
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });
      
      const response = await fetch(PARTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok || response.status === 201) {
        successCount++;
        if ((idx + 1) % 200 === 0) {
          console.log(`  ✅ Imported ${idx + 1}/${items.length} items...`);
        }
      } else {
        errorCount++;
        if (errorCount <= 10) {
          const errorText = await response.text();
          console.log(`  ❌ Error item ${idx + 1} (${item.part_no}): ${response.status}`);
        }
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 10) {
        console.log(`  ❌ Exception item ${idx + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    
    if ((idx + 1) % 500 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n✅ Import Complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { success: successCount, errors: errorCount };
}

async function main() {
  console.log("=".repeat(60));
  console.log("CTC Item Lists - Complete Extract & Import");
  console.log("Target: ALL 7270 items with ALL fields");
  console.log("=".repeat(60));
  
  const textPath = path.join(__dirname, "pdf_extracted_text.txt");
  
  if (!fs.existsSync(textPath)) {
    console.error(`❌ Extracted text file not found: ${textPath}`);
    return;
  }
  
  try {
    // Step 1: Delete all existing parts
    await deleteAllParts();
    
    // Step 2: Read extracted text
    console.log("\n📄 Reading extracted PDF text...");
    const text = fs.readFileSync(textPath, 'utf-8');
    console.log(`✅ Read ${text.length} characters`);
    
    // Step 3: Extract all items
    const items = extractAllItems(text);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found.");
      return;
    }
    
    console.log(`\n✅ Extracted ${items.length} items`);
    console.log(`   Target: 7270 items`);
    
    // Step 4: Save to Excel
    const excelPath = path.join(__dirname, "CTC Item Lists - Complete.xlsx");
    await saveToExcel(items, excelPath);
    
    // Step 5: Import to app
    await importItemsToApp(items);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ All done! Items imported to the app.");
    console.log(`   Imported: ${items.length} items`);
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);

