/**
 * CONVERT PDF DATA TO CSV - VERTICAL COLUMN PARSING
 * The PDF has columns where each column represents one complete item
 * Headers repeat: "Part No. Part No. Part No..." means column 1, 2, 3...
 * Values follow: actual part numbers, descriptions, prices, etc.
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
 * Parse items by reading vertically through columns
 * Structure: Headers repeat N times, then values appear N times
 */
function parseItemsByVerticalColumns(text) {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 PARSING ITEMS BY VERTICAL COLUMNS");
  console.log("=".repeat(60) + "\n");
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 20);
  const items = [];
  
  // Process each page/section
  let currentSection = [];
  let inDataSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers
    if (line.match(/^(Page|\d+)\s+of\s+\d+$/i)) {
      if (currentSection.length > 0) {
        const sectionItems = parseSection(currentSection);
        items.push(...sectionItems);
        currentSection = [];
      }
      continue;
    }
    
    // Check if this line contains table data
    if (line.includes('Part No.') || line.includes('SS Part No') || 
        line.includes('Desc.') || line.includes('Appl.') ||
        line.includes('Cost.') || line.includes('Price A') ||
        /\b([0-9]{6,7}|[0-9]{5}-[0-9]{5})\b/.test(line)) {
      currentSection.push(line);
      inDataSection = true;
    } else if (inDataSection && line.length < 30) {
      // End of section
      if (currentSection.length > 0) {
        const sectionItems = parseSection(currentSection);
        items.push(...sectionItems);
        currentSection = [];
      }
      inDataSection = false;
    }
  }
  
  // Process last section
  if (currentSection.length > 0) {
    const sectionItems = parseSection(currentSection);
    items.push(...sectionItems);
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
  
  console.log(`   ✅ PARSED ${uniqueItems.length} unique items from vertical columns\n`);
  return uniqueItems;
}

/**
 * Parse a section - extract columns by finding header/value pairs
 */
function parseSection(sectionLines) {
  const combinedText = sectionLines.join(' ');
  const items = [];
  
  // Find how many columns by counting "Part No." occurrences
  const partNoHeaderCount = (combinedText.match(/Part No\./g) || []).length;
  if (partNoHeaderCount === 0) return items;
  
  const columnCount = partNoHeaderCount;
  console.log(`      📊 Detected ${columnCount} columns in this section`);
  
  // Extract data arrays for each field type
  const masterPartNos = extractColumnValues(combinedText, 'Part No\\.', columnCount);
  const ssPartNos = extractColumnValues(combinedText, 'SS Part No\\.', columnCount);
  const descriptions = extractColumnValues(combinedText, 'Desc\\.', columnCount, true);
  const applications = extractColumnValues(combinedText, 'Appl\\.', columnCount);
  const mainCategories = extractColumnValues(combinedText, 'Main\\s+Main', columnCount);
  const subCategories = extractColumnValues(combinedText, 'Sub\\s+Sub', columnCount);
  const brands = extractColumnValues(combinedText, 'Brand\\s+Brand', columnCount);
  const costs = extractColumnValues(combinedText, 'Cost\\.', columnCount, false, true);
  const priceAs = extractColumnValues(combinedText, 'Price A', columnCount, false, true);
  const priceBs = extractColumnValues(combinedText, 'Price B', columnCount, false, true);
  const origins = extractColumnValues(combinedText, 'Origin\\s+Origin', columnCount);
  const grades = extractColumnValues(combinedText, 'Grade\\s+Grade', columnCount);
  const orderLevels = extractColumnValues(combinedText, 'Ord\\.Lvl\\.', columnCount, false, true);
  const weights = extractColumnValues(combinedText, 'Wheight', columnCount, false, true);
  
  // Create items from columns
  for (let col = 0; col < columnCount; col++) {
    const item = {
      'Master Part No': masterPartNos[col] || '',
      'Part No': ssPartNos[col] || masterPartNos[col] || '',
      'Origin': origins[col] || '',
      'Description': descriptions[col] || '',
      'Application': applications[col] || '',
      'Grade': grades[col] || '',
      'Order Level': orderLevels[col] || '',
      'Weight': weights[col] || '',
      'Main Category': mainCategories[col] || '',
      'Sub Category': subCategories[col] || '',
      'Size': '',
      'Brand': brands[col] || '',
      'Cost': costs[col] || '',
      'Price A': priceAs[col] || '',
      'Price B': priceBs[col] || '',
    };
    
    if (item['Master Part No'] && item['Description']) {
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Extract values for a specific column field
 * Looks for header pattern, then extracts N values after it
 */
function extractColumnValues(text, headerPattern, columnCount, isText = false, isNumber = false) {
  const values = [];
  const regex = new RegExp(headerPattern, 'gi');
  let match;
  
  while ((match = regex.exec(text)) !== null && values.length < columnCount) {
    // Look for values after the header
    const startPos = match.index + match[0].length;
    const segment = text.substring(startPos, startPos + 500);
    
    let value = '';
    
    if (isText) {
      // For text fields, extract capitalized words
      const textMatch = segment.match(/\b([A-Z][A-Za-z\s\(\)0-9\-]{10,80})\b/);
      if (textMatch) {
        value = textMatch[1].trim();
        // Clean up
        value = value.replace(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5})\b/g, '').trim();
        value = value.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, '').trim();
      }
    } else if (isNumber) {
      // For number fields, extract first reasonable number
      const numMatch = segment.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/);
      if (numMatch) {
        value = numMatch[1].replace(/,/g, '');
      }
    } else {
      // For other fields, extract first meaningful word/value
      const wordMatch = segment.match(/\b([A-Z0-9\-]{2,20})\b/);
      if (wordMatch) {
        value = wordMatch[1];
      }
    }
    
    if (value) {
      values.push(value);
    }
  }
  
  // If we didn't find enough values, try alternative extraction
  if (values.length < columnCount) {
    // Try finding values before headers (some sections have values first)
    const altValues = extractValuesBeforeHeaders(text, headerPattern, columnCount, isText, isNumber);
    if (altValues.length > values.length) {
      return altValues;
    }
  }
  
  return values;
}

/**
 * Alternative: Extract values that appear before headers
 */
function extractValuesBeforeHeaders(text, headerPattern, columnCount, isText, isNumber) {
  const values = [];
  const headerIndex = text.search(new RegExp(headerPattern, 'i'));
  
  if (headerIndex === -1) return values;
  
  // Look before the header
  const beforeText = text.substring(Math.max(0, headerIndex - 2000), headerIndex);
  
  // Extract values based on type
  if (isText) {
    const matches = beforeText.matchAll(/\b([A-Z][A-Za-z\s\(\)0-9\-]{15,80})\b/g);
    for (const match of matches) {
      if (values.length >= columnCount) break;
      let value = match[1].trim();
      value = value.replace(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5})\b/g, '').trim();
      if (value.length > 10) {
        values.push(value.substring(0, 200));
      }
    }
  } else if (isNumber) {
    const matches = beforeText.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
    for (const match of matches) {
      if (values.length >= columnCount) break;
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (num >= 0 && num < 10000000) {
        values.push(match[1].replace(/,/g, ''));
      }
    }
  } else {
    const matches = beforeText.matchAll(/\b([A-Z0-9\-]{2,20})\b/g);
    for (const match of matches) {
      if (values.length >= columnCount) break;
      values.push(match[1]);
    }
  }
  
  return values;
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
  console.log("🚀 PDF TO CSV - VERTICAL COLUMN PARSER");
  console.log("=".repeat(60));
  
  try {
    const text = await extractTextFromPDF();
    const items = parseItemsByVerticalColumns(text);
    
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

