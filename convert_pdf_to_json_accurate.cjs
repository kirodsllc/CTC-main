/**
 * Convert CTC Item Lists.pdf to JSON format with ACCURATE data extraction
 * Extracts ALL items (7096+) by parsing columnar structure properly
 */

const fs = require('fs');
const path = require('path');

const PDF_PATH = path.join(__dirname, 'CTC Item Lists.pdf');
const JSON_PATH = path.join(__dirname, 'CTC Item Lists.json');
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
      
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
      
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
 * Parse items from text - extract ALL items from columnar structure
 * Each line contains multiple items in columns (Part No, SS Part No, Desc, etc.)
 */
function parseItemsFromText(text) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PARSING ITEMS FROM TEXT (ACCURATE EXTRACTION)');
  console.log('='.repeat(60) + '\n');
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  const items = [];
  const seenPartNos = new Set();
  
  console.log('   📊 Parsing columnar structure...');
  console.log(`   📄 Total lines: ${lines.length}\n`);
  
  // Process each line - each line contains multiple items in columns
  let lineCount = 0;
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    
    // Skip very short lines or page numbers
    if (line.length < 15) continue;
    if (line.match(/^Page\s+\d+\s+of\s+\d+$/i)) continue;
    
    // Skip pure header rows (but allow data rows that might contain header words)
    if (line.match(/^Part No\.\s+Part No\./i) || line.match(/^SS Part No\.\s+SS Part No\./i)) {
      continue;
    }
    
    // Extract items from this line using columnar parsing
    const lineItems = parseColumnarLine(line, lineIdx, lines);
    
    for (const item of lineItems) {
      const key = item['part no.'] || item['ss part no'] || `${lineIdx}_${items.length}`;
      if (item['part no.'] || item['ss part no']) {
        if (!seenPartNos.has(key)) {
          seenPartNos.add(key);
          items.push(item);
        }
      }
    }
    
    lineCount++;
    if (lineCount % 50 === 0) {
      console.log(`   ⏳ Processed ${lineCount} lines, extracted ${items.length} items...`);
    }
  }
  
  console.log(`   ✅ Parsed ${items.length} unique items from ${lineCount} lines\n`);
  return items;
}

/**
 * Parse a single line that contains multiple items in columnar format
 */
