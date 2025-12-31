/**
 * Convert CTC Item Lists.pdf to Excel with ALL required columns
 * Extracts: part no., ss part no, origin, decc, application grade, main, sub, size, brand, remarks, loc, cost, mkt, price a, price b, model, qty
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const PDF_PATH = path.join(__dirname, 'CTC Item Lists.pdf');
const EXCEL_PATH = path.join(__dirname, 'CTC Item Lists.xlsx');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

// Required columns in exact order
const REQUIRED_COLUMNS = [
  'part no.',
  'ss part no',
  'origin',
  'decc',
  'application grade',
  'main',
  'sub',
  'size',
  'brand',
  'remarks',
  'loc',
  'cost',
  'mkt',
  'price a',
  'price b',
  'model',
  'qty'
];

/**
 * Normalize header names to match required columns
 */
function normalizeHeader(header) {
  if (!header) return null;
  
  const headerLower = String(header).toLowerCase().trim();
  
  const mappings = {
    'part no': 'part no.',
    'part no.': 'part no.',
    'part number': 'part no.',
    'part#': 'part no.',
    'part #': 'part no.',
    'ss part no': 'ss part no',
    'ss part no.': 'ss part no',
    'ss part number': 'ss part no',
    'origin': 'origin',
    'decc': 'decc',
    'desc': 'decc',
    'description': 'decc',
    'application grade': 'application grade',
    'app grade': 'application grade',
    'grade': 'application grade',
    'application': 'application grade',
    'main': 'main',
    'main category': 'main',
    'sub': 'sub',
    'subcategory': 'sub',
    'sub category': 'sub',
    'size': 'size',
    'brand': 'brand',
    'brand name': 'brand',
    'remarks': 'remarks',
    'remark': 'remarks',
    'loc': 'loc',
    'location': 'loc',
    'cost': 'cost',
    'mkt': 'mkt',
    'market': 'mkt',
    'price a': 'price a',
    'pricea': 'price a',
    'price_a': 'price a',
    'price b': 'price b',
    'priceb': 'price b',
    'price_b': 'price b',
    'model': 'model',
    'qty': 'qty',
    'quantity': 'qty',
  };
  
  for (const [key, value] of Object.entries(mappings)) {
    if (headerLower.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract text from PDF using pdfjs-dist
 */
async function extractTextFromPDF() {
  console.log('\n' + '='.repeat(60));
  console.log('📄 EXTRACTING TEXT FROM PDF');
  console.log('='.repeat(60) + '\n');
  
  if (fs.existsSync(TEXT_PATH)) {
    console.log('   📄 Using existing extracted text file...');
    const text = fs.readFileSync(TEXT_PATH, 'utf-8');
    console.log(`   ✅ Read ${text.length} characters\n`);
    return text;
  }
  
  console.log('   ⚠️  Extracting from PDF...');
  try {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    const pdfBytes = fs.readFileSync(PDF_PATH);
    const loadingTask = pdfjs.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    console.log(`   ✅ PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Preserve position information for better parsing
      const pageText = textContent.items.map(item => {
        const x = item.transform ? item.transform[4] : 0;
        const y = item.transform ? item.transform[5] : 0;
        return { text: item.str, x, y };
      });
      
      // Sort by Y position (top to bottom), then X (left to right)
      pageText.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 5) {
          return b.y - a.y; // Higher Y first (top to bottom)
        }
        return a.x - b.x; // Left to right
      });
      
      const pageTextStr = pageText.map(item => item.text).join(' ');
      fullText += pageTextStr + '\n';
      
      if (i % 10 === 0) {
        console.log(`   ⏳ Extracted ${i}/${pdf.numPages} pages...`);
      }
    }
    
    fs.writeFileSync(TEXT_PATH, fullText);
    console.log(`   ✅ Extracted text from ${pdf.numPages} pages\n`);
    return fullText;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * Parse items from text with all required columns
 */
function parseItemsFromText(text) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PARSING ITEMS FROM TEXT');
  console.log('='.repeat(60) + '\n');
  
  const items = [];
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Find header row
  let headerIndex = -1;
  let columnMapping = {};
  
  for (let i = 0; i < Math.min(200, lines.length); i++) {
    const line = lines[i].toLowerCase();
    
    // Check if this line contains multiple column headers
    if (line.includes('part no') && (line.includes('origin') || line.includes('brand') || line.includes('cost'))) {
      headerIndex = i;
      console.log(`   ✅ Found header at line ${i + 1}`);
      
      // Try to parse headers from this line
      const headerLine = lines[i];
      const headers = headerLine.split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h);
      
      headers.forEach((header, idx) => {
        const normalized = normalizeHeader(header);
        if (normalized) {
          columnMapping[idx] = normalized;
        }
      });
      
      console.log(`   📊 Mapped columns: ${Object.values(columnMapping).join(', ')}`);
      break;
    }
  }
  
  // If no header found, try pattern-based extraction
  if (headerIndex === -1) {
    console.log('   ⚠️  No clear header found, using pattern-based extraction...\n');
    return parseItemsByPattern(lines);
  }
  
  // Parse data rows - also check adjacent lines for model/qty
  let currentRow = {};
  let rowCount = 0;
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers and empty lines
    if (!line || line.match(/^(Page|\d+)\s+of\s+\d+$/i) || line.length < 3) {
      continue;
    }
    
    // Split line by multiple spaces or tabs
    const values = line.split(/\s{2,}|\t/).map(v => v.trim()).filter(v => v);
    
    if (values.length === 0) continue;
    
    // Try to match values to columns
    const rowData = {};
    let hasData = false;
    
    // Check if this looks like a data row (has part number pattern)
    const hasPartNo = /\b([0-9]{4,15}|[A-Z0-9\-]{4,15})\b/.test(line);
    const hasPrice = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/.test(line);
    
    if (hasPartNo || hasPrice) {
      // Try to extract data using column mapping
      values.forEach((value, idx) => {
        if (idx in columnMapping) {
          const colName = columnMapping[idx];
          rowData[colName] = value;
          hasData = true;
        }
      });
      
      // Also try pattern-based extraction for this line
      const patternData = extractDataByPattern(line);
      Object.assign(rowData, patternData);
      
      // Check next 2 lines for model/qty (they might be on separate lines)
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        if (nextLine && nextLine.length > 3) {
          const nextLineData = extractDataByPattern(nextLine);
          // Only extract model/qty from next lines, not other data
          if (nextLineData['model'] && !rowData['model']) {
            rowData['model'] = nextLineData['model'];
          }
          if (nextLineData['qty'] && !rowData['qty']) {
            rowData['qty'] = nextLineData['qty'];
          }
        }
      }
      
      if (hasData || Object.keys(patternData).length > 0) {
        // Ensure all required columns exist
        const completeRow = {};
        REQUIRED_COLUMNS.forEach(col => {
          completeRow[col] = rowData[col] || '';
        });
        
        items.push(completeRow);
        rowCount++;
        
        // If model or qty exists, create duplicate row with same data (as requested)
        if (completeRow['model'] || completeRow['qty']) {
          // The data is already in the row, no need to duplicate
          // But if user wants separate rows, we could add that here
        }
        
        if (rowCount % 100 === 0) {
          console.log(`   ⏳ Parsed ${rowCount} items...`);
        }
      }
    }
  }
  
  console.log(`   ✅ Parsed ${items.length} items\n`);
  return items;
}

/**
 * Parse items using pattern matching when headers are not clear
 */
function parseItemsByPattern(lines) {
  const items = [];
  let rowCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers and headers
    if (!line || line.match(/^(Page|\d+)\s+of\s+\d+$/i) || line.length < 3) {
      continue;
    }
    
    // Check if line has data (part number or price)
    const hasPartNo = /\b([0-9]{4,15}|[A-Z0-9\-]{4,15})\b/.test(line);
    const hasPrice = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/.test(line);
    
    if (hasPartNo || hasPrice) {
      const rowData = extractDataByPattern(line);
      
      // Check next 2 lines for model/qty
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        if (nextLine && nextLine.length > 3) {
          const nextLineData = extractDataByPattern(nextLine);
          if (nextLineData['model'] && !rowData['model']) {
            rowData['model'] = nextLineData['model'];
          }
          if (nextLineData['qty'] && !rowData['qty']) {
            rowData['qty'] = nextLineData['qty'];
          }
        }
      }
      
      // Only add if we have meaningful data
      if (rowData['part no.'] || rowData['ss part no'] || Object.keys(rowData).length >= 3) {
        // Ensure all required columns exist
        const completeRow = {};
        REQUIRED_COLUMNS.forEach(col => {
          completeRow[col] = rowData[col] || '';
        });
        
        items.push(completeRow);
        rowCount++;
        
        if (rowCount % 100 === 0) {
          console.log(`   ⏳ Parsed ${rowCount} items...`);
        }
      }
    }
  }
  
  return items;
}

/**
 * Extract data from a line using pattern matching
 */
function extractDataByPattern(line) {
  const rowData = {};
  
  // Extract part numbers
  const partNoMatch = line.match(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5}|[A-Z0-9\-]{4,15})\b/);
  if (partNoMatch) {
    rowData['part no.'] = partNoMatch[1];
    
    // Look for second part number (SS part no)
    const secondPartNoMatch = line.substring(partNoMatch.index + partNoMatch[0].length).match(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5}|[A-Z0-9\-]{4,15})\b/);
    if (secondPartNoMatch && secondPartNoMatch[1] !== partNoMatch[1]) {
      rowData['ss part no'] = secondPartNoMatch[1];
    }
  }
  
  // Extract origin (country codes)
  const originMatch = line.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY)\b/i);
  if (originMatch) {
    rowData['origin'] = originMatch[1].toUpperCase();
  }
  
  // Extract description (text after part numbers, before prices)
  const descMatch = line.match(/\b([A-Z][A-Za-z\s\(\)0-9\-\/]{10,100})\b/);
  if (descMatch) {
    let desc = descMatch[1].trim();
    // Clean up - remove part numbers and prices
    desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '').trim();
    desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
    if (desc.length > 5) {
      rowData['decc'] = desc.substring(0, 200);
    }
  }
  
  // Extract application/grade
  const appMatch = line.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE)\b/i);
  if (appMatch) {
    rowData['application grade'] = appMatch[1].toUpperCase();
  }
  
  // Extract grade (A, B, C)
  const gradeMatch = line.match(/\b([ABC])\b/);
  if (gradeMatch) {
    rowData['application grade'] = (rowData['application grade'] || '') + ' ' + gradeMatch[1];
  }
  
  // Extract main category
  const mainCatMatch = line.match(/\b(ENGINE[- ]PARTS|TRANSMISSION[- ]PARTS|VEHICLE[- ]PARTS|GASKET[- ]KIT|PUMPS|UNDER[- ]CARRIAGE|G\.E\.T|HYDRAULIC[- ]FILTER|SEAL[- ][A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
  if (mainCatMatch) {
    rowData['main'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Extract sub category
  const subCatMatch = line.match(/\b(BEARINGS|SEAL[- ][A-Z]+|GASKET|FILTER|SEAL[- ]ASSLY|SEAL[- ]OIL|SEAL[- ]PACKING|SEAL[- ]RING|SEAL[- ]CRANKSHAFT|SEAL[- ]O[- ]RING)\b/i);
  if (subCatMatch) {
    rowData['sub'] = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Extract size
  const sizeMatch = line.match(/\b(\d+X\d+X\d+|\d+X\d+MM?|\d+MM?X\d+MM?|\d+\.\d+X\d+\.\d+)\b/i);
  if (sizeMatch) {
    rowData['size'] = sizeMatch[1];
  }
  
  // Extract brand
  const brandMatch = line.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|CTC|NTN|FAG|TIMKEN|SKF)\b/i);
  if (brandMatch) {
    rowData['brand'] = brandMatch[1].toUpperCase();
  }
  
  // Extract remarks (look for text in parentheses or after certain keywords)
  const remarksMatch = line.match(/\(([^)]+)\)/);
  if (remarksMatch) {
    rowData['remarks'] = remarksMatch[1];
  }
  
  // Extract location
  const locMatch = line.match(/\b(LOC|LOCATION)[:\s]+([A-Z0-9\-]+)\b/i);
  if (locMatch) {
    rowData['loc'] = locMatch[2];
  }
  
  // Extract prices and cost
  const numbers = line.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (numbers) {
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n >= 0 && n < 10000000);
    
    // Cost - usually smaller, first reasonable number (50-100000)
    const costIndex = nums.findIndex(n => n >= 50 && n < 100000);
    if (costIndex >= 0) {
      rowData['cost'] = nums[costIndex].toString();
    }
    
    // MKT - market price (usually between cost and price a)
    const mktIndex = nums.findIndex((n, i) => i > costIndex && n >= 100 && n < 1000000);
    if (mktIndex >= 0) {
      rowData['mkt'] = nums[mktIndex].toString();
    }
    
    // Price A - usually larger than cost (100-1000000)
    const priceAIndex = nums.findIndex((n, i) => i > (mktIndex >= 0 ? mktIndex : costIndex) && n >= 100 && n < 1000000 && n > (parseFloat(rowData['cost']) || 0));
    if (priceAIndex >= 0) {
      rowData['price a'] = nums[priceAIndex].toString();
    }
    
    // Price B - usually after Price A (100-1000000)
    const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n >= 100 && n < 1000000);
    if (priceBIndex >= 0) {
      rowData['price b'] = nums[priceBIndex].toString();
    }
  }
  
  // Extract model - try various patterns
  const modelPatterns = [
    /\b(MODEL|MDL)[:\s]+([A-Z0-9\-]+)\b/i,
    /\bMODEL\s+([A-Z0-9\-]{2,20})\b/i,
    /\b([A-Z]{2,4}\d{2,6})\b/, // Pattern like CAT320, KOM200, etc.
  ];
  
  for (const pattern of modelPatterns) {
    const modelMatch = line.match(pattern);
    if (modelMatch) {
      rowData['model'] = modelMatch[modelMatch.length - 1].toUpperCase();
      break;
    }
  }
  
  // Extract quantity - try various patterns
  const qtyPatterns = [
    /\b(QTY|QTY\.|QUANTITY)[:\s]+(\d+)\b/i,
    /\bQTY[:\s]+(\d+)\b/i,
    /\b(\d+)\s*(?:PCS|PCS\.|PIECES|UNITS?)\b/i,
  ];
  
  for (const pattern of qtyPatterns) {
    const qtyMatch = line.match(pattern);
    if (qtyMatch) {
      rowData['qty'] = qtyMatch[qtyMatch.length - 1];
      break;
    }
  }
  
  return rowData;
}

/**
 * Save items to Excel file
 */
async function saveToExcel(items, excelPath) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SAVING TO EXCEL');
  console.log('='.repeat(60) + '\n');
  
  if (items.length === 0) {
    console.log('   ⚠️  No items to save!');
    return false;
  }
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');
  
  // Set column headers
  worksheet.columns = REQUIRED_COLUMNS.map(col => ({
    header: col,
    key: col,
    width: col.length + 5
  }));
  
  // Add data rows
  items.forEach(item => {
    worksheet.addRow(item);
  });
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  await workbook.xlsx.writeFile(excelPath);
  
  console.log(`   ✅ Excel file created: ${excelPath}`);
  console.log(`   📊 Rows: ${items.length}`);
  console.log(`   📏 Columns: ${REQUIRED_COLUMNS.length}`);
  console.log(`   📋 Columns: ${REQUIRED_COLUMNS.join(', ')}\n`);
  
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PDF TO EXCEL CONVERTER');
  console.log('='.repeat(60));
  
  try {
    // Extract text from PDF
    const text = await extractTextFromPDF();
    
    // Parse items from text
    const items = parseItemsFromText(text);
    
    if (items.length === 0) {
      console.error('\n❌ No items extracted from PDF!');
      process.exit(1);
    }
    
    // Save to Excel
    const success = await saveToExcel(items, EXCEL_PATH);
    
    if (success) {
      console.log('='.repeat(60));
      console.log('✅ CONVERSION COMPLETE');
      console.log('='.repeat(60));
      console.log(`   📄 PDF: ${PDF_PATH}`);
      console.log(`   📊 Excel: ${EXCEL_PATH}`);
      console.log(`   📈 Total Items: ${items.length}`);
      console.log('='.repeat(60) + '\n');
    } else {
      console.error('\n❌ Failed to save Excel file!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main().catch(console.error);

