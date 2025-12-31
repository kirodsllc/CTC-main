/**
 * CONVERT PDF DATA TO CSV - ACCURATE BLOCK-BASED PARSING
 * Parses PDF as blocks where each item is in a structured block format
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
 * Parse items from text using block-based approach
 * Each item is in a block with structured fields
 */
function parseItemsFromBlocks(text) {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 PARSING ITEMS FROM BLOCKS");
  console.log("=".repeat(60) + "\n");
  
  const items = [];
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
  
  // Look for header pattern to understand structure
  let headerFound = false;
  let headerLineIndex = -1;
  
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('PART NO') && (line.includes('ORIGIN') || line.includes('DESC'))) {
      headerFound = true;
      headerLineIndex = i;
      console.log(`   ✅ Found header at line ${i + 1}`);
      console.log(`   📋 Header: ${lines[i]}\n`);
      break;
    }
  }
  
  if (!headerFound) {
    console.log("   ⚠️  No clear header found, using pattern matching...\n");
  }
  
  // Parse blocks - each block represents one item
  // Blocks are separated by part numbers or clear delimiters
  let currentBlock = [];
  let blockStartIndex = headerFound ? headerLineIndex + 1 : 0;
  const seenPartNos = new Set();
  
  console.log("   ⏳ Processing blocks...\n");
  
  for (let i = blockStartIndex; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers and headers
    if (line.match(/^(Page|of|\d+)$/i) || line.length < 5) {
      continue;
    }
    
    // Look for part number pattern - this might start a new block
    const partNoMatch = line.match(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/);
    
    if (partNoMatch) {
      const potentialPartNo = partNoMatch[1];
      
      // If we have a current block and find a new part number, process the previous block
      if (currentBlock.length > 0 && !seenPartNos.has(potentialPartNo)) {
        const item = parseBlock(currentBlock);
        if (item && item['Master Part No']) {
          items.push(item);
          seenPartNos.add(item['Master Part No']);
        }
        currentBlock = [];
      }
      
      // Start new block
      currentBlock = [line];
    } else if (currentBlock.length > 0) {
      // Continue current block (multi-line item)
      currentBlock.push(line);
      
      // Limit block size to avoid merging unrelated items
      if (currentBlock.length > 10) {
        const item = parseBlock(currentBlock);
        if (item && item['Master Part No']) {
          items.push(item);
          seenPartNos.add(item['Master Part No']);
        }
        currentBlock = [];
      }
    } else {
      // Look for standalone items (single line with part number)
      const standalonePartNo = line.match(/\b([0-9]{6,7}|[A-Z0-9\-]{4,15})\b/);
      if (standalonePartNo && !seenPartNos.has(standalonePartNo[1])) {
        const item = parseBlock([line]);
        if (item && item['Master Part No']) {
          items.push(item);
          seenPartNos.add(item['Master Part No']);
        }
      }
    }
    
    if (items.length % 500 === 0 && items.length > 0) {
      process.stdout.write(`   ⏳ Processed ${items.length} items...\r`);
    }
  }
  
  // Process last block
  if (currentBlock.length > 0) {
    const item = parseBlock(currentBlock);
    if (item && item['Master Part No']) {
      items.push(item);
    }
  }
  
  console.log(`\n   ✅ PARSED ${items.length} items from blocks\n`);
  return items;
}

/**
 * Parse a single block (one item) and extract all fields accurately
 */
