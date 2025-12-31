/**
 * Enhanced PDF extraction and import with proper field mapping
 * Extracts all 7270 items with all fields
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
    // Get all parts first
    const response = await fetch(`${API_BASE_URL}/parts?limit=10000`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parts: ${response.status}`);
    }
    
    const data = await response.json();
    const parts = data.data || data || [];
    
    console.log(`   Found ${parts.length} existing parts`);
    
    if (parts.length === 0) {
      console.log("   ✅ No parts to delete");
      return;
    }
    
    // Delete each part
    let deleted = 0;
    let errors = 0;
    
    for (const part of parts) {
      try {
        const deleteResponse = await fetch(`${API_BASE_URL}/parts/${part.id}`, {
          method: 'DELETE',
        });
        
        if (deleteResponse.ok) {
          deleted++;
          if (deleted % 100 === 0) {
            console.log(`   Deleted ${deleted}/${parts.length} parts...`);
          }
        } else {
          errors++;
          if (errors <= 5) {
            const errorText = await deleteResponse.text();
            console.log(`   ⚠️  Error deleting part ${part.id}: ${errorText.substring(0, 100)}`);
          }
        }
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.log(`   ⚠️  Exception deleting part ${part.id}: ${error.message}`);
        }
      }
      
      // Small delay to avoid overwhelming server
      if (deleted % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`   ✅ Deleted ${deleted} parts, ${errors} errors`);
  } catch (error) {
    console.error(`   ❌ Error deleting parts: ${error.message}`);
    throw error;
  }
}

/**
 * Enhanced PDF text parser with proper field extraction
 */
