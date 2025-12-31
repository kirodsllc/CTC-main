/**
 * Import CTC Item Lists.xlsx - Import all items accurately without any calculations or changes
 * Run: node import-ctc-items-accurate.cjs
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;
const STOCK_MOVEMENTS_ENDPOINT = `${API_BASE_URL}/inventory/stock-movements`;

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
 * Read items from Excel file with all specified columns
 */
async function readItemsFromExcel(excelPath) {
  console.log(`📊 Reading items from Excel: ${excelPath}`);
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  
  console.log(`   Workbook has ${workbook.worksheets.length} worksheet(s)`);
  
  // Import from all worksheets
  const allItems = [];
  
  for (let sheetIdx = 1; sheetIdx <= workbook.worksheets.length; sheetIdx++) {
    const worksheet = workbook.getWorksheet(sheetIdx);
    
    if (worksheet.rowCount < 3) {
      continue; // Skip very small sheets
    }
    
    console.log(`\n📄 Processing worksheet ${sheetIdx}/${workbook.worksheets.length}: "${worksheet.name}" (${worksheet.rowCount} rows)`);
  const items = [];
  
  // Try to find the header row - look for row with "Part No" or "Master Part No"
  let headerRowIndex = 1;
  const expectedHeaderKeywords = ['part no', 'master part', 'origin', 'description', 'application', 'grade'];
  
  // Check first 20 rows
  for (let rowIdx = 1; rowIdx <= Math.min(20, worksheet.rowCount); rowIdx++) {
    const row = worksheet.getRow(rowIdx);
    let foundKeywords = 0;
    const rowValues = [];
    
    // Check each cell in the row
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = row.getCell(col);
      let cellValue = '';
      
      try {
        if (cell.value !== null && cell.value !== undefined) {
          if (cell.text) {
            cellValue = cell.text;
          } else if (typeof cell.value === 'string') {
            cellValue = cell.value;
          } else if (typeof cell.value === 'object') {
            cellValue = JSON.stringify(cell.value);
          } else {
            cellValue = String(cell.value);
          }
        }
      } catch (e) {
        cellValue = '';
      }
      
      const cellLower = cellValue.toLowerCase().trim();
      rowValues.push(cellLower);
      
      // Check if this cell contains a header keyword
      for (const keyword of expectedHeaderKeywords) {
        if (cellLower.includes(keyword)) {
          foundKeywords++;
        }
      }
    }
    
    // If we found at least 3 header keywords, this is likely the header row
    if (foundKeywords >= 3) {
      headerRowIndex = rowIdx;
      console.log(`✅ Found header row at line ${rowIdx} (found ${foundKeywords} header keywords)`);
      break;
    }
  }
  
  // Get headers from the identified header row
  const headerRow = worksheet.getRow(headerRowIndex);
  const headers = {};
  const headerNames = [];
  
  // Read headers column by column
  for (let col = 1; col <= worksheet.columnCount; col++) {
    const cell = headerRow.getCell(col);
    let headerName = '';
    
    try {
      if (cell.value !== null && cell.value !== undefined) {
        if (cell.text) {
          headerName = cell.text.trim();
        } else if (typeof cell.value === 'string') {
          headerName = cell.value.trim();
        } else if (typeof cell.value === 'object') {
          // Try to extract text from object
          if (cell.value.text) {
            headerName = String(cell.value.text).trim();
          } else {
            headerName = String(cell.value).trim();
          }
        } else {
          headerName = String(cell.value).trim();
        }
      }
    } catch (e) {
      headerName = '';
    }
    
    // Only use valid header names
    if (headerName && 
        headerName !== 'undefined' && 
        headerName !== 'null' && 
        !headerName.startsWith('[') &&
        headerName.length < 100) { // Avoid very long strings that might be data
      headers[col] = headerName;
      headerNames.push(headerName);
    }
  }
  
  console.log(`✅ Found ${headerNames.length} column headers`);
  
  // Show headers for debugging
  if (headerNames.length > 0) {
    console.log(`   Sample headers: ${headerNames.slice(0, 5).join(' | ')}`);
  }
  
  // Read data rows
  let rowNumber = 0;
  let skippedRows = 0;
  
  worksheet.eachRow((row, rowIdx) => {
    if (rowIdx <= headerRowIndex) return; // Skip header row(s)
    
    rowNumber++;
    const item = {};
    let hasData = false;
    
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerName = headers[colNumber];
      if (headerName) {
        // Get cell value - preserve as-is
        let value = cell.value;
        
        // Handle different cell types
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          // Handle rich text, formula result, or date
          if (value.text) {
            value = value.text;
          } else if (value.result !== undefined) {
            value = value.result;
          } else if (value instanceof Date) {
            value = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else {
            value = String(value);
          }
        }
        
        // Convert to string and trim
        if (value !== '') {
          value = String(value).trim();
          if (value) hasData = true;
        } else {
          value = '';
        }
        
        item[headerName] = value;
      }
    });
    
    // Check for part number in various possible column names
    const hasPartNo = item['Master Part No'] || item['Part No'] || item['master part no'] || item['part no'] || 
                      item['Master Part No.'] || item['Part No.'] || item['MASTER PART NO'] || item['PART NO'] ||
                      item['Part No. SS Part No. Origin'] || // Handle merged header case
                      Object.values(item).some(v => {
                        const val = String(v || '').trim();
                        // Check if value looks like a part number (alphanumeric, 4+ chars)
                        return /^[A-Z0-9\-]{4,}$/i.test(val);
                      });
    
    if (hasPartNo && hasData) {
      items.push(item);
    } else if (hasData) {
      skippedRows++;
      // Debug: show first few skipped rows
      if (skippedRows <= 3) {
        console.log(`   Debug skipped row ${rowNumber}: ${JSON.stringify(Object.keys(item).slice(0, 5))}`);
      }
    }
  });
  
  if (skippedRows > 0) {
    console.log(`⚠️  Skipped ${skippedRows} rows without part numbers`);
  }
  
  // If no items found in this sheet, try alternative reading method
  if (items.length === 0 && worksheet.rowCount > 5) {
    console.log(`\n⚠️  No items found with standard method. Trying alternative reading...`);
    // Try reading by column position instead of header names
    // This handles cases where headers are merged or formatted unusually
    for (let rowIdx = headerRowIndex + 1; rowIdx <= Math.min(headerRowIndex + 50, worksheet.rowCount); rowIdx++) {
      const row = worksheet.getRow(rowIdx);
      const item = {};
      let hasData = false;
      
      // Read first 20 columns
      for (let col = 1; col <= Math.min(20, worksheet.columnCount); col++) {
        const cell = row.getCell(col);
        let value = '';
        
        try {
          if (cell.value !== null && cell.value !== undefined) {
            if (cell.text) {
              value = cell.text.trim();
            } else if (typeof cell.value === 'string') {
              value = cell.value.trim();
            } else if (typeof cell.value === 'number') {
              value = String(cell.value);
            } else {
              value = String(cell.value).trim();
            }
          }
        } catch (e) {
          value = '';
        }
        
        if (value) {
          hasData = true;
          // Use column index as key
          item[`Col${col}`] = value;
        }
      }
      
      // Check if this looks like a data row (has part number pattern)
      const allValues = Object.values(item).join(' ');
      if (hasData && /[A-Z0-9]{4,}/i.test(allValues)) {
        // Try to map to expected fields based on position
        const mappedItem = {
          'Part No': item.Col1 || item.Col2 || '',
          'Master Part No': item.Col1 || '',
          'Origin': item.Col3 || '',
          'Description': item.Col4 || item.Col5 || '',
          'Application': item.Col5 || item.Col6 || '',
          'Grade': item.Col6 || item.Col7 || '',
          'Order Level': item.Col7 || item.Col8 || '',
          'Weight': item.Col8 || item.Col9 || '',
          'Main Category': item.Col9 || item.Col10 || '',
          'Sub Category': item.Col10 || item.Col11 || '',
          'Size': item.Col11 || item.Col12 || '',
          'Brand': item.Col12 || item.Col13 || '',
          'Cost': item.Col13 || item.Col14 || '',
          'Price A': item.Col14 || item.Col15 || '',
          'Price B': item.Col15 || item.Col16 || '',
          'Model': item.Col16 || item.Col17 || '',
          'Quantity': item.Col17 || item.Col18 || '',
        };
        
        if (mappedItem['Part No'] || mappedItem['Master Part No']) {
          items.push(mappedItem);
          if (items.length <= 3) {
            console.log(`   Found item via alternative method: ${mappedItem['Part No'] || mappedItem['Master Part No']}`);
          }
        }
      }
    }
  }
  
    console.log(`   ✅ Found ${items.length} items in this sheet`);
    allItems.push(...items);
  }
  
  console.log(`\n✅ Total: Read ${allItems.length} items from all ${workbook.worksheets.length} worksheets`);
  return allItems;
}