function parseBlock(blockLines) {
  const combinedText = blockLines.join(' ');
  const item = {
    'Master Part No': '',
    'Part No': '',
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
  
  // Extract Master Part No (first part number in block)
  const masterPartMatch = combinedText.match(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/);
  if (masterPartMatch) {
    item['Master Part No'] = masterPartMatch[1];
    item['Part No'] = masterPartMatch[1]; // Default to master part no
  } else {
    return null; // No part number, skip this block
  }
  
  // Extract SS Part No (second part number, if different)
  const allPartNos = combinedText.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g);
  const partNos = Array.from(allPartNos).map(m => m[1]).filter(p => p !== item['Master Part No']);
  if (partNos.length > 0) {
    item['Part No'] = partNos[0];
  }
  
  // Extract Origin (country codes)
  const originMatch = combinedText.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM|JPN|CHINA|INDIA)\b/i);
  if (originMatch) {
    item['Origin'] = originMatch[1].toUpperCase();
  }
  
  // Extract Description (text after part number, before numbers)
  const descPattern = new RegExp(`${item['Master Part No']}\\s+([A-Z][A-Za-z\\s\\(\\)0-9\\-]{15,150})`, 'i');
  const descMatch = combinedText.match(descPattern);
  if (descMatch) {
    let desc = descMatch[1].trim();
    // Clean up description - remove extra part numbers and numbers
    desc = desc.replace(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5})\b/g, '').trim();
    desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
    item['Description'] = desc.substring(0, 200).trim();
  }
  
  // Extract Application
  const appMatch = combinedText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE)\b/i);
  if (appMatch) {
    item['Application'] = appMatch[1].toUpperCase();
  }
  
  // Extract Grade
  const gradeMatch = combinedText.match(/\b([ABC])\b/);
  if (gradeMatch) {
    item['Grade'] = gradeMatch[1];
  }
  
  // Extract Main Category
  const mainCatMatch = combinedText.match(/\b(ENGINE[- ]PARTS|TRANSMISSION[- ]PARTS|VEHICLE[- ]PARTS|GASKET[- ]KIT|PUMPS|UNDER[- ]CARRIAGE|G\.E\.T|HYDRAULIC[- ]FILTER|SEAL[- ][A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
  if (mainCatMatch) {
    item['Main Category'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Extract Sub Category
  const subCatMatch = combinedText.match(/\b(BEARINGS|SEAL[- ][A-Z]+|GASKET|FILTER|SEAL[- ]ASSLY|SEAL[- ]OIL|SEAL[- ]PACKING|SEAL[- ]RING|SEAL[- ]CRANKSHAFT|SEAL[- ]O[- ]RING)\b/i);
  if (subCatMatch && (!item['Main Category'] || !item['Main Category'].includes(subCatMatch[1]))) {
    item['Sub Category'] = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Extract Brand
  const brandMatch = combinedText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|CTC)\b/i);
  if (brandMatch) {
    item['Brand'] = brandMatch[1].toUpperCase();
  }
  
  // Extract Size
  const sizeMatch = combinedText.match(/\b(\d+X\d+X\d+|\d+X\d+MM?|\d+MM?X\d+MM?)\b/i);
  if (sizeMatch) {
    item['Size'] = sizeMatch[1];
  }
  
  // Extract numbers - need to be more careful about order
  const numbers = combinedText.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (numbers) {
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
    
    // Filter reasonable values
    const reasonableNums = nums.filter(n => n >= 0 && n < 10000000);
    
    // Cost - usually smaller, first reasonable number (50-100000)
    const costIndex = reasonableNums.findIndex(n => n >= 50 && n < 100000);
    if (costIndex >= 0) {
      item['Cost'] = reasonableNums[costIndex].toString();
    }
    
    // Price A - usually larger than cost (100-1000000)
    const priceAIndex = reasonableNums.findIndex((n, i) => i > costIndex && n >= 100 && n < 1000000);
    if (priceAIndex >= 0) {
      item['Price A'] = reasonableNums[priceAIndex].toString();
    }
    
    // Price B - usually after Price A (100-1000000)
    const priceBIndex = reasonableNums.findIndex((n, i) => i > priceAIndex && n >= 100 && n < 1000000);
    if (priceBIndex >= 0) {
      item['Price B'] = reasonableNums[priceBIndex].toString();
    }
    
    // Weight - decimal number (0.01-10000)
    const weightMatch = combinedText.match(/\b(\d+\.\d{1,3})\b/);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      if (weight >= 0.01 && weight < 10000) {
        item['Weight'] = weightMatch[1];
      }
    }
    
    // Order Level - small integer (0-999)
    const orderLevelMatch = combinedText.match(/\b(\d{1,3})\b/);
    if (orderLevelMatch) {
      const orderLevel = parseInt(orderLevelMatch[1]);
      if (orderLevel >= 0 && orderLevel < 1000) {
        item['Order Level'] = orderLevel.toString();
      }
    }
  }
  
  // Only return if we have at least Master Part No and Description
  if (item['Master Part No'] && item['Description']) {
    return item;
  }
  
  return null;
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
  console.log("🚀 PDF TO CSV - ACCURATE BLOCK-BASED PARSING");
  console.log("=".repeat(60));
  
  try {
    const text = await extractTextFromPDF();
    const items = parseItemsFromBlocks(text);
    
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

