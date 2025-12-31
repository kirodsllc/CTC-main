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
  
  /**
   * Extract Models and Cons.Qty pairs from item data
   * Enhanced extraction that handles:
   * 1. Explicit "Models" and "Cons.Qty" column headers
   * 2. Model patterns at the end of rows (140G, 966H, D8H, etc.)
   * 3. Paired Model-Qty values in sequence
   */
  function extractModelsFromItem(item) {
    const models = [];
    const allValues = Object.entries(item);
    const modelPattern = /^[A-Z0-9\-]{2,10}$/i; // Model codes: 2-10 alphanumeric chars with optional dash
    
    // Known field names to skip when looking for models
    const skipFields = ['part no', 'ss part no', 'desc', 'description', 'cost', 'price', 'origin', 'grade', 
                        'weight', 'wheight', 'size', 'brand', 'category', 'application', 'loc', 'location',
                        'main', 'sub', 'remarks', 'mkt', 'mkt.', 'market', 'ord.lvl', 'order level',
                        'models', 'model', 'qty', 'quantity', 'cons.qty', 'cons qty', 'consumption',
                        'hs code', 'hs_code', 'uom', 'smc', 'status', 'image'];
    
    // Strategy 1: Look for explicit "Models" and "Cons.Qty" column headers
    // In Excel, these might appear as separate columns with multiple values
    const modelColumnIndices = [];
    const qtyColumnIndices = [];
    
    // Get all column keys sorted to understand column order
    const sortedKeys = Object.keys(item).sort((a, b) => {
      // Try to maintain Excel column order if possible
      return a.localeCompare(b);
    });
    
    // Find columns that are explicitly named "Models" or "Cons.Qty"
    for (let i = 0; i < sortedKeys.length; i++) {
      const key = sortedKeys[i];
      const keyLower = key.toLowerCase();
      const value = String(item[key] || '').trim();
      
      // Check for explicit model column
      if ((keyLower === 'models' || keyLower === 'model') && value && modelPattern.test(value)) {
        modelColumnIndices.push({ index: i, key, value });
      }
      
      // Check for explicit quantity column
      if ((keyLower.includes('cons.qty') || keyLower.includes('cons qty') || 
           (keyLower.includes('qty') && !keyLower.includes('model'))) && 
          value && !isNaN(parseInt(value)) && parseInt(value) > 0) {
        qtyColumnIndices.push({ index: i, key, value: parseInt(value) });
      }
    }
    
    // Pair up explicit model and qty columns
    if (modelColumnIndices.length > 0 && qtyColumnIndices.length > 0) {
      // Match by proximity (closest qty to each model)
      for (const modelCol of modelColumnIndices) {
        // Find closest qty column
        let closestQty = null;
        let minDistance = Infinity;
        
        for (const qtyCol of qtyColumnIndices) {
          const distance = Math.abs(qtyCol.index - modelCol.index);
          if (distance < minDistance && distance <= 3) { // Within 3 columns
            minDistance = distance;
            closestQty = qtyCol;
          }
        }
        
        if (closestQty) {
          models.push({
            name: modelCol.value,
            qty_used: closestQty.value || 1
          });
        } else {
          // Model without nearby qty - use default
          models.push({
            name: modelCol.value,
            qty_used: 1
          });
        }
      }
    }
    
    // Strategy 2: Scan all values for model-like patterns
    // Models typically appear at the end of the row data
    // Look for patterns like: 140G, 966H, D8H, D9G, 950B, etc.
    const potentialModels = [];
    
    for (let i = 0; i < allValues.length; i++) {
      const [key, value] = allValues[i];
      const valueStr = String(value || '').trim();
      const keyLower = key.toLowerCase();
      
      // Skip if this is a known field
      if (skipFields.some(field => keyLower.includes(field))) {
        continue;
      }
      
      // Check if this looks like a model name
      // Models are typically: 2-10 chars, alphanumeric, may have dash
      // Examples: 140G, 966H, D8H, D9G, 950B, 950E, 966D, 966F-2, etc.
      if (valueStr && modelPattern.test(valueStr) && valueStr.length >= 2 && valueStr.length <= 10) {
        // Additional validation: should not be all numbers (that's likely a quantity)
        if (!/^\d+$/.test(valueStr)) {
          // Look for corresponding quantity in nearby columns
          let foundQty = 1; // Default quantity
          let qtyFound = false;
          
          // Check next 1-3 columns for quantity
          for (let j = i + 1; j < Math.min(i + 4, allValues.length); j++) {
            const [nextKey, nextValue] = allValues[j];
            const nextValueStr = String(nextValue || '').trim();
            const nextKeyLower = nextKey.toLowerCase();
            
            // Skip known non-quantity fields
            if (skipFields.some(field => nextKeyLower.includes(field))) {
              continue;
            }
            
            // Check if next value is a reasonable quantity (1-999)
            const numValue = parseInt(nextValueStr);
            if (!isNaN(numValue) && numValue > 0 && numValue < 1000) {
              // Additional check: if the key suggests it's a quantity
              if (nextKeyLower.includes('qty') || nextKeyLower.includes('quantity') || 
                  nextKeyLower.includes('cons') || 
                  (!nextKeyLower.includes('price') && !nextKeyLower.includes('cost') && 
                   !nextKeyLower.includes('weight') && !nextKeyLower.includes('size'))) {
                foundQty = numValue;
                qtyFound = true;
                break;
              }
            }
          }
          
          // Store potential model
          potentialModels.push({
            name: valueStr,
            qty_used: foundQty,
            index: i,
            hasQty: qtyFound
          });
        }
      }
    }
    
    // Add potential models that aren't duplicates
    for (const pm of potentialModels) {
      if (!models.find(m => m.name === pm.name)) {
        models.push({
          name: pm.name,
          qty_used: pm.qty_used
        });
      }
    }
    
    // Strategy 3: Look for sequential Model-Qty pairs
    // Sometimes models and quantities alternate in columns
    // Sort by index to process in order
    const sortedPotential = potentialModels.sort((a, b) => a.index - b.index);
    
    // If we found models but no quantities, try to find quantities in subsequent columns
    for (let i = 0; i < sortedPotential.length; i++) {
      const pm = sortedPotential[i];
      if (!pm.hasQty && i < sortedPotential.length - 1) {
        // Check if next potential model's index suggests it might be a quantity
        const next = sortedPotential[i + 1];
        if (next.index === pm.index + 1 && /^\d+$/.test(next.name)) {
          // Next value is all numbers - might be quantity for this model
          pm.qty_used = parseInt(next.name) || 1;
          pm.hasQty = true;
          // Remove the quantity from models list
          const qtyIndex = models.findIndex(m => m.name === next.name && /^\d+$/.test(m.name));
          if (qtyIndex >= 0) {
            models.splice(qtyIndex, 1);
          }
        }
      }
    }
    
    // Remove duplicates and return
    const uniqueModels = [];
    const seenNames = new Set();
    
    for (const model of models) {
      if (!seenNames.has(model.name)) {
        seenNames.add(model.name);
        uniqueModels.push(model);
      }
    }
    
    return uniqueModels;
  }
  
  // Read data rows - need to handle multi-row items (Part No row, SS Part No row, Origin/Grade row, then Models)
  let rowNumber = 0;
  let skippedRows = 0;
  let currentItem = null;
  let itemRowGroup = [];
  
  worksheet.eachRow((row, rowIdx) => {
    if (rowIdx <= headerRowIndex) return; // Skip header row(s)
    
    rowNumber++;
    const rowData = {};
    let hasData = false;
    
    // Read all cells in this row
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerName = headers[colNumber];
      if (headerName) {
        // Get cell value - use cell.text for better extraction of merged cell content
        let value = '';
        
        try {
          // Prefer cell.text as it handles merged cells and rich text better
          if (cell.text !== undefined && cell.text !== null) {
            value = String(cell.text).trim();
          } else if (cell.value !== null && cell.value !== undefined) {
            // Fallback to cell.value
            if (typeof cell.value === 'object') {
              // Handle rich text, formula result, or date
              if (cell.value.text) {
                value = cell.value.text;
              } else if (cell.value.result !== undefined) {
                value = cell.value.result;
              } else if (cell.value instanceof Date) {
                value = cell.value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              } else if (cell.value.richText) {
                // Rich text array - concatenate all text parts
                value = cell.value.richText.map(rt => rt.text || '').join('');
              } else {
                value = String(cell.value);
              }
            } else {
              value = String(cell.value);
            }
            value = String(value).trim();
          }
        } catch (e) {
          value = '';
        }
        
        // For cells with newlines (merged cells), extract meaningful data
        // For "Part No. SS Part No. Origin" column, extract the actual part numbers
        if (value.includes('\n')) {
          const lines = value.split('\n').map(l => l.trim()).filter(l => l);
          
          // If header contains "Part No", try to extract part numbers from lines
          // According to user: "Part No" = Master Part Number, "SS Part No" = Part Number
          if (headerName.toLowerCase().includes('part no')) {
            // Find lines that look like part numbers (alphanumeric, 3+ chars)
            // Filter out origin codes and header text
            const originCodes = ['PRC', 'CHN', 'USA', 'ITAL', 'JAP', 'JPN', 'GER', 'IND', 'TURK', 'TAIW', 'CAN', 'BRAZ', 'UK', 'LOC', 'LOCAL', 'IMPORT', 'PPR'];
            const partNoLines = lines.filter(line => {
              const lineUpper = line.toUpperCase();
              return /^[A-Z0-9\-]{3,}$/i.test(line) && 
                     !line.toLowerCase().includes('part no') &&
                     !line.toLowerCase().includes('origin') &&
                     !originCodes.includes(lineUpper) &&
                     line !== '-' &&
                     line.length <= 20;
            });
            
            if (partNoLines.length > 0) {
              // According to user: "Part No" = Master Part Number, "SS Part No" = Part Number
              // First valid line = Master Part No (goes to 'Part No' field)
              // Second valid line = SS Part No (goes to 'SS Part No' field)
              // Third line might be Origin
              const masterPartNo = partNoLines[0];
              const ssPartNo = partNoLines.length > 1 ? partNoLines[1] : partNoLines[0];
              
              // Extract origin from lines (third line or any line that's an origin code)
              const originCodes = ['PRC', 'CHN', 'USA', 'ITAL', 'JAP', 'JPN', 'GER', 'IND', 'TURK', 'TAIW', 'CAN', 'BRAZ', 'UK', 'LOC', 'LOCAL', 'IMPORT', 'PPR'];
              for (const line of lines) {
                const lineUpper = line.toUpperCase();
                if (originCodes.includes(lineUpper)) {
                  rowData['Origin'] = lineUpper;
                  break;
                }
              }
              
              // Store in the correct fields
              rowData['Part No'] = masterPartNo;
              rowData['SS Part No'] = ssPartNo;
              value = masterPartNo; // Use master for the cell value
            } else {
              // No valid part numbers found, use first non-header line
              const nonHeaderLines = lines.filter(line => 
                !line.toLowerCase().includes('part no') &&
                !line.toLowerCase().includes('origin') &&
                !line.toLowerCase().includes('desc') &&
                line.length > 0 &&
                line !== '-'
              );
              value = nonHeaderLines[0] || lines[0] || '';
            }
          } else if (headerName.toLowerCase().includes('desc') || headerName.toLowerCase().includes('description')) {
            // For Description column, join all meaningful lines
            const meaningfulLines = lines.filter(line => 
              line.length > 0 && 
              !line.toLowerCase().includes('desc. appl.') &&
              !line.toLowerCase().includes('grade') &&
              !line.toLowerCase().includes('ord.lvl') &&
              !line.toLowerCase().includes('wheight')
            );
            value = meaningfulLines.join(' ').trim() || lines.join(' ').trim() || '';
          } else {
            // For other columns, use first meaningful line or join if needed
            const meaningfulLines = lines.filter(line => 
              line.length > 0 && 
              !line.toLowerCase().includes('desc. appl.') &&
              !line.toLowerCase().includes('grade') &&
              !line.toLowerCase().includes('ord.lvl') &&
              !line.toLowerCase().includes('wheight')
            );
            // For multi-line values, join them (like description, application)
            if (headerName.toLowerCase().includes('application') || headerName.toLowerCase().includes('appl')) {
              value = meaningfulLines.join(' ').trim() || lines.join(' ').trim() || '';
            } else {
              value = meaningfulLines[0] || lines[0] || '';
            }
          }
        }
        
        if (value) {
          hasData = true;
        }
        
        rowData[headerName] = value;
      }
    });
    
    // Debug: Log raw row data for first few rows to understand structure
    if (rowIdx <= headerRowIndex + 5) {
      console.log(`\n   🔍 Debug Row ${rowIdx} - Raw data keys: ${Object.keys(rowData).slice(0, 5).join(', ')}`);
      Object.entries(rowData).slice(0, 3).forEach(([key, val]) => {
        console.log(`      ${key}: ${String(val).substring(0, 60)}`);
      });
    }
    
    // Check if this row has a Part No (Master Part Number) - this starts a new item
    // But first, validate it's not a header row (header rows contain "Part No" as label text)
    let masterPartNo = rowData['Part No'] || rowData['Part No.'] || rowData['part no'] || rowData['PART NO'] || '';
    masterPartNo = String(masterPartNo || '').trim();
    
    // Validate: Part No should be an actual part number (alphanumeric, 3+ chars), not header text
    // Header text would be like "Part No. SS Part No. Origin" or "Part No" as a label
    const isHeaderRow = masterPartNo.toLowerCase().includes('ss part') || 
                       masterPartNo.toLowerCase().includes('origin') ||
                       masterPartNo.toLowerCase() === 'part no' ||
                       masterPartNo.toLowerCase() === 'part no.' ||
                       (masterPartNo.length > 20 && masterPartNo.includes('\n')); // Multi-line header
    
    // Check if it's a valid part number pattern (alphanumeric, 3+ chars, not all common words)
    const isValidPartNo = masterPartNo && 
                          !isHeaderRow &&
                          /^[A-Z0-9\-]{3,}$/i.test(masterPartNo.replace(/\s/g, '')) &&
                          !masterPartNo.toLowerCase().includes('desc') &&
                          !masterPartNo.toLowerCase().includes('grade') &&
                          !masterPartNo.toLowerCase().includes('model');
    
    if (isValidPartNo) {
      // Save previous item if exists
      if (currentItem && itemRowGroup.length > 0) {
        // Merge all row data into one item
        const mergedItem = {};
        itemRowGroup.forEach(r => {
          Object.assign(mergedItem, r);
        });
        
        // Extract models from the merged data
        mergedItem.models = extractModelsFromItem(mergedItem);
        
        items.push(mergedItem);
      }
      
      // Start new item - extract the actual part number (might be in a cell with newlines)
      const cleanPartNo = masterPartNo.split('\n')[0].trim(); // Take first line if multi-line
      currentItem = { masterPartNo: cleanPartNo };
      itemRowGroup = [rowData];
    } else if (currentItem && hasData) {
      // This is a continuation row (SS Part No, Origin/Grade, or Models)
      itemRowGroup.push(rowData);
    } else if (hasData) {
      // Orphan row - might be a standalone item
      // Look for SS Part No or any valid part number pattern in the row
      let ssPartNo = rowData['SS Part No'] || rowData['SS Part No.'] || rowData['ss part no'] || '';
      ssPartNo = String(ssPartNo || '').trim();
      
      // Also check all values for a valid part number pattern
      let foundPartNo = null;
      if (ssPartNo && /^[A-Z0-9\-]{3,}$/i.test(ssPartNo.replace(/\s/g, '')) && 
          !ssPartNo.toLowerCase().includes('part no') && 
          !ssPartNo.toLowerCase().includes('desc')) {
        foundPartNo = ssPartNo;
      } else {
        // Scan all values for a valid part number
        for (const [key, value] of Object.entries(rowData)) {
          const val = String(value || '').trim();
          const keyLower = key.toLowerCase();
          
          // Skip if it's a known header field
          if (keyLower.includes('part no') || keyLower.includes('desc') || 
              keyLower.includes('grade') || keyLower.includes('model') ||
              keyLower.includes('origin') || keyLower.includes('cost') ||
              keyLower.includes('price')) {
            continue;
          }
          
          // Check if value looks like a part number (3+ alphanumeric chars)
          if (val && /^[A-Z0-9\-]{3,}$/i.test(val.replace(/\s/g, '')) && val.length <= 20) {
            foundPartNo = val;
            break;
          }
        }
      }
      
      if (foundPartNo) {
        // Extract models
        rowData.models = extractModelsFromItem(rowData);
        
        // Log model extraction for first few items
        if (items.length < 3 && rowData.models.length > 0) {
          console.log(`   🔍 Extracted ${rowData.models.length} model(s) for standalone item`);
          rowData.models.forEach((m, idx) => {
            console.log(`      Model ${idx + 1}: ${m.name} (Qty: ${m.qty_used})`);
          });
        }
        
        items.push(rowData);
      } else {
        skippedRows++;
        if (skippedRows <= 3) {
          console.log(`   Debug skipped row ${rowNumber}: ${JSON.stringify(Object.keys(rowData).slice(0, 5))}`);
        }
      }
    }
  });
  
    // Don't forget the last item
  if (currentItem && itemRowGroup.length > 0) {
    const mergedItem = {};
    itemRowGroup.forEach(r => {
      Object.assign(mergedItem, r);
    });
    mergedItem.models = extractModelsFromItem(mergedItem);
    
    // Log model extraction for first few items
    if (items.length < 3 && mergedItem.models.length > 0) {
      console.log(`   🔍 Extracted ${mergedItem.models.length} model(s) for item: ${mergedItem['Part No'] || mergedItem['SS Part No'] || 'Unknown'}`);
      mergedItem.models.forEach((m, idx) => {
        console.log(`      Model ${idx + 1}: ${m.name} (Qty: ${m.qty_used})`);
      });
    }
    
    items.push(mergedItem);
  }
  
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
      // But exclude header rows
      const allValues = Object.values(item).join(' ');
      const allValuesLower = allValues.toLowerCase();
      
      // Skip if it looks like a header row
      const isHeaderRow = allValuesLower.includes('part no') && 
                         (allValuesLower.includes('ss part') || 
                          allValuesLower.includes('origin') ||
                          allValuesLower.includes('desc. appl.') ||
                          allValuesLower.includes('models cons.qty'));
      
      if (hasData && !isHeaderRow && /[A-Z0-9]{3,}/i.test(allValues)) {
        // Try to map to expected fields based on position
        // Extract actual part number (not header text)
        let partNo = item.Col1 || item.Col2 || '';
        partNo = String(partNo).trim();
        
        // Clean part number - take first line if multi-line, remove header text
        if (partNo.includes('\n')) {
          const lines = partNo.split('\n');
          partNo = lines.find(line => /^[A-Z0-9\-]{3,}$/i.test(line.trim())) || lines[0].trim();
        }
        
        // Validate it's a real part number, not header text
        if (partNo && /^[A-Z0-9\-]{3,}$/i.test(partNo) && 
            !partNo.toLowerCase().includes('part no') &&
            !partNo.toLowerCase().includes('desc') &&
            partNo.length <= 20) {
          const mappedItem = {
            'Part No': partNo,
            'Master Part No': partNo,
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
          
          items.push(mappedItem);
          if (items.length <= 3) {
            console.log(`   Found item via alternative method: ${partNo}`);
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
 * Parse numeric value from string, handling commas, decimals, and preserving 0
 * Returns: number if valid (including 0), null if empty/invalid
 * Handles:
 * - PKR format with commas: "47,000" -> 47000
 * - Decimal values: "0.2267" -> 0.2267
 * - Zero values: "0", "0.000" -> 0 (preserved, not null)
 * - Empty strings: "" -> null
 * - Text values: "Mkt.Price" -> null
 */
function parseNumericValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convert to string
  let str = String(value).trim();
  
  // Handle empty string
  if (str === '' || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'na') {
    return null;
  }
  
  // Handle "Mkt.Price" or similar text values (but allow if it's just a number with "mkt" in context)
  // If the entire value is just text about market, return null
  if (str.toLowerCase() === 'mkt.price' || str.toLowerCase() === 'market price' || 
      (str.toLowerCase().includes('mkt') && !/\d/.test(str))) {
    return null; // Market price text - set to null, will be handled separately
  }
  
  // Remove commas (PKR format: 47,000 or 1,440.000)
  str = str.replace(/,/g, '');
  
  // Remove any currency symbols (Rs, PKR, $, etc.) but keep numbers, dots, and minus
  str = str.replace(/[^\d.-]/g, '');
  
  // Handle cases where we might have multiple dots (invalid)
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount > 1) {
    // Keep only the first dot (for decimals)
    const firstDot = str.indexOf('.');
    str = str.substring(0, firstDot + 1) + str.substring(firstDot + 1).replace(/\./g, '');
  }
  
  // Parse as float to handle decimals (preserves 0.000 as 0)
  const num = parseFloat(str);
  
  // Return number if valid (including 0), null if NaN
  // Important: 0 is a valid value and should be preserved
  if (!isNaN(num)) {
    return num;
  }
  
  return null;
}

/**
 * Normalize field names from Excel headers
 */
function normalizeItem(item) {
  // Map Excel column names to normalized field names
  const normalized = {};
  
  // Extract part numbers - use the same logic as preview for consistency
  let masterPartNo = '';
  let ssPartNo = '';
  
  // Strategy 1: Look in standard field names (these are set during Excel reading)
  let partNo = item['Part No'] || item['Part No.'] || item['part no'] || item['PART NO'] || '';
  let ssPartNoField = item['SS Part No'] || item['SS Part No.'] || item['ss part no'] || item['SS PART NO'] || '';
  
  // Clean part number (remove newlines, extract actual part number)
  if (partNo && typeof partNo === 'string') {
    partNo = partNo.split('\n')[0].trim();
    // If it still contains header text, try to extract actual part number
    if (partNo.toLowerCase().includes('part no') || partNo.length > 30) {
      // Look for part number pattern in the string
      const partNoMatch = partNo.match(/[A-Z0-9\-]{3,}/i);
      partNo = partNoMatch ? partNoMatch[0] : '';
    }
    // Validate it's a real part number (not origin code, not field name)
    if (partNo && /^[A-Z0-9\-]{3,}$/i.test(partNo) && 
        !partNo.toLowerCase().includes('part no') &&
        !partNo.toLowerCase().includes('origin') &&
        !partNo.toLowerCase().includes('desc') &&
        partNo.length <= 20) {
      masterPartNo = partNo;
    }
  }
  
  // Clean SS part number
  if (ssPartNoField && typeof ssPartNoField === 'string') {
    ssPartNoField = ssPartNoField.split('\n')[0].trim();
    if (ssPartNoField && /^[A-Z0-9\-]{3,}$/i.test(ssPartNoField) && 
        !ssPartNoField.toLowerCase().includes('part no') &&
        !ssPartNoField.toLowerCase().includes('origin') &&
        ssPartNoField.length <= 20 && ssPartNoField !== '-') {
      ssPartNo = ssPartNoField;
    }
  }
  
  // Strategy 2: If we don't have part numbers yet, scan all values (like preview does)
  if (!masterPartNo) {
    for (const [key, value] of Object.entries(item)) {
      if (key.toLowerCase().includes('part') || key.toLowerCase().includes('model')) continue;
      const val = String(value || '').trim();
      if (val && /^[A-Z0-9\-]{3,}$/i.test(val) && val.length <= 20 && 
          !val.toLowerCase().includes('desc') && 
          !val.toLowerCase().includes('grade') &&
          !val.toLowerCase().includes('origin') &&
          !['PRC', 'CHN', 'USA', 'ITAL', 'JAP', 'JPN', 'GER', 'IND', 'TURK', 'TAIW', 'CAN', 'BRAZ', 'UK', 'LOC', 'LOCAL', 'IMPORT', 'PPR'].includes(val.toUpperCase()) &&
          val !== '-') {
        // Prefer values with numbers (more likely to be part numbers)
        if (/[0-9]/.test(val)) {
          masterPartNo = val;
          break;
        } else if (!masterPartNo && val.length >= 5) {
          masterPartNo = val;
        }
      }
    }
  }
  
  // Map according to user's instructions:
  // "Part No" (first line) = Master Part Number
  // "SS Part No" (second line) = Part Number (the actual part number to use)
  normalized.master_part_no = masterPartNo;
  
  // Part Number should be SS Part No if available, otherwise use Master Part No
  // But according to user: SS Part No IS the Part Number
  normalized.part_no = ssPartNo || masterPartNo || '';
  
  // If we have master but no part_no, use master for both
  if (normalized.master_part_no && !normalized.part_no) {
    normalized.part_no = normalized.master_part_no;
  }
  
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
  let totalModelsImported = 0; // Track total models imported
  let partsWithModels = 0; // Track parts that have models
  
  for (let idx = 0; idx < items.length; idx++) {
    const rawItem = items[idx];
    
    const item = normalizeItem(rawItem);
    
    // Preserve models array from rawItem (extracted during Excel reading)
    if (rawItem.models && Array.isArray(rawItem.models)) {
      item.models = rawItem.models;
    }
    
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
      // Parse numeric values properly (handle commas, preserve 0, handle empty)
      const parsedWeight = parseNumericValue(item.weight);
      const parsedReorderLevel = parseNumericValue(item.order_level);
      const parsedCost = parseNumericValue(item.cost);
      const parsedPriceA = parseNumericValue(item.price_a);
      const parsedPriceB = parseNumericValue(item.price_b);
      
      // Debug: Log what we're extracting for first item
      if (idx === 0) {
        console.log(`\n   🔍 Debug - Extracted data for item 1:`);
        console.log(`      master_part_no: "${item.master_part_no}"`);
        console.log(`      part_no: "${item.part_no}"`);
        console.log(`      description: "${item.description}"`);
        console.log(`      origin: "${item.origin}"`);
        console.log(`      brand: "${item.brand}"`);
        console.log(`      models: ${item.models ? JSON.stringify(item.models) : 'none'}`);
      }
      
      const payload = {
        master_part_no: item.master_part_no || '',
        part_no: item.part_no || `ITEM_${idx + 1}`,
        brand_name: item.brand || '',
        description: item.description || '',
        category_id: item.main_category || '', // Main Category maps to category_id
        subcategory_id: item.sub_category || '',
        application_id: item.application || '',
        size: item.size || '',
        uom: 'pcs',
        status: 'active',
      };
      
      // Add numeric fields only if they have values (including 0)
      if (parsedWeight !== null) {
        payload.weight = parsedWeight;
      }
      if (parsedReorderLevel !== null) {
        payload.reorder_level = parsedReorderLevel;
      }
      if (parsedCost !== null) {
        payload.cost = parsedCost;
      }
      if (parsedPriceA !== null) {
        payload.price_a = parsedPriceA;
      }
      if (parsedPriceB !== null) {
        payload.price_b = parsedPriceB;
      }
      
      // Add origin and grade as separate fields (if they exist in the API)
      if (normalizedOrigin) {
        payload.origin = normalizedOrigin;
      }
      if (normalizedGrade) {
        payload.grade = normalizedGrade;
      }
      
      // Handle models if provided - use extracted models array from item
      // Models are extracted during the readItemsFromExcel phase
      if (item.models && Array.isArray(item.models) && item.models.length > 0) {
        // Clean and validate models
        payload.models = item.models
          .map(m => {
            const modelName = String(m.name || m || '').trim();
            const qty = parseInt(m.qty_used || m.qty || m.qtyUsed || 1) || 1;
            
            // Only include valid model names (non-empty, reasonable length)
            if (modelName && modelName.length >= 1 && modelName.length <= 50) {
              return {
                name: modelName,
                qty_used: qty > 0 ? qty : 1 // Ensure positive quantity
              };
            }
            return null;
          })
          .filter(m => m !== null); // Remove invalid models
        
        // Log models for debugging
        if (payload.models.length > 0 && idx < 3) {
          console.log(`   📦 Part ${idx + 1} has ${payload.models.length} model(s): ${payload.models.map(m => `${m.name} (qty: ${m.qty_used})`).join(', ')}`);
        }
        
        // Track model statistics
        if (payload.models && payload.models.length > 0) {
          totalModelsImported += payload.models.length;
          partsWithModels++;
        }
      } else if (item.model && String(item.model).trim()) {
        // Fallback: single model field (if extraction didn't work)
        const modelName = String(item.model).trim();
        if (modelName) {
          payload.models = [{
            name: modelName,
            qty_used: parseInt(item.quantity || item.qty || item.cons_qty || 1) || 1
          }];
        }
      }
      
      // If no models found, that's okay - some parts don't have models
      // Don't set payload.models to empty array, let API handle it
      
      // Numeric fields are already parsed and validated above
      // No need for additional conversion - they're already numbers or null
      
      // Remove empty strings (but preserve models array and required fields)
      // part_no is required, so never delete it
      Object.keys(payload).forEach(key => {
        if (key === 'models' || key === 'part_no' || key === 'master_part_no') return; // Don't delete these
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      // Ensure part_no is always set (required field)
      if (!payload.part_no || payload.part_no === '') {
        payload.part_no = payload.master_part_no || `ITEM_${idx + 1}`;
      }
      
      // Ensure master_part_no is set (required for masterPartId lookup)
      if (!payload.master_part_no || payload.master_part_no === '') {
        payload.master_part_no = payload.part_no;
      }
      
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
        const errorText = await response.text();
        let isDuplicate = false;
        try {
          const errorJson = JSON.parse(errorText);
          const errorStr = JSON.stringify(errorJson);
          // Check if it's a duplicate/unique constraint error
          if (errorStr.includes('Unique constraint') || errorStr.includes('partNo') || errorStr.includes('already exists')) {
            isDuplicate = true;
            console.log(`  ⚠️  Item ${idx + 1} (${item.part_no}) already exists, skipping...`);
          }
        } catch {
          if (errorText.includes('Unique constraint') || errorText.includes('partNo') || errorText.includes('already exists')) {
            isDuplicate = true;
            console.log(`  ⚠️  Item ${idx + 1} (${item.part_no}) already exists, skipping...`);
          }
        }
        
        if (!isDuplicate) {
          errorCount++;
          let errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg += ` - ${JSON.stringify(errorJson).substring(0, 200)}`;
          } catch {
            errorMsg += ` - ${errorText.substring(0, 200)}`;
          }
          errors.push(errorMsg);
          if (errorCount <= 10) {
            console.log(`  ❌ Error item ${idx + 1} (${item.part_no}): ${response.status}`);
          }
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
  console.log(`   ✅ Successfully imported: ${successCount} items`);
  console.log(`   ❌ Failed to import: ${errorCount} items`);
  console.log(`   📦 Models imported: ${totalModelsImported} model associations`);
  console.log(`   📊 Parts with models: ${partsWithModels} out of ${successCount} parts`);
  
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
    
    // TEST MODE: Import only first 5 items
    const TEST_MODE = false; // Disabled to import all items
    const TEST_LIMIT = 5;
    
    let itemsToImport = items;
    if (TEST_MODE && items.length > TEST_LIMIT) {
      // STRICT LIMIT: Only import exactly TEST_LIMIT items with VALID part numbers
      // Continue searching until we find TEST_LIMIT unique valid items
      const validItems = [];
      const seenPartNos = new Set();
      
      for (const item of items) {
        // Extract part number to validate
        let partNo = item['Part No'] || item['Part No.'] || item['part no'] || 
                     item['SS Part No'] || item['SS Part No.'] || item['ss part no'] ||
                     item['Master Part No'] || item['master part no'] || '';
        
        // Clean part number
        if (partNo && typeof partNo === 'string') {
          partNo = partNo.split('\n')[0].trim();
          if (partNo.toLowerCase().includes('part no') || partNo.length > 30) {
            const partNoMatch = partNo.match(/[A-Z0-9\-]{3,}/i);
            partNo = partNoMatch ? partNoMatch[0] : '';
          }
        }
        
        // Only include items with valid part numbers (not empty, not "Unknown")
        // Also check for duplicates using Set for faster lookup
        if (partNo && partNo !== 'Unknown' && /^[A-Z0-9\-]{3,}$/i.test(partNo) && partNo.length <= 20) {
          if (!seenPartNos.has(partNo)) {
            seenPartNos.add(partNo);
            validItems.push(item);
            if (validItems.length >= TEST_LIMIT) break;
          }
        }
      }
      
      itemsToImport = validItems.length > 0 ? validItems : items.slice(0, TEST_LIMIT);
      console.log(`\n🧪 TEST MODE: Importing ONLY ${itemsToImport.length} items with valid part numbers`);
      console.log(`   (Total items available: ${items.length})`);
      console.log(`\n📋 Items to import:`);
      itemsToImport.forEach((item, idx) => {
        // Try multiple ways to find part number
        let partNo = item['Part No'] || item['Part No.'] || item['part no'] || 
                     item['SS Part No'] || item['SS Part No.'] || item['ss part no'] ||
                     item['Master Part No'] || item['master part no'] || '';
        
        // Clean part number (remove newlines, take first line)
        if (partNo && typeof partNo === 'string') {
          partNo = partNo.split('\n')[0].trim();
          // If it still contains header text, try to extract actual part number
          if (partNo.toLowerCase().includes('part no') || partNo.length > 30) {
            // Look for part number pattern in the string
            const partNoMatch = partNo.match(/[A-Z0-9\-]{3,}/i);
            partNo = partNoMatch ? partNoMatch[0] : 'Unknown';
          }
        }
        
        if (!partNo || partNo === '') {
          // Last resort: scan all values for a part number pattern
          for (const [key, value] of Object.entries(item)) {
            if (key.toLowerCase().includes('part') || key.toLowerCase().includes('model')) continue;
            const val = String(value || '').trim();
            if (val && /^[A-Z0-9\-]{3,}$/i.test(val) && val.length <= 20 && 
                !val.toLowerCase().includes('desc') && !val.toLowerCase().includes('grade')) {
              partNo = val;
              break;
            }
          }
        }
        
        const desc = item['Description'] || item['Desc'] || item['description'] || '';
        const models = item.models || [];
        console.log(`   ${idx + 1}. Part No: ${partNo || 'Unknown'} | Desc: ${String(desc).substring(0, 40)}${String(desc).length > 40 ? '...' : ''} | Models: ${models.length}`);
        if (models.length > 0 && idx < 3) {
          console.log(`      Models: ${models.map(m => `${m.name} (qty: ${m.qty_used})`).join(', ')}`);
        }
      });
    }
    
    console.log("   Columns expected:");
    console.log("   - Master Part No, Part No, Origin, Description");
    console.log("   - Application, Grade, Order Level, Weight");
    console.log("   - Main Category, Sub Category, Size, Brand");
    console.log("   - Cost, Price A, Price B, Models, Cons.Qty");
    
    // Step 2: Import to app
    console.log("\n" + "=".repeat(60));
    console.log("Starting import...");
    console.log("=".repeat(60));
    
    await importItemsToApp(itemsToImport);
    
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