/**
 * Normalize field names from Excel headers
 */
function normalizeItem(item) {
  // Map Excel column names to normalized field names
  const normalized = {};
  
  // Master Part No
  normalized.master_part_no = item['Master Part No'] || item['master part no'] || item['Master Part No.'] || item['MASTER PART NO'] || '';
  
  // Part No
  normalized.part_no = item['Part No'] || item['part no'] || item['Part No.'] || item['PART NO'] || normalized.master_part_no || '';
  
  // Origin
  normalized.origin = item['Origin'] || item['origin'] || item['ORIGIN'] || '';
  
      // Description
      normalized.description = item['Description'] || item['description'] || item['DESCRIPTION'] || '';
      
      // Application
      normalized.application = item['Application'] || item['application'] || item['APPLICATION'] || '';
      
      // Grade (not in schema, but we'll preserve it)
      normalized.grade = item['Grade'] || item['grade'] || item['GRADE'] || '';
      
      // Origin - will be normalized to dropdown values
      normalized.origin = item['Origin'] || item['origin'] || item['ORIGIN'] || '';
  
  // Order Level
  normalized.order_level = item['Order Level'] || item['order level'] || item['Order Level.'] || item['ORDER LEVEL'] || '';
  
  // Weight
  normalized.weight = item['Weight'] || item['weight'] || item['WEIGHT'] || '';
  
  // Main Category
  normalized.main_category = item['Main Category'] || item['main category'] || item['Main Category.'] || item['MAIN CATEGORY'] || '';
  
  // Sub Category
  normalized.sub_category = item['Sub Category'] || item['sub category'] || item['Sub Category.'] || item['SUB CATEGORY'] || '';
  
  // Size
  normalized.size = item['Size'] || item['size'] || item['SIZE'] || '';
  
  // Brand
  normalized.brand = item['Brand'] || item['brand'] || item['BRAND'] || '';
  
  // Cost
  normalized.cost = item['Cost'] || item['cost'] || item['COST'] || '';
  
  // Price A
  normalized.price_a = item['Price A'] || item['price a'] || item['Price A.'] || item['PRICE A'] || '';
  
  // Price B
  normalized.price_b = item['Price B'] || item['price b'] || item['Price B.'] || item['PRICE B'] || '';
  
  // Model
  normalized.model = item['Model'] || item['model'] || item['MODEL'] || '';
  
  // Quantity
  normalized.quantity = item['Quantity'] || item['quantity'] || item['QUANTITY'] || '';
  
  return normalized;
}