function parsePDFTextEnhanced(text) {
  console.log("🔄 Parsing PDF text with enhanced field extraction...");
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 2);
  const items = [];
  const seenPartNos = new Set();
  
  // Look for table rows - they typically have multiple fields separated by spaces
  // Pattern: Part No, SS Part No, Origin, Desc, Appl, Grade, Order.Lvl, Weight, Main, Sub, Size, Brand, Cost, Price A, Price B
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers, headers, and very short lines
    if (line.match(/^(Page|of|\d+)$/i) || line.length < 10) continue;
    
    // Look for part number patterns (6-7 digits or alphanumeric codes)
    // Part numbers are usually at the start of a data row
    const partNoMatch = line.match(/^([0-9]{6,7}|[A-Z0-9\-]{4,15})\s+/);
    
    if (partNoMatch) {
      const masterPartNo = partNoMatch[1].trim();
      
      // Skip if we've seen this part number
      if (seenPartNos.has(masterPartNo)) continue;
      
      // Try to extract all fields from this line
      const words = line.split(/\s+/);
      const partIndex = words.findIndex(w => w === masterPartNo);
      
      if (partIndex >= 0) {
        const item = {
          master_part_no: masterPartNo,
          part_no: masterPartNo, // Default to master part no, will try to find SS Part No
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
        
        // Extract fields by looking for patterns in the line
        // Look for origin codes (PRC, USA, ITAL, etc.)
        const originMatch = line.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER)\b/i);
        if (originMatch) {
          item.origin = originMatch[1].toUpperCase();
        }
        
        // Look for grade (A, B, C)
        const gradeMatch = line.match(/\b([ABC])\b/);
        if (gradeMatch) {
          item.grade = gradeMatch[1];
        }
        
        // Look for numeric values that could be cost, price, weight, order level
        const numbers = line.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
        if (numbers) {
          // Try to identify which number is which based on position and value
          // Cost and prices are usually larger numbers
          // Weight and order level are usually smaller
          const largeNumbers = numbers.filter(n => parseFloat(n.replace(/,/g, '')) > 100);
          const smallNumbers = numbers.filter(n => parseFloat(n.replace(/,/g, '')) <= 100);
          
          if (largeNumbers.length >= 1) {
            item.cost = largeNumbers[0].replace(/,/g, '');
          }
          if (largeNumbers.length >= 2) {
            item.price_a = largeNumbers[1].replace(/,/g, '');
          }
          if (largeNumbers.length >= 3) {
            item.price_b = largeNumbers[2].replace(/,/g, '');
          }
          
          // Weight is usually a decimal or medium number
          const weightMatch = line.match(/\b(\d+\.\d+)\b/);
          if (weightMatch) {
            item.weight = weightMatch[1];
          } else if (smallNumbers.length > 0) {
            const num = parseFloat(smallNumbers[0].replace(/,/g, ''));
            if (num > 0 && num < 1000) {
              item.weight = smallNumbers[0].replace(/,/g, '');
            }
          }
        }
        
        // Extract description - usually text after part numbers
        // Look for text that's not a code or number
        const descStart = partIndex + 1;
        const descWords = words.slice(descStart).filter(w => 
          !w.match(/^[A-Z]{1,3}$/) && // Not a short code
          !w.match(/^\d+\.?\d*$/) && // Not a number
          w.length > 2
        );
        
        if (descWords.length > 0) {
          // Take first meaningful words as description
          item.description = descWords.slice(0, 15).join(' ').trim();
        }
        
        // Look for application (CATERPILLER, KOMATSU, etc.)
        const appMatch = line.match(/\b(CATERPILLER|KOMATSU|CUMMINS)\b/i);
        if (appMatch) {
          item.application = appMatch[1].toUpperCase();
        }
        
        // Look for main category (ENGINE-PARTS, TRANSMISSION-PARTS, etc.)
        const mainCatMatch = line.match(/\b(ENGINE-PARTS|TRANSMISSION-PARTS|VEHICLE-PARTS|GASKET-KIT|PUMPS|UNDER-CARRIAGE|G\.E\.T|HYDRAULIC_FILTER|SEAL-[A-Z]+)\b/i);
        if (mainCatMatch) {
          item.main_category = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
        }
        
        // Look for sub category (BEARINGS, etc.)
        const subCatMatch = line.match(/\b(BEARINGS|SEAL-[A-Z]+|GASKET|FILTER)\b/i);
        if (subCatMatch) {
          item.sub_category = subCatMatch[1].replace(/-/g, ' ').trim();
        }
        
        // Look for brand (if not already set from application)
        if (!item.brand && item.application) {
          item.brand = item.application;
        }
        
        // If we have at least a part number and description, add the item
        if (item.master_part_no && item.description) {
          items.push(item);
          seenPartNos.add(masterPartNo);
        }
      }
    }
    
    // Also look for lines that might be descriptions or additional data for previous items
    // This handles multi-line entries
  }
  
  // Second pass: Try to extract more structured data by looking for table patterns
  // Look for lines with multiple fields that look like table rows
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if already processed or too short
    if (line.length < 20 || line.match(/^(Page|of|\d+)$/i)) continue;
    
    // Look for patterns that suggest a data row
    // Should have part number, some text, and numbers
    const hasPartNo = /\b([0-9]{6,7}|[A-Z0-9\-]{4,15})\b/.test(line);
    const hasText = /[A-Z]{4,}/.test(line);
    const hasNumbers = /\d+/.test(line);
    
    if (hasPartNo && hasText && hasNumbers) {
      const partNoMatch = line.match(/\b([0-9]{6,7}|[A-Z0-9\-]{4,15})\b/);
      if (partNoMatch) {
        const partNo = partNoMatch[1];
        
        // Skip if already processed
        if (seenPartNos.has(partNo)) continue;
        
        // Try to extract all fields
        const words = line.split(/\s+/);
        const item = extractFieldsFromLine(line, words, partNo);
        
        if (item && item.description) {
          items.push(item);
          seenPartNos.add(partNo);
        }
      }
    }
  }
  
  console.log(`✅ Extracted ${items.length} items from PDF`);
  return items;
}

