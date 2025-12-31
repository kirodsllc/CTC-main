/**
 * Convert PDF to JSON with ACCURATE columnar parsing
 * Each line has multiple columns, and items align by column index
 */

const fs = require('fs');
const path = require('path');

const PDF_PATH = path.join(__dirname, 'CTC Item Lists.pdf');
const JSON_PATH = path.join(__dirname, 'CTC Item Lists.json');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

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
 * Extract text from PDF
 */
async function extractTextFromPDF() {
  if (fs.existsSync(TEXT_PATH)) {
    return fs.readFileSync(TEXT_PATH, 'utf-8');
  }
  
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const pdfBytes = fs.readFileSync(PDF_PATH);
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  fs.writeFileSync(TEXT_PATH, fullText);
  return fullText;
}

/**
 * Parse columnar structure - extract items by column index
 */
function parseColumnarStructure(text) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PARSING COLUMNAR STRUCTURE');
  console.log('='.repeat(60) + '\n');
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 20);
  const allItems = [];
  
  console.log(`   📄 Processing ${lines.length} lines...\n`);
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    
    // Skip headers and page numbers
    if (line.match(/^Page\s+\d+\s+of\s+\d+$/i)) continue;
    if (line.match(/PARTS LIST/i)) continue;
    if (line.match(/^Part No\.\s+Part No\./i)) continue;
    
    // Parse this line as columnar data
    const items = parseLineAsColumns(line, lineIdx, lines);
    allItems.push(...items);
    
    if ((lineIdx + 1) % 50 === 0) {
      console.log(`   ⏳ Processed ${lineIdx + 1} lines, extracted ${allItems.length} items...`);
    }
  }
  
  // Remove duplicates based on part no + ss part no combination
  const uniqueItems = [];
  const seen = new Set();
  
  for (const item of allItems) {
    const key = `${item['part no.'] || ''}_${item['ss part no'] || ''}`;
    if (key && key !== '_' && !seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }
  
  console.log(`   ✅ Extracted ${uniqueItems.length} unique items\n`);
  return uniqueItems;
}

/**
 * Parse a single line as columnar data
 * Structure: Part No columns, SS Part No columns, Desc columns, Origin columns, etc.
 */