/**
 * Import items to the app with all fields accurately
 */
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
    console.error(`   Please make sure the backend server is running.`);
    return { success: 0, errors: items.length };
  }
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  const createdPartIds = []; // Store part IDs for stock movement creation
  
  for (let idx = 0; idx < items.length; idx++) {
    const rawItem = items[idx];
    const item = normalizeItem(rawItem);
    
    try {
      // Normalize Origin to match dropdown values (local, import, china, japan, germany, usa)
      // Also check for PPR (if it's an origin value)
      let normalizedOrigin = '';
      if (item.origin && item.origin.trim()) {
        const originLower = item.origin.trim().toLowerCase();
        // Map common origin values to dropdown options
        if (originLower.includes('local') || originLower.includes('loc')) {
          normalizedOrigin = 'local';
        } else if (originLower.includes('import') || originLower.includes('imp')) {
          normalizedOrigin = 'import';
        } else if (originLower.includes('china') || originLower.includes('chn') || originLower.includes('prc')) {
          normalizedOrigin = 'china';
        } else if (originLower.includes('japan') || originLower.includes('jap')) {
          normalizedOrigin = 'japan';
        } else if (originLower.includes('germany') || originLower.includes('ger')) {
          normalizedOrigin = 'germany';
        } else if (originLower.includes('usa') || originLower.includes('united states')) {
          normalizedOrigin = 'usa';
        } else if (originLower.includes('ppr')) {
          // PPR is now a valid origin option
          normalizedOrigin = 'ppr';
        } else {
          // If it doesn't match, use the original value (might be added to dropdown later)
          normalizedOrigin = originLower;
        }
      }
      
      // Normalize Grade to match dropdown values (A, B, C, D)
      let normalizedGrade = '';
      if (item.grade && item.grade.trim()) {
        const gradeUpper = item.grade.trim().toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(gradeUpper)) {
          normalizedGrade = gradeUpper;
        } else {
          // If it's not A/B/C/D, use the original value
          normalizedGrade = gradeUpper;
        }
      }
      
      // Prepare API payload - map all fields accurately
      const payload = {
        master_part_no: item.master_part_no || '',
        part_no: item.part_no || `ITEM_${idx + 1}`,
        brand_name: item.brand || '',
        description: item.description || '',
        category_id: item.main_category || '', // Main Category maps to category_id
        subcategory_id: item.sub_category || '',
        application_id: item.application || '',
        weight: item.weight ? (typeof item.weight === 'string' ? item.weight.replace(/,/g, '') : item.weight.toString()) : '',
        reorder_level: item.order_level ? (typeof item.order_level === 'string' ? item.order_level.replace(/,/g, '') : item.order_level.toString()) : '',
        size: item.size || '',
        cost: item.cost ? (typeof item.cost === 'string' ? item.cost.replace(/,/g, '') : item.cost.toString()) : '',
        price_a: item.price_a ? (typeof item.price_a === 'string' ? item.price_a.replace(/,/g, '') : item.price_a.toString()) : '',
        price_b: item.price_b ? (typeof item.price_b === 'string' ? item.price_b.replace(/,/g, '') : item.price_b.toString()) : '',
        uom: 'pcs',
        status: 'active',
      };
      
      // Add origin and grade as separate fields (if they exist in the API)
      if (normalizedOrigin) {
        payload.origin = normalizedOrigin;
      }
      if (normalizedGrade) {
        payload.grade = normalizedGrade;
      }
      
      // Handle models if provided
      if (item.model && item.model.trim()) {
        payload.models = [{
          name: item.model.trim(),
          qty_used: 1
        }];
      }
      
      // Convert numeric fields
      if (payload.weight) {
        try {
          const weightVal = parseFloat(payload.weight);
          if (!isNaN(weightVal)) {
            payload.weight = weightVal;
          } else {
            delete payload.weight;
          }
        } catch (e) {
          delete payload.weight;
        }
      } else {
        delete payload.weight;
      }
      
      if (payload.reorder_level) {
        try {
          const reorderVal = parseInt(payload.reorder_level);
          if (!isNaN(reorderVal)) {
            payload.reorder_level = reorderVal;
          } else {
            delete payload.reorder_level;
          }
        } catch (e) {
          delete payload.reorder_level;
        }
      } else {
        delete payload.reorder_level;
      }
      
      if (payload.cost) {
        try {
          const costVal = parseFloat(payload.cost);
          if (!isNaN(costVal)) {
            payload.cost = costVal;
          } else {
            delete payload.cost;
          }
        } catch (e) {
          delete payload.cost;
        }
      } else {
        delete payload.cost;
      }
      
      if (payload.price_a) {
        try {
          const priceAVal = parseFloat(payload.price_a);
          if (!isNaN(priceAVal)) {
            payload.price_a = priceAVal;
          } else {
            delete payload.price_a;
          }
        } catch (e) {
          delete payload.price_a;
        }
      } else {
        delete payload.price_a;
      }
      
      if (payload.price_b) {
        try {
          const priceBVal = parseFloat(payload.price_b);
          if (!isNaN(priceBVal)) {
            payload.price_b = priceBVal;
          } else {
            delete payload.price_b;
          }
        } catch (e) {
          delete payload.price_b;
        }
      } else {
        delete payload.price_b;
      }
      
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      // Make API call to create part
      const response = await fetch(PARTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok || response.status === 201) {
        const responseData = await response.json();
        const partId = responseData.id;
        
        // Store part ID and quantity for stock movement
        if (partId && item.quantity) {
          createdPartIds.push({
            partId: partId,
            quantity: item.quantity,
            partNo: item.part_no
          });
        }
        
        successCount++;
        if ((idx + 1) % 100 === 0) {
          console.log(`  ✅ Imported ${idx + 1}/${items.length} items...`);
        }
      } else {
        errorCount++;
        const errorText = await response.text();
        const errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${response.status} - ${errorText.substring(0, 100)}`;
        errors.push(errorMsg);
        if (errorCount <= 10) {
          console.log(`  ❌ Error item ${idx + 1} (${item.part_no}): ${response.status}`);
        }
      }
    } catch (error) {
      errorCount++;
      const errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${error.message.substring(0, 100)}`;
      errors.push(errorMsg);
      if (errorCount <= 10) {
        console.log(`  ❌ Exception item ${idx + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    
    // Small delay to avoid overwhelming the server
    if ((idx + 1) % 200 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Create stock movements for items with quantity
  if (createdPartIds.length > 0) {
    console.log(`\n📦 Creating stock movements for ${createdPartIds.length} items with quantity...`);
    let stockMovementCount = 0;
    
    for (const partInfo of createdPartIds) {
      try {
        const quantity = parseFloat(String(partInfo.quantity).replace(/,/g, ''));
        if (!isNaN(quantity) && quantity > 0) {
          // Try to create stock movement
          // Note: This requires the stock movements endpoint to exist
          // If it doesn't exist, we'll skip this step
          try {
            const stockResponse = await fetch(STOCK_MOVEMENTS_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                part_id: partInfo.partId,
                type: 'in',
                quantity: quantity,
                notes: `Initial stock from import - Part: ${partInfo.partNo}`
              }),
            });
            
            if (stockResponse.ok || stockResponse.status === 201) {
              stockMovementCount++;
            }
          } catch (stockError) {
            // Stock movement endpoint might not exist, that's okay
            // We'll just log it
            if (stockMovementCount === 0 && createdPartIds.indexOf(partInfo) === 0) {
              console.log(`  ⚠️  Stock movement endpoint not available, skipping quantity import`);
            }
            break; // Stop trying if endpoint doesn't exist
          }
        }
      } catch (error) {
        // Ignore stock movement errors
      }
    }
    
    if (stockMovementCount > 0) {
      console.log(`  ✅ Created ${stockMovementCount} stock movements`);
    }
  }
  
  console.log(`\n✅ Import Complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errors.length > 0 && errors.length <= 20) {
    console.log(`\n⚠️  Errors:`);
    errors.forEach(err => console.log(`   ${err}`));
  } else if (errors.length > 20) {
    console.log(`\n⚠️  First 20 errors:`);
    errors.slice(0, 20).forEach(err => console.log(`   ${err}`));
  }
  
  return { success: successCount, errors: errorCount };
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("CTC Item Lists - Accurate Import");
  console.log("Importing all items with accurate data - no calculations or changes");
  console.log("=".repeat(60));
  
  const excelPath = path.join(__dirname, "CTC Item Lists.xlsx");
  
  // Check if Excel file exists
  if (!fs.existsSync(excelPath)) {
    console.log(`\n❌ Excel file not found: ${excelPath}`);
    console.log("   Please make sure 'CTC Item Lists.xlsx' is in the project root directory.");
    return;
  }
  
  try {
    // Step 1: Read from Excel
    const items = await readItemsFromExcel(excelPath);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found in Excel file!");
      return;
    }
    
    console.log(`\n✅ Found ${items.length} items to import`);
    console.log("   Columns expected:");
    console.log("   - Master Part No, Part No, Origin, Description");
    console.log("   - Application, Grade, Order Level, Weight");
    console.log("   - Main Category, Sub Category, Size, Brand");
    console.log("   - Cost, Price A, Price B, Model, Quantity");
    
    // Step 2: Import to app
    console.log("\n" + "=".repeat(60));
    console.log("Starting import...");
    console.log("=".repeat(60));
    
    await importItemsToApp(items);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Import process completed!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);

