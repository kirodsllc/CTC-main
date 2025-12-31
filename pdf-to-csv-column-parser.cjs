/**
 * CONVERT PDF DATA TO CSV - COLUMN-BASED PARSING
 * The PDF has a table with multiple columns, each column is one item
 * Headers are repeated: "Part No. Part No. Part No..." means column 1, 2, 3...
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
 * Parse items by identifying column structure
 * The PDF has columns where each column represents one item
 */
function parseItemsByColumns(text) {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 PARSING ITEMS BY COLUMN STRUCTURE");
  console.log("=".repeat(60) + "\n");
  
  const items = [];
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 20);
  
  // Find header row to understand column structure
  let headerLine = '';
  let headerIndex = -1;
  
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    const line = lines[i].toUpperCase();
    if (line.includes('PART NO') && line.includes('SS PART NO') && line.includes('DESC')) {
      headerLine = lines[i];
      headerIndex = i;
      console.log(`   ✅ Found header at line ${i + 1}`);
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.log("   ⚠️  No clear header found, using first line as reference\n");
    headerIndex = 0;
    headerLine = lines[0];
  }
  
  // Count how many columns (count occurrences of "Part No.")
  const partNoCount = (headerLine.match(/Part No\./gi) || []).length;
  console.log(`   📊 Detected ${partNoCount} columns per row\n`);
  
  if (partNoCount === 0) {
    console.log("   ⚠️  Could not detect column count, using pattern matching...\n");
    return parseItemsByPattern(lines);
  }
  
  // Process data rows (skip header)
  console.log("   ⏳ Processing rows and extracting columns...\n");
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers and short lines
    if (line.match(/^(Page|\d+)\s+of\s+\d+$/i) || line.length < 30) {
      continue;
    }
    
    // Extract items from this row (one per column)
    const rowItems = extractItemsFromRow(line, partNoCount);
    items.push(...rowItems);
    
    if (items.length % 500 === 0 && items.length > 0) {
      process.stdout.write(`   ⏳ Extracted ${items.length} items...\r`);
    }
  }
  
  // Remove duplicates
  const uniqueItems = [];
  const seenPartNos = new Set();
  
  for (const item of items) {
    if (item['Master Part No'] && !seenPartNos.has(item['Master Part No'])) {
      uniqueItems.push(item);
      seenPartNos.add(item['Master Part No']);
    }
  }
  
  console.log(`\n   ✅ PARSED ${uniqueItems.length} unique items from columns\n`);
  return uniqueItems;
}

/**
 * Extract multiple items from one row (one per column)
 */