function parseLineAsColumns(line, lineIdx, allLines) {
  const items = [];
  
  // The line structure appears to be groups of values separated by multiple spaces
  // We need to identify column boundaries
  
  // Strategy: Split by multiple spaces (2+) to get potential columns
  // But descriptions might have single spaces, so we need a smarter approach
  
  // Look for the pattern: multiple part numbers, then multiple SS part numbers, etc.
  // Find where "Part No." headers would be to understand structure
  
  // For now, try to identify column groups by finding repeated patterns
  // Part numbers are usually at the start
  
  // Extract all potential part numbers first
  const partNoPattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
  const allMatches = [...line.matchAll(partNoPattern)];
  
  // Filter valid part numbers
  const partNumbers = allMatches
    .map(m => m[1])
    .filter(p => {
      if (p.includes('.')) return false;
      if (p.match(/^\d{1,3}$/) && !p.includes('-')) return false;
      if (p.match(/^-|-$/)) return false;
      return (p.length >= 4 && !p.match(/^\d{1,3}$/)) || (p.includes('-') && p.length >= 6);
    });
  
  if (partNumbers.length === 0) return items;
  
  // Try to identify column boundaries by looking for patterns
  // The structure seems to have: Part No group, SS Part No group, then other data
  
  // Get context from surrounding lines to better understand structure
  const contextStart = Math.max(0, lineIdx - 3);
  const contextEnd = Math.min(allLines.length, lineIdx + 5);
  const contextLines = allLines.slice(contextStart, contextEnd);
  
  // Look for header row to understand column structure
  let numColumns = 0;
  for (const ctxLine of contextLines) {
    if (ctxLine.match(/Part No\.\s+Part No\./i)) {
      // Count how many "Part No." appear
      const partNoHeaders = ctxLine.match(/Part No\./gi);
      if (partNoHeaders) {
        numColumns = partNoHeaders.length;
        break;
      }
    }
  }
  
  // If we found column count, use it; otherwise estimate from part numbers
  if (numColumns === 0) {
    // Estimate: usually 10-11 items per line based on the data
    numColumns = Math.min(partNumbers.length, 15);
  }
  
  // Split line intelligently to extract column values
  // Try splitting by multiple spaces first
  const parts = line.split(/\s{3,}/).map(p => p.trim()).filter(p => p);
  
  // If that doesn't work well, try a different approach:
  // Extract values by position using regex patterns for each column type
  
  // For each potential item (column index)
  for (let colIdx = 0; colIdx < numColumns && colIdx < partNumbers.length; colIdx++) {
    const partNo = partNumbers[colIdx];
    
    // Extract item data for this column index
    const item = extractItemByColumnIndex(partNo, colIdx, line, contextLines, lineIdx);
    
    if (item && item['part no.']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Extract item data for a specific column index
 */
function extractItemByColumnIndex(partNo, colIdx, line, contextLines, lineIdx) {
  const item = {};
  REQUIRED_COLUMNS.forEach(col => item[col] = '');
  
  item['part no.'] = partNo;
  
  // Combine context for better extraction
  const contextText = contextLines.join(' ');
  
  // Find SS Part No - look for part numbers near the Part No position
  // SS Part No usually appears after Part No columns
  const partNoIndex = line.indexOf(partNo);
  if (partNoIndex >= 0) {
    // Look for another part number after this one (within reasonable distance)
    const searchStart = partNoIndex + partNo.length;
    const searchEnd = Math.min(line.length, searchStart + 200);
    const nearbyText = line.substring(searchStart, searchEnd);
    
    const ssPartNoMatch = nearbyText.match(/\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/);
    if (ssPartNoMatch) {
      const candidate = ssPartNoMatch[1];
      if (candidate !== partNo && !candidate.includes('.') && candidate.length >= 4) {
        item['ss part no'] = candidate;
      }
    }
  }
  
  // Extract other fields using pattern matching from context
  // Origin
  const originMatch = contextText.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY)\b/i);
  if (originMatch) {
    item['origin'] = originMatch[1].toUpperCase();
  }
  
  // Description - look for text patterns after part numbers
  const descMatch = line.match(new RegExp(`${partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([A-Z][A-Za-z\\s\\(\\)0-9\\-\\/]{15,150})`, 'i'));
  if (descMatch) {
    let desc = descMatch[1].trim();
    desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '').trim();
    desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
    if (desc.length > 10 && desc.length < 200) {
      item['decc'] = desc.substring(0, 200);
    }
  }
  
  // Application/Grade
  const appMatch = contextText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE)\b/i);
  if (appMatch) {
    item['application grade'] = appMatch[1].toUpperCase();
    const gradeMatch = contextText.match(/\b([ABC])\b/);
    if (gradeMatch) {
      item['application grade'] += ' ' + gradeMatch[1];
    }
  }
  
  // Main category
  const mainCatMatch = contextText.match(/\b(ENGINE[- ]PARTS|TRANSMISSION[- ]PARTS|VEHICLE[- ]PARTS|GASKET[- ]KIT|PUMPS|UNDER[- ]CARRIAGE|G\.E\.T|HYDRAULIC[- ]FILTER|SEAL[- ][A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
  if (mainCatMatch) {
    item['main'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Sub category
  const subCatMatch = contextText.match(/\b(BEARINGS|SEAL[- ][A-Z]+|GASKET|FILTER|SEAL[- ]ASSLY|SEAL[- ]OIL|SEAL[- ]PACKING|SEAL[- ]RING|SEAL[- ]CRANKSHAFT|SEAL[- ]O[- ]RING)\b/i);
  if (subCatMatch) {
    item['sub'] = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Size
  const sizeMatch = contextText.match(/\b(\d+X\d+X\d+|\d+X\d+MM?|\d+MM?X\d+MM?|\d+\.\d+X\d+\.\d+|\d{2,4}X\d{2,4}X\d{1,3})\b/i);
  if (sizeMatch) {
    item['size'] = sizeMatch[1];
  }
  
  // Brand
  const brandMatch = contextText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|CTC|NTN|FAG|TIMKEN|SKF)\b/i);
  if (brandMatch) {
    item['brand'] = brandMatch[1].toUpperCase();
  }
  
  // Prices - extract from line
  const numbers = line.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (numbers) {
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n >= 0 && n < 10000000);
    
    const costIndex = nums.findIndex(n => n >= 50 && n < 100000);
    if (costIndex >= 0) item['cost'] = nums[costIndex].toString();
    
    const mktIndex = nums.findIndex((n, i) => i > costIndex && n >= 100 && n < 1000000);
    if (mktIndex >= 0) item['mkt'] = nums[mktIndex].toString();
    
    const priceAIndex = nums.findIndex((n, i) => i > (mktIndex >= 0 ? mktIndex : costIndex) && n >= 100 && n < 1000000 && n > (parseFloat(item['cost']) || 0));
    if (priceAIndex >= 0) item['price a'] = nums[priceAIndex].toString();
    
    const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n >= 100 && n < 1000000);
    if (priceBIndex >= 0) item['price b'] = nums[priceBIndex].toString();
  }
  
  // Model
  const modelPatterns = [
    /\b(MODEL|MDL)[:\s]+([A-Z0-9\-]+)\b/i,
    /\bMODEL\s+([A-Z0-9\-]{2,20})\b/i,
    /\b([A-Z]{2,4}\d{2,6})\b/,
  ];
  
  for (const pattern of modelPatterns) {
    const modelMatch = contextText.match(pattern);
    if (modelMatch) {
      item['model'] = modelMatch[modelMatch.length - 1].toUpperCase();
      break;
    }
  }
  
  // Qty
  const qtyPatterns = [
    /\b(QTY|QTY\.|QUANTITY)[:\s]+(\d+)\b/i,
    /\bQTY[:\s]+(\d+)\b/i,
    /\b(\d+)\s*(?:PCS|PCS\.|PIECES|UNITS?)\b/i,
  ];
  
  for (const pattern of qtyPatterns) {
    const qtyMatch = contextText.match(pattern);
    if (qtyMatch) {
      item['qty'] = qtyMatch[qtyMatch.length - 1];
      break;
    }
  }
  
  return item;
}

/**
 * Save to JSON
 */
function saveToJSON(items, jsonPath) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SAVING TO JSON');
  console.log('='.repeat(60) + '\n');
  
  const jsonData = {
    metadata: {
      source: 'CTC Item Lists.pdf',
      totalItems: items.length,
      extractedAt: new Date().toISOString(),
      columns: REQUIRED_COLUMNS
    },
    items: items
  };
  
  const jsonString = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync(jsonPath, jsonString, 'utf-8');
  
  const fileSize = fs.statSync(jsonPath).size;
  
  console.log(`   ✅ JSON file created: ${jsonPath}`);
  console.log(`   📊 Total Items: ${items.length}`);
  console.log(`   💾 File Size: ${(fileSize / 1024).toFixed(2)} KB\n`);
  
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PDF TO JSON CONVERTER (COLUMNAR PARSING)');
  console.log('='.repeat(60));
  
  try {
    const text = await extractTextFromPDF();
    const items = parseColumnarStructure(text);
    
    if (items.length === 0) {
      console.error('\n❌ No items extracted!');
      process.exit(1);
    }
    
    saveToJSON(items, JSON_PATH);
    
    console.log('='.repeat(60));
    console.log('✅ CONVERSION COMPLETE');
    console.log('='.repeat(60));
    console.log(`   📈 Total Items: ${items.length}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);