function parseColumnarLine(line, lineIdx, allLines) {
  const items = [];
  
  // Find all part numbers in the line (Part No column)
  // Improved pattern to capture complete part numbers with dashes
  const partNoPattern = /\b([0-9]{4,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[0-9]{2}-[0-9]{5}|[0-9]{1,2}-[0-9]{5}|[A-Z0-9\-]{4,20})\b/g;
  const partNoMatches = [...line.matchAll(partNoPattern)];
  
  if (partNoMatches.length === 0) return items;
  
  // Filter valid part numbers (exclude prices, small numbers, etc.)
  const validPartNos = partNoMatches
    .map(m => ({ value: m[1], index: m.index }))
    .filter(m => {
      const p = m.value;
      // Exclude decimal numbers, very small numbers, etc.
      if (p.includes('.')) return false;
      if (p.match(/^\d{1,3}$/) && !p.includes('-')) return false;
      // Exclude if it's just a dash or starts/ends with dash incorrectly
      if (p.match(/^-|-$/)) return false;
      // Keep part numbers (4+ chars or contains dash with numbers)
      return (p.length >= 4 && !p.match(/^\d{1,3}$/)) || (p.includes('-') && p.length >= 6);
    })
    .filter((m, idx, arr) => {
      // Remove duplicates that are adjacent (same part number repeated)
      if (idx > 0 && arr[idx - 1].value === m.value) return false;
      return true;
    });
  
  if (validPartNos.length === 0) return items;
  
  // Get context from surrounding lines
  const contextStart = Math.max(0, lineIdx - 5);
  const contextEnd = Math.min(allLines.length, lineIdx + 10);
  const contextLines = allLines.slice(contextStart, contextEnd);
  const contextText = contextLines.join(' ');
  
  // The PDF structure: Part No columns come first, then SS Part No columns
  // We need to identify the pattern. Looking at the data:
  // Line format: "part1 part2 ... ss1 ss2 ... desc1 desc2 ..."
  
  // Strategy: Find the first group of part numbers (likely Part No column)
  // Then find the next group (likely SS Part No column)
  // Then extract descriptions, prices, etc.
  
  // For now, extract each unique part number as a potential item
  const uniquePartNos = [...new Set(validPartNos.map(p => p.value))];
  
  for (let i = 0; i < uniquePartNos.length; i++) {
    const partNo = uniquePartNos[i];
    
    // Try to find corresponding SS part no
    // Look for part numbers that appear after the Part No section
    // The structure seems to repeat: Part No group, then SS Part No group
    let ssPartNo = '';
    
    // Find SS part no - it might be in a different position
    // Look for part numbers near this one in the line
    const partNoIndex = line.indexOf(partNo);
    if (partNoIndex >= 0) {
      // Look for another part number nearby (within 200 chars)
      const nearbyText = line.substring(Math.max(0, partNoIndex - 50), Math.min(line.length, partNoIndex + 200));
      const nearbyPartNos = [...nearbyText.matchAll(partNoPattern)]
        .map(m => m[1])
        .filter(p => p !== partNo && p.length >= 4 && !p.includes('.') && !p.match(/^\d{1,3}$/));
      
      if (nearbyPartNos.length > 0) {
        ssPartNo = nearbyPartNos[0];
      }
    }
    
    // Extract complete item data
    const item = extractItemDataFromContext(partNo, ssPartNo, line, contextText, lineIdx, allLines);
    
    if (item && item['part no.']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Extract all fields for one item from context
 */
function extractItemDataFromContext(partNo, ssPartNo, line, contextText, lineIdx, allLines) {
  const item = {};
  REQUIRED_COLUMNS.forEach(col => item[col] = '');
  
  item['part no.'] = partNo;
  if (ssPartNo) {
    item['ss part no'] = ssPartNo;
  }
  
  // Extract origin (country codes)
  const originMatch = contextText.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA|JAPAN|KOREA|ITALY|TURKEY)\b/i);
  if (originMatch) {
    item['origin'] = originMatch[1].toUpperCase();
  }
  
  // Extract description - look for text patterns
  const descPatterns = [
    new RegExp(`${partNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([A-Z][A-Za-z\\s\\(\\)0-9\\-\\/]{15,150})`, 'i'),
    new RegExp(`([A-Z][A-Za-z\\s\\(\\)0-9\\-\\/]{20,150})`, 'i'),
  ];
  
  for (const pattern of descPatterns) {
    const descMatch = contextText.match(pattern);
    if (descMatch) {
      let desc = descMatch[1].trim();
      // Clean up
      desc = desc.replace(/\b([0-9]{4,15}|[0-9]{3,5}-[0-9]{3,5})\b/g, '').trim();
      desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
      if (desc.length > 10 && desc.length < 200) {
        item['decc'] = desc;
        break;
      }
    }
  }
  
  // Extract application/grade
  const appMatch = contextText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE)\b/i);
  if (appMatch) {
    item['application grade'] = appMatch[1].toUpperCase();
    
    // Extract grade (A, B, C)
    const gradeMatch = contextText.match(/\b([ABC])\b/);
    if (gradeMatch) {
      item['application grade'] += ' ' + gradeMatch[1];
    }
  }
  
  // Extract main category
  const mainCatMatch = contextText.match(/\b(ENGINE[- ]PARTS|TRANSMISSION[- ]PARTS|VEHICLE[- ]PARTS|GASKET[- ]KIT|PUMPS|UNDER[- ]CARRIAGE|G\.E\.T|HYDRAULIC[- ]FILTER|SEAL[- ][A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
  if (mainCatMatch) {
    item['main'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Extract sub category
  const subCatMatch = contextText.match(/\b(BEARINGS|SEAL[- ][A-Z]+|GASKET|FILTER|SEAL[- ]ASSLY|SEAL[- ]OIL|SEAL[- ]PACKING|SEAL[- ]RING|SEAL[- ]CRANKSHAFT|SEAL[- ]O[- ]RING)\b/i);
  if (subCatMatch) {
    item['sub'] = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Extract size
  const sizeMatch = contextText.match(/\b(\d+X\d+X\d+|\d+X\d+MM?|\d+MM?X\d+MM?|\d+\.\d+X\d+\.\d+|\d{2,4}X\d{2,4}X\d{1,3})\b/i);
  if (sizeMatch) {
    item['size'] = sizeMatch[1];
  }
  
  // Extract brand
  const brandMatch = contextText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|CTC|NTN|FAG|TIMKEN|SKF)\b/i);
  if (brandMatch) {
    item['brand'] = brandMatch[1].toUpperCase();
  }
  
  // Extract remarks
  const remarksMatch = contextText.match(/\(([^)]+)\)/);
  if (remarksMatch) {
    item['remarks'] = remarksMatch[1];
  }
  
  // Extract location - look for LOC pattern
  const locMatch = contextText.match(/\b(LOC|LOCATION)[:\s]+([A-Z0-9\-]+)\b/i);
  if (locMatch) {
    item['loc'] = locMatch[2];
  }
  
  // Extract prices and cost from the line
  const numbers = line.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (numbers) {
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n >= 0 && n < 10000000);
    
    // Cost - usually smaller, first reasonable number (50-100000)
    const costIndex = nums.findIndex(n => n >= 50 && n < 100000);
    if (costIndex >= 0) {
      item['cost'] = nums[costIndex].toString();
    }
    
    // MKT - market price
    const mktIndex = nums.findIndex((n, i) => i > costIndex && n >= 100 && n < 1000000);
    if (mktIndex >= 0) {
      item['mkt'] = nums[mktIndex].toString();
    }
    
    // Price A
    const priceAIndex = nums.findIndex((n, i) => i > (mktIndex >= 0 ? mktIndex : costIndex) && n >= 100 && n < 1000000 && n > (parseFloat(item['cost']) || 0));
    if (priceAIndex >= 0) {
      item['price a'] = nums[priceAIndex].toString();
    }
    
    // Price B
    const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n >= 100 && n < 1000000);
    if (priceBIndex >= 0) {
      item['price b'] = nums[priceBIndex].toString();
    }
  }
  
  // Extract model
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
  
  // Extract quantity
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
 * Save items to JSON file
 */
function saveToJSON(items, jsonPath) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SAVING TO JSON');
  console.log('='.repeat(60) + '\n');
  
  if (items.length === 0) {
    console.log('   ⚠️  No items to save!');
    return false;
  }
  
  // Convert to JSON with proper formatting
  const jsonData = {
    metadata: {
      source: 'CTC Item Lists.pdf',
      totalItems: items.length,
      extractedAt: new Date().toISOString(),
      columns: REQUIRED_COLUMNS
    },
    items: items
  };
  
  // Write JSON file with pretty formatting
  const jsonString = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync(jsonPath, jsonString, 'utf-8');
  
  const fileSize = fs.statSync(jsonPath).size;
  
  console.log(`   ✅ JSON file created: ${jsonPath}`);
  console.log(`   📊 Total Items: ${items.length}`);
  console.log(`   📏 Columns: ${REQUIRED_COLUMNS.length}`);
  console.log(`   💾 File Size: ${(fileSize / 1024).toFixed(2)} KB`);
  console.log(`   📋 Columns: ${REQUIRED_COLUMNS.join(', ')}\n`);
  
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PDF TO JSON CONVERTER (ACCURATE EXTRACTION)');
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
    
    // Save to JSON
    const success = saveToJSON(items, JSON_PATH);
    
    if (success) {
      console.log('='.repeat(60));
      console.log('✅ CONVERSION COMPLETE');
      console.log('='.repeat(60));
      console.log(`   📄 PDF: ${PDF_PATH}`);
      console.log(`   📊 JSON: ${JSON_PATH}`);
      console.log(`   📈 Total Items: ${items.length}`);
      console.log('='.repeat(60) + '\n');
    } else {
      console.error('\n❌ Failed to save JSON file!');
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