function extractItemsFromRow(line, columnCount) {
  const items = [];
  
  // Split line into segments - look for patterns that indicate column boundaries
  // Each column typically has: Part No, SS Part No, Description, Application, Prices, etc.
  
  // Strategy: Find all part numbers in the line, then extract data around each
  const partNoMatches = Array.from(line.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g));
  
  // Group part numbers that are likely in the same column
  // Part numbers in the same column are usually close together
  const columnGroups = [];
  let currentGroup = [];
  
  for (let i = 0; i < partNoMatches.length; i++) {
    const match = partNoMatches[i];
    const partNo = match[1];
    const position = match.index;
    
    // Filter out numbers that are clearly prices
    if (partNo.includes('.') || partNo.match(/^\d{1,3}$/)) continue;
    
    if (currentGroup.length === 0) {
      currentGroup.push({ partNo, position });
    } else {
      const lastPos = currentGroup[currentGroup.length - 1].position;
      // If this part number is close to the last one, it might be SS Part No in same column
      // If far away, it's likely a new column
      if (position - lastPos < 50) {
        currentGroup.push({ partNo, position });
      } else {
        // New column
        if (currentGroup.length > 0) {
          columnGroups.push([...currentGroup]);
        }
        currentGroup = [{ partNo, position }];
      }
    }
  }
  
  if (currentGroup.length > 0) {
    columnGroups.push(currentGroup);
  }
  
  // Extract one item per column group
  for (const group of columnGroups) {
    if (group.length === 0) continue;
    
    const masterPartNo = group[0].partNo;
    const ssPartNo = group.length > 1 ? group[1].partNo : masterPartNo;
    const startPos = group[0].position;
    const endPos = group.length > 1 ? group[group.length - 1].position + 100 : startPos + 200;
    
    // Get text segment for this column
    const segmentStart = Math.max(0, startPos - 50);
    const segmentEnd = Math.min(line.length, endPos);
    const segment = line.substring(segmentStart, segmentEnd);
    
    const item = extractItemFromSegment(masterPartNo, ssPartNo, segment, line);
    if (item && item['Description']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Extract item data from a text segment (one column)
 */
function extractItemFromSegment(masterPartNo, ssPartNo, segment, fullLine) {
  const item = {
    'Master Part No': masterPartNo,
    'Part No': ssPartNo,
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
  
  // Extract Description - text after part numbers
  const descPattern = new RegExp(`${masterPartNo}\\s+([A-Z][A-Za-z\\s\\(\\)0-9\\-]{15,80})`, 'i');
  const descMatch = segment.match(descPattern) || fullLine.match(descPattern);
  if (descMatch) {
    let desc = descMatch[1].trim();
    // Clean up
    desc = desc.replace(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5})\b/g, '').trim();
    desc = desc.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
    item['Description'] = desc.substring(0, 200).trim();
  }
  
  // Extract Origin
  const originMatch = segment.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM)\b/i);
  if (originMatch) {
    item['Origin'] = originMatch[1].toUpperCase();
  }
  
  // Extract Application
  const appMatch = segment.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM)\b/i);
  if (appMatch) {
    item['Application'] = appMatch[1].toUpperCase();
  }
  
  // Extract Grade
  const gradeMatch = segment.match(/\b([ABC])\b/);
  if (gradeMatch) {
    item['Grade'] = gradeMatch[1];
  }
  
  // Extract Main Category
  const mainCatMatch = segment.match(/\b(ENGINE[- ]PARTS|TRANSMISSION[- ]PARTS|VEHICLE[- ]PARTS|GASKET[- ]KIT|PUMPS|UNDER[- ]CARRIAGE|G\.E\.T|HYDRAULIC[- ]FILTER|SEAL[- ][A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
  if (mainCatMatch) {
    item['Main Category'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
  }
  
  // Extract Sub Category
  const subCatMatch = segment.match(/\b(BEARINGS|SEAL[- ][A-Z]+|GASKET|FILTER|SEAL[- ]ASSLY|SEAL[- ]OIL|SEAL[- ]PACKING|SEAL[- ]RING|SEAL[- ]CRANKSHAFT|SEAL[- ]O[- ]RING)\b/i);
  if (subCatMatch && (!item['Main Category'] || !item['Main Category'].includes(subCatMatch[1]))) {
    item['Sub Category'] = subCatMatch[1].replace(/-/g, ' ').trim();
  }
  
  // Extract Brand
  const brandMatch = segment.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE|CTC|NTN|FAG|TIMKEN|SKF|ITR|WG|CAT|R|DP|ASP|CGR|HG|FP|BOW|KMP|CLV|YNRSP|KZ|SSP|T&K|KTSU|MAH|NOK|CHN|PRC|LOC|REP|TIM|DSG)\b/i);
  if (brandMatch) {
    item['Brand'] = brandMatch[1].toUpperCase();
  }
  
  // Extract Size
  const sizeMatch = segment.match(/\b(\d+X\d+X\d+|\d+X\d+MM?|\d+MM?X\d+MM?)\b/i);
  if (sizeMatch) {
    item['Size'] = sizeMatch[1];
  }
  
  // Extract numbers - be very careful about order
  const numbers = segment.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
  if (numbers) {
    const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
    const reasonableNums = nums.filter(n => n >= 0 && n < 10000000);
    
    // Cost - first reasonable number (50-100000)
    const costIndex = reasonableNums.findIndex(n => n >= 50 && n < 100000);
    if (costIndex >= 0) {
      item['Cost'] = reasonableNums[costIndex].toString();
    }
    
    // Price A - after cost, larger (100-1000000)
    const priceAIndex = reasonableNums.findIndex((n, i) => 
      i > costIndex && n >= 100 && n < 1000000 && n > (parseFloat(item['Cost']) || 0)
    );
    if (priceAIndex >= 0) {
      item['Price A'] = reasonableNums[priceAIndex].toString();
    }
    
    // Price B - after Price A (100-1000000)
    const priceBIndex = reasonableNums.findIndex((n, i) => 
      i > priceAIndex && n >= 100 && n < 1000000
    );
    if (priceBIndex >= 0) {
      item['Price B'] = reasonableNums[priceBIndex].toString();
    }
    
    // Weight - decimal (0.01-10000)
    const weightMatch = segment.match(/\b(\d+\.\d{1,3})\b/);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      if (weight >= 0.01 && weight < 10000) {
        item['Weight'] = weightMatch[1];
      }
    }
    
    // Order Level - small integer (0-999)
    const orderLevelMatch = segment.match(/\b(\d{1,3})\b/);
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
 * Fallback: Parse by pattern if column detection fails
 */
function parseItemsByPattern(lines) {
  const items = [];
  const seenPartNos = new Set();
  
  for (const line of lines) {
    if (line.length < 20) continue;
    
    // Find part numbers
    const partNoMatches = Array.from(line.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g));
    
    for (const match of partNoMatches) {
      const partNo = match[1];
      if (partNo.includes('.') || partNo.match(/^\d{1,3}$/) || seenPartNos.has(partNo)) continue;
      
      const item = extractItemFromSegment(partNo, partNo, line, line);
      if (item && item['Description']) {
        items.push(item);
        seenPartNos.add(partNo);
      }
    }
  }
  
  return items;
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
  console.log("🚀 PDF TO CSV - COLUMN-BASED PARSER");
  console.log("=".repeat(60));
  
  try {
    const text = await extractTextFromPDF();
    const items = parseItemsByColumns(text);
    
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

