/**
 * Simple script to import items from Excel/CSV and import into the app.
 * First, manually convert PDF to Excel, then run this script.
 * Run: node import-items-simple.cjs
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;

/**
 * Read items from Excel file
 */
async function readItemsFromExcel(excelPath) {
  console.log(`📊 Reading items from Excel: ${excelPath}`);
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  
  const worksheet = workbook.getWorksheet(1); // First sheet
  const items = [];
  
  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cell.value.toString().toLowerCase().trim();
  });
  
  console.log(`✅ Found headers: ${headers.filter(h => h).join(', ')}`);
  
  // Read data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    
    const item = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        item[header] = cell.value ? cell.value.toString().trim() : '';
      }
    });
    
    // Normalize field names
    const normalized = {
      part_no: item['part no'] || item['part_no'] || item['part#'] || item['part number'] || '',
      brand_name: item['brand'] || item['brand_name'] || item['brand name'] || '',
      description: item['description'] || item['desc'] || item['item description'] || item['name'] || '',
      category: item['category'] || item['category_id'] || item['category name'] || '',
      subcategory: item['subcategory'] || item['subcategory_id'] || item['subcategory name'] || '',
      application: item['application'] || item['application_id'] || item['application name'] || '',
      uom: item['uom'] || item['unit'] || item['unit of measure'] || 'pcs',
      cost: item['cost'] || item['purchase price'] || item['purchase_price'] || '',
      price_a: item['price'] || item['price_a'] || item['price a'] || item['sale price'] || '',
      status: item['status'] || 'active',
    };
    
    // Ensure part_no exists
    if (!normalized.part_no && normalized.description) {
      normalized.part_no = normalized.description.substring(0, 20) || `ITEM_${items.length + 1}`;
    }
    
    if (normalized.part_no || normalized.description) {
      items.push(normalized);
    }
  });
  
  console.log(`✅ Read ${items.length} items from Excel`);
  return items;
}

/**
 * Import items to the app
 */
async function importItemsToApp(items) {
  console.log(`\n📤 Importing ${items.length} items to the app...`);
  
  // Check if backend is running
  const fetch = (await import('node-fetch')).default;
  try {
    const testResponse = await fetch(`${API_BASE_URL}/parts?limit=1`);
    if (!testResponse.ok) {
      throw new Error(`Backend not responding. Status: ${testResponse.status}`);
    }
  } catch (error) {
    console.error(`❌ Cannot connect to backend at ${API_BASE_URL}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Please make sure the backend server is running.`);
    return { success: 0, errors: items.length };
  }
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    
    try {
      // Prepare API payload
      const payload = {
        part_no: item.part_no || `ITEM_${idx + 1}`,
        brand_name: item.brand_name || '',
        description: item.description || item.part_no || '',
        category_id: item.category || '',
        subcategory_id: item.subcategory || '',
        application_id: item.application || '',
        uom: item.uom || 'pcs',
        status: item.status || 'active',
      };
      
      // Add optional numeric fields
      if (item.cost) {
        try {
          payload.cost = parseFloat(String(item.cost).replace(/,/g, ''));
        } catch (e) {
          // Ignore invalid cost
        }
      }
      
      if (item.price_a) {
        try {
          payload.price_a = parseFloat(String(item.price_a).replace(/,/g, ''));
        } catch (e) {
          // Ignore invalid price
        }
      }
      
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });
      
      // Make API call
      const response = await fetch(PARTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok || response.status === 201) {
        successCount++;
        if ((idx + 1) % 10 === 0) {
          console.log(`  ✅ Imported ${idx + 1}/${items.length} items...`);
        }
      } else {
        errorCount++;
        const errorText = await response.text();
        const errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${response.status} - ${errorText.substring(0, 100)}`;
        errors.push(errorMsg);
        if (errorCount <= 5) {
          console.log(`  ❌ Error importing item ${idx + 1}: ${response.status}`);
        }
      }
    } catch (error) {
      errorCount++;
      const errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${error.message.substring(0, 100)}`;
      errors.push(errorMsg);
      if (errorCount <= 5) {
        console.log(`  ❌ Exception importing item ${idx + 1}: ${error.message.substring(0, 100)}`);
      }
    }
    
    // Small delay to avoid overwhelming the server
    if ((idx + 1) % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ Import Summary:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  First 10 errors:`);
    errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
  }
  
  return { success: successCount, errors: errorCount };
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("CTC Item Lists - Excel to App Import");
  console.log("=".repeat(60));
  
  const excelPath = path.join(__dirname, "CTC Item Lists.xlsx");
  
  // Check if Excel file exists
  if (!fs.existsSync(excelPath)) {
    console.log(`\n⚠️  Excel file not found: ${excelPath}`);
    console.log("   Please convert the PDF to Excel first, or create an Excel file with the following columns:");
    console.log("   - Part No (required)");
    console.log("   - Brand");
    console.log("   - Description");
    console.log("   - Category");
    console.log("   - Subcategory");
    console.log("   - Application");
    console.log("   - UOM");
    console.log("   - Cost");
    console.log("   - Price A");
    console.log("   - Status");
    return;
  }
  
  try {
    // Step 1: Read from Excel
    const items = await readItemsFromExcel(excelPath);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found in Excel file!");
      return;
    }
    
    // Step 2: Import to app
    console.log("\n" + "=".repeat(60));
    console.log("Ready to import items to the app.");
    console.log(`Total items: ${items.length}`);
    console.log("=".repeat(60));
    
    // Auto-import
    const shouldImport = process.argv.includes('--auto-import') || process.argv.includes('-y') || true;
    
    if (shouldImport) {
      await importItemsToApp(items);
    } else {
      console.log("\n⚠️  To import items, run with --auto-import flag:");
      console.log("   node import-items-simple.cjs --auto-import");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);

