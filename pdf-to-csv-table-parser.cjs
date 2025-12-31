/**
 * CONVERT PDF DATA TO CSV - TABLE-BASED PARSING
 * Parses PDF as a table where each row is one item with all fields
 */

const fs = require('fs');
const path = require('path');

const PDF_PATH = path.join(__dirname, 'CTC Item Lists.pdf');
const CSV_PATH = path.join(__dirname, 'CTC Item Lists.csv');
const TEXT_PATH = path.join(__dirname, 'pdf_extracted_text.txt');

/**
 * Extract text from PDF or use existing extracted text
 */
async function extractTextFromPDF() {
  console.log("\n" + "=".repeat(60));
  console.log("📄 EXTRACTING TEXT FROM PDF");
  console.log("=".repeat(60) + "\n");
  
  if (fs.existsSync(TEXT_PATH)) {
    console.log("   📄 Using existing extracted text file...");
    const text = fs.readFileSync(TEXT_PATH, 'utf-8');
    console.log(`   ✅ Read ${text.length} characters\n`);
    return text;
  }
  
  console.log("   ⚠️  No extracted text file found. Extracting from PDF...");
  try {
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
      if (i % 10 === 0) console.log(`   ⏳ Extracted ${i}/${pdf.numPages} pages...`);
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
 * Parse items from text as a table structure
 * The PDF has repeated headers for each column, we need to extract rows
 */
function parseItemsAsTable(text) {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 PARSING ITEMS AS TABLE STRUCTURE");
  console.log("=".repeat(60) + "\n");
  
  const items = [];
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Find the header row that contains "Part No." and other column headers
  let headerIndex = -1;
  for (let i = 0; i < Math.min(100, lines.length); i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('PART NO') && (line.includes('SS PART NO') || line.includes('DESC') || line.includes('APPL'))) {
      headerIndex = i;
      console.log(`   ✅ Found table header at line ${i + 1}`);
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.log("   ⚠️  No clear header found, using pattern matching...\n");
    headerIndex = 0;
  }
  
  // The PDF structure appears to have:
  // - Multiple part numbers in sequence (Part No column)
  // - Multiple SS part numbers in sequence (SS Part No column)
  // - Multiple descriptions in sequence (Desc column)
  // - Multiple applications in sequence (Appl column)
  // - Multiple prices in sequence (Price A, Price B columns)
  // etc.
  
  // Strategy: Look for patterns where we have sequences of values
  // Each "row" in the table has one value from each column sequence
  
  console.log("   ⏳ Analyzing table structure...\n");
  
  // Process in chunks - each page or section might be a table
  let currentSection = [];
  let inTableSection = false;
  
  for (let i = headerIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers
    if (line.match(/^(Page|\d+)\s+of\s+\d+$/i)) {
      continue;
    }
    
    // Check if this line looks like it contains table data
    // Should have part numbers, descriptions, prices, etc.
    const hasPartNo = /\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/.test(line);
    const hasPrices = /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/.test(line);
    const hasText = /[A-Z]{4,}/.test(line);
    
    if (hasPartNo && (hasPrices || hasText)) {
      currentSection.push(line);
      inTableSection = true;
    } else if (inTableSection && line.length < 10) {
      // End of section, process it
      if (currentSection.length > 0) {
        const sectionItems = parseTableSection(currentSection);
        items.push(...sectionItems);
        currentSection = [];
      }
      inTableSection = false;
    }
  }
  
  // Process last section
  if (currentSection.length > 0) {
    const sectionItems = parseTableSection(currentSection);
    items.push(...sectionItems);
  }
  
  // Remove duplicates based on Master Part No
  const uniqueItems = [];
  const seenPartNos = new Set();
  
  for (const item of items) {
    if (item['Master Part No'] && !seenPartNos.has(item['Master Part No'])) {
      uniqueItems.push(item);
      seenPartNos.add(item['Master Part No']);
    }
  }
  
  console.log(`   ✅ PARSED ${uniqueItems.length} unique items from table structure\n`);
  return uniqueItems;
}

/**
 * Parse a section of lines that represents a table
 * Extract columns by finding sequences of similar data types
 */
function parseTableSection(sectionLines) {
  const items = [];
  const combinedText = sectionLines.join(' ');
  
  // Extract all part numbers (Master Part No)
  const masterPartNos = [];
  const masterPartMatches = combinedText.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g);
  for (const match of masterPartMatches) {
    const partNo = match[1];
    // Filter out numbers that are clearly prices or other data
    if (!partNo.includes('.') && !partNo.match(/^\d{1,3}$/) && partNo.length >= 4) {
      if (!masterPartNos.includes(partNo)) {
        masterPartNos.push(partNo);
      }
    }
  }
  
  // For each master part number, extract its row data
  for (const masterPartNo of masterPartNos) {
    // Find the position of this part number in the text
    const partIndex = combinedText.indexOf(masterPartNo);
    if (partIndex === -1) continue;
    
    // Get context around this part number (200 chars before and after)
    const start = Math.max(0, partIndex - 200);
    const end = Math.min(combinedText.length, partIndex + 200);
    const context = combinedText.substring(start, end);
    
    const item = extractItemFromContext(masterPartNo, context, combinedText);
    if (item && item['Description']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Extract all fields for one item from context
 */
function extractItemFromContext(masterPartNo, context, fullText) {
  const item = {
    'Master Part No': masterPartNo,
    'Part No': masterPartNo,
    'Origin': '',
    'Description': '',
    'Application': '',
    'Grade': '',
    'Order Level': '',
    'Weight': '',
    'Main Category': '',
    'Sub Category': '',
    'Size': '',
    'Brand': '',
    'Cost': '',
    'Price A': '',
    'Price B': '',
  };
  
  // Extract SS Part No (look for part number near master part no that's different)
  const allPartNos = context.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g);
  const partNos = Array.from(allPartNos).map(m => m[1]).filter(p => 
    p !== masterPartNo && 
    !p.includes('.') && 
    !p.match(/^\d{1,3}$/) && 
    p.length >= 4
  );
  if (partNos.length > 0) {
    item['Part No'] = partNos[0];
  }
  
  // Extract Description - look for text after part number
  const descPattern = new RegExp(`${masterPartNo}\\s+([A-Z][A-Za-z\\s\\(\\)0-9\\-]{15,100})`, 'i');
  const descMatch = context.match(descPattern);
  if (descMatch) {
    let desc = descMatch[1].trim();
    // Clean up - remove part numbers and excessive numbers
    desc = desc.replace(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5})\b/g, '').trim();
    desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
    item['Description'] = desc.substring(0, 200).trim();
  }
  
  // Extract Origin
  const originMatch = context.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA)\b/i);
  if (originMatch) {
    item['Origin'] = originMatch[1].toUpperCase();
  }
  
  // Extract Application
  const appMatch = context.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE)\b/i);
  if (appMatch) {
    item['Application'] = appMatch[1].toUpperCase();
  }
  
  // Extract Grade
  const gradeMatch = context.match(/\b([ABC])\b/);
  if (gradeMatch) {
    item['Grade'] = gradeMatch[1];
  }
  
  // Extract Main Category
  const mainCatMatch = context.match(/\b(ENGINE[- ]PARTS|TRANSMISSION[- ]PARTS|VEHICLE[- ]PARTS|GASKET[- ]KIT|PUMPS|UNDER[- ]CARRIAGE|G\.E\.T|HYDRAULIC[- ]FILTER|SEAL[- ][A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
  if (mainCatMatch) {
    item['Main Category'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Extract Sub Category
  const subCatMatch = context.match(/\b(BEARINGS|SEAL[- ][A-Z]+|GASKET|FILTER|SEAL[- ]ASSLY|SEAL[- ]OIL|SEAL[- ]PACKING|SEAL[- ]RING|SEAL[- ]CRANKSHAFT|SEAL[- ]O[- ]RING)\b/i);
  if (subCatMatch && (!item['Main Category'] || !item['Main Category'].includes(subCatMatch[1]))) {
    item['Sub Category'] = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Extract Brand
  const brandMatch = context.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|CTC|NTN|FAG|TIMKEN|SKF)\b/i);
  if (brandMatch) {
    item['Brand'] = brandMatch[1].toUpperCase();
  }
  
  // Extract Size
  const sizeMatch = context.match(/\b(\d+X\d+X\d+|\d+X\d+MM?|\d+MM?X\d+MM?)\b/i);
  if (sizeMatch) {
    item['Size'] = sizeMatch[1];
  }
  
  // Extract numbers - be more careful about order and values
  const numbers = context.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (numbers) {
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
    const reasonableNums = nums.filter(n => n >= 0 && n < 10000000);
    
    // Cost - usually smaller, first reasonable number (50-100000)
    const costIndex = reasonableNums.findIndex(n => n >= 50 && n < 100000);
    if (costIndex >= 0) {
      item['Cost'] = reasonableNums[costIndex].toString();
    }
    
    // Price A - usually larger than cost (100-1000000)
    const priceAIndex = reasonableNums.findIndex((n, i) => i > costIndex && n >= 100 && n < 1000000 && n > (parseFloat(item['Cost']) || 0));
    if (priceAIndex >= 0) {
      item['Price A'] = reasonableNums[priceAIndex].toString();
    }
    
    // Price B - usually after Price A (100-1000000)
    const priceBIndex = reasonableNums.findIndex((n, i) => i > priceAIndex && n >= 100 && n < 1000000);
    if (priceBIndex >= 0) {
      item['Price B'] = reasonableNums[priceBIndex].toString();
    }
    
    // Weight - decimal number (0.01-10000)
    const weightMatch = context.match(/\b(\d+\.\d{1,3})\b/);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      if (weight >= 0.01 && weight < 10000) {
        item['Weight'] = weightMatch[1];
      }
    }
    
    // Order Level - small integer (0-999)
    const orderLevelMatch = context.match(/\b(\d{1,3})\b/);
    if (orderLevelMatch) {
      const orderLevel = parseInt(orderLevelMatch[1]);
      if (orderLevel >= 0 && orderLevel < 1000) {
        item['Order Level'] = orderLevel.toString();
      }
    }
  }
  
  return item;
}

/**
 * Convert items to CSV format
 */
function convertToCSV(items) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 CONVERTING TO CSV FORMAT");
  console.log("=".repeat(60) + "\n");
  
  if (items.length === 0) {
    console.log("   ⚠️  No items to convert!");
    return '';
  }
  
  const columns = [
    'Master Part No',
    'Part No',
    'Origin',
    'Description',
    'Application',
    'Grade',
    'Order Level',
    'Weight',
    'Main Category',
    'Sub Category',
    'Size',
    'Brand',
    'Cost',
    'Price A',
    'Price B',
  ];
  
  const header = columns.map(col => `"${col}"`).join(',');
  const rows = items.map(item => {
    return columns.map(col => {
      const value = item[col] || '';
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  
  const csv = [header, ...rows].join('\n');
  
  console.log(`   ✅ CSV created with ${items.length} items`);
  console.log(`   📊 Columns: ${columns.length}`);
  console.log(`   📏 CSV size: ${(csv.length / 1024).toFixed(2)} KB\n`);
  
  return csv;
}

/**
 * Save CSV to file
 */
function saveCSV(csv, filePath) {
  console.log("\n" + "=".repeat(60));
  console.log("💾 SAVING CSV FILE");
  console.log("=".repeat(60) + "\n");
  
  try {
    fs.writeFileSync(filePath, csv, 'utf-8');
    console.log(`   ✅ CSV file saved: ${filePath}`);
    console.log(`   📊 File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error(`   ❌ Error saving CSV: ${error.message}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 PDF TO CSV - TABLE PARSER");
  console.log("=".repeat(60));
  
  try {
    const text = await extractTextFromPDF();
    const items = parseItemsAsTable(text);
    
    if (items.length === 0) {
      console.error("\n❌ No items extracted from PDF!");
      process.exit(1);
    }
    
    const csv = convertToCSV(items);
    saveCSV(csv, CSV_PATH);
    
    console.log("=".repeat(60));
    console.log("✅ CONVERSION COMPLETE");
    console.log("=".repeat(60));
    console.log(`   📄 PDF: ${PDF_PATH}`);
    console.log(`   📊 CSV: ${CSV_PATH}`);
    console.log(`   📈 Total Items: ${items.length}`);
    console.log("=".repeat(60) + "\n");
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);