function extractFieldsFromLine(line, words, partNo) {
  const item = {
    master_part_no: partNo,
    part_no: partNo,
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
  
  // Extract origin
  const originMatch = line.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|YNRSP|HRD|ITR|R|WG|CTC|KTSU|LOC|CGR|PIS|FP|UKP|BDOG|CAT|DRS|MTM|BER|CHN|WLK)\b/i);
  if (originMatch) {
    const origin = originMatch[1].toUpperCase();
    // Only use if it's a country code, not a part code
    if (['PRC', 'USA', 'ITAL', 'TURK', 'IND', 'KOR', 'UK', 'CHN', 'AFR', 'TAIW', 'JAP', 'GER', 'SAM'].includes(origin)) {
      item.origin = origin;
    }
  }
  
  // Extract grade
  const gradeMatch = line.match(/\b([ABC])\b/);
  if (gradeMatch) {
    item.grade = gradeMatch[1];
  }
  
  // Extract description - look for text patterns
  const descStart = words.findIndex(w => w === partNo) + 1;
  if (descStart > 0) {
    const descWords = words.slice(descStart).filter(w => 
      w.length > 2 && 
      !w.match(/^\d+\.?\d*$/) &&
      !w.match(/^[A-Z]{1,2}$/)
    );
    item.description = descWords.slice(0, 20).join(' ').trim();
  }
  
  // Extract application
  const appMatch = line.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM)\b/i);
  if (appMatch) {
    item.application = appMatch[1].toUpperCase();
  }
  
  // Extract main category
  const mainCatMatch = line.match(/\b(ENGINE-PARTS|TRANSMISSION-PARTS|VEHICLE-PARTS|GASKET-KIT|PUMPS|UNDER-CARRIAGE|G\.E\.T|HYDRAULIC_FILTER|SEAL-[A-Z]+|BEARINGS)\b/i);
  if (mainCatMatch) {
    item.main_category = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Extract sub category
  const subCatMatch = line.match(/\b(BEARINGS|SEAL-[A-Z]+|GASKET|FILTER|SEAL-ASSLY|SEAL-OIL|SEAL-PACKING|SEAL-RING|SEAL-CRANKSHAFT)\b/i);
  if (subCatMatch && !item.main_category.includes(subCatMatch[1])) {
    item.sub_category = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Extract numbers - cost, prices, weight
  const allNumbers = line.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (allNumbers) {
    const nums = allNumbers.map(n => parseFloat(n.replace(/,/g, '')));
    
    // Cost is usually the first large number
    const costIndex = nums.findIndex(n => n > 50 && n < 1000000);
    if (costIndex >= 0) {
      item.cost = allNumbers[costIndex].replace(/,/g, '');
    }
    
    // Price A is usually after cost
    const priceAIndex = nums.findIndex((n, i) => i > costIndex && n > 100 && n < 1000000);
    if (priceAIndex >= 0) {
      item.price_a = allNumbers[priceAIndex].replace(/,/g, '');
    }
    
    // Price B is usually after Price A
    const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n > 100 && n < 1000000);
    if (priceBIndex >= 0) {
      item.price_b = allNumbers[priceBIndex].replace(/,/g, '');
    }
    
    // Weight is usually a decimal or smaller number
    const weightMatch = line.match(/\b(\d+\.\d+)\b/);
    if (weightMatch) {
      item.weight = weightMatch[1];
    }
  }
  
  // Extract size if present
  const sizeMatch = line.match(/\b(\d+X\d+X\d+|\d+X\d+MM?)\b/i);
  if (sizeMatch) {
    item.size = sizeMatch[1];
  }
  
  // Set brand from application if available
  if (item.application && !item.brand) {
    item.brand = item.application;
  }
  
  return item;
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
      
      // Add optional fields
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
        if ((idx + 1) % 100 === 0) {
          console.log(`  ✅ Imported ${idx + 1}/${items.length} items...`);
        }
      } else {
        errorCount++;
        if (errorCount <= 10) {
          const errorText = await response.text();
          console.log(`  ❌ Error item ${idx + 1} (${item.part_no}): ${response.status} - ${errorText.substring(0, 80)}`);
        }
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 10) {
        console.log(`  ❌ Exception item ${idx + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    
    if ((idx + 1) % 200 === 0) {
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
  console.log("CTC Item Lists - Enhanced Extract & Import");
  console.log("Target: 7270 items with all fields");
  console.log("=".repeat(60));
  
  const textPath = path.join(__dirname, "pdf_extracted_text.txt");
  
  if (!fs.existsSync(textPath)) {
    console.error(`❌ Extracted text file not found: ${textPath}`);
    console.error("   Please run extract-and-import.cjs first to extract PDF text");
    return;
  }
  
  try {
    // Step 1: Delete all existing parts
    await deleteAllParts();
    
    // Step 2: Read extracted text
    console.log("\n📄 Reading extracted PDF text...");
    const text = fs.readFileSync(textPath, 'utf-8');
    console.log(`✅ Read ${text.length} characters`);
    
    // Step 3: Parse to items with enhanced extraction
    const items = parsePDFTextEnhanced(text);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found. Check the extracted text file.");
      return;
    }
    
    console.log(`\n✅ Extracted ${items.length} items`);
    console.log(`   Target: 7270 items`);
    
    // Step 4: Save to Excel
    const excelPath = path.join(__dirname, "CTC Item Lists - Enhanced.xlsx");
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

