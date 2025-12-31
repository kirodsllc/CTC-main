/**
 * CONVERT PDF DATA TO CSV FILE
 * Extracts all data from PDF and saves to CSV format
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
  
  // Check if extracted text already exists
  if (fs.existsSync(TEXT_PATH)) {
    console.log("   📄 Using existing extracted text file...");
    const text = fs.readFileSync(TEXT_PATH, 'utf-8');
    console.log(`   ✅ Read ${text.length} characters from existing file\n`);
    return text;
  }
  
  // Try to extract from PDF using pdfjs-dist
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
      
      if (i % 10 === 0) {
        console.log(`   ⏳ Extracted ${i}/${pdf.numPages} pages...`);
      }
    }
    
    // Save extracted text for future use
    fs.writeFileSync(TEXT_PATH, fullText);
    
    console.log(`   ✅ Extracted text from ${pdf.numPages} pages`);
    console.log(`   📊 Text length: ${fullText.length} characters`);
    console.log(`   💾 Saved to ${TEXT_PATH}\n`);
    
    return fullText;
  } catch (error) {
    console.error(`   ❌ Error extracting PDF: ${error.message}`);
    console.error(`   💡 Please ensure pdf_extracted_text.txt exists or install pdfjs-dist`);
    throw error;
  }
}

/**
 * Parse items from text with accurate field extraction
 */
function parseItemsFromText(text) {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 PARSING ITEMS FROM TEXT");
  console.log("=".repeat(60) + "\n");
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  const items = [];
  const seenPartNos = new Set();
  
  // Collect all part numbers
  const allPartNumbers = new Set();
  
  for (const line of lines) {
    if (line.match(/^(Page|of|\d+)$/i) || line.length < 10) continue;
    
    // Extract part numbers - various formats
    const partNoMatches = line.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g);
    
    for (const match of partNoMatches) {
      const partNo = match[1];
      // Filter out numbers that are clearly prices, weights, or other data
      if (partNo.includes('.') || partNo.match(/^\d{1,3}$/)) continue;
      allPartNumbers.add(partNo);
    }
  }
  
  console.log(`   📊 Found ${allPartNumbers.size} unique part numbers`);
  console.log(`   ⏳ Processing items...\n`);
  
  // Extract data for each part number
  let processed = 0;
  for (const masterPartNo of allPartNumbers) {
    if (seenPartNos.has(masterPartNo)) continue;
    
    processed++;
    if (processed % 500 === 0) {
      process.stdout.write(`   ⏳ Processing item ${processed} of ${allPartNumbers.size}...\r`);
    }
    
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
    
    // Find all lines containing this part number
    const relevantLines = lines.filter(line => 
      line.includes(masterPartNo) && 
      line.length > 20
    );
    
    if (relevantLines.length === 0) continue;
    
    const combinedText = relevantLines.join(' ');
    
    // Extract Origin
    const originMatch = combinedText.match(/\b(PRC|USA|ITAL|TURK|IND|KOR|UK|CHN|AFR|TAIW|JAP|GER|SAM)\b/i);
    if (originMatch) {
      item['Origin'] = originMatch[1].toUpperCase();
    }
    
    // Extract Grade
    const gradeMatch = combinedText.match(/\b([ABC])\b/);
    if (gradeMatch) {
      item['Grade'] = gradeMatch[1];
    }
    
    // Extract Application
    const appMatch = combinedText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM)\b/i);
    if (appMatch) {
      item['Application'] = appMatch[1].toUpperCase();
    }
    
    // Extract Main Category
    const mainCatMatch = combinedText.match(/\b(ENGINE-PARTS|TRANSMISSION-PARTS|VEHICLE-PARTS|GASKET-KIT|PUMPS|UNDER-CARRIAGE|G\.E\.T|HYDRAULIC_FILTER|SEAL-[A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
    if (mainCatMatch) {
      item['Main Category'] = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
    }
    
    // Extract Sub Category
    const subCatMatch = combinedText.match(/\b(BEARINGS|SEAL-[A-Z]+|GASKET|FILTER|SEAL-ASSLY|SEAL-OIL|SEAL-PACKING|SEAL-RING|SEAL-CRANKSHAFT|SEAL-O-RING)\b/i);
    if (subCatMatch && (!item['Main Category'] || !item['Main Category'].includes(subCatMatch[1]))) {
      item['Sub Category'] = subCatMatch[1].replace(/-/g, ' ').trim();
    }
    
    // Extract Description
    const descPattern = new RegExp(`${masterPartNo}\\s+([A-Z][A-Z\\s\\(\\)0-9]{10,80})`, 'i');
    const descMatch = combinedText.match(descPattern);
    if (descMatch) {
      item['Description'] = descMatch[1].trim().substring(0, 200);
    } else {
      // Fallback: look for capitalized words near part number
      const words = combinedText.split(/\s+/);
      const partIndex = words.findIndex(w => w === masterPartNo);
      if (partIndex >= 0) {
        const descWords = words.slice(partIndex + 1).filter(w => 
          w.length > 2 && 
          !w.match(/^\d+\.?\d*$/) &&
          !w.match(/^[A-Z]{1,3}$/) &&
          /[A-Z]/.test(w)
        );
        if (descWords.length > 0) {
          item['Description'] = descWords.slice(0, 15).join(' ').trim().substring(0, 200);
        }
      }
    }
    
    // Extract numbers for cost, prices, weight, order level
    const numbers = combinedText.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
    if (numbers) {
      const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
      
      // Cost - usually first reasonable number (50-1000000)
      const costIndex = nums.findIndex(n => n >= 50 && n < 1000000);
      if (costIndex >= 0) {
        item['Cost'] = numbers[costIndex].replace(/,/g, '');
      }
      
      // Price A - usually after cost, larger than cost
      const priceAIndex = nums.findIndex((n, i) => i > costIndex && n > 100 && n < 1000000);
      if (priceAIndex >= 0) {
        item['Price A'] = numbers[priceAIndex].replace(/,/g, '');
      }
      
      // Price B - usually after Price A
      const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n > 100 && n < 1000000);
      if (priceBIndex >= 0) {
        item['Price B'] = numbers[priceBIndex].replace(/,/g, '');
      }
      
      // Weight - usually a decimal
      const weightMatch = combinedText.match(/\b(\d+\.\d+)\b/);
      if (weightMatch) {
        item['Weight'] = weightMatch[1];
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
    
    // Extract Size
    const sizeMatch = combinedText.match(/\b(\d+X\d+X\d+|\d+X\d+MM?)\b/i);
    if (sizeMatch) {
      item['Size'] = sizeMatch[1];
    }
    
    // Extract Brand (from application if available, or look for brand patterns)
    if (item['Application'] && !item['Brand']) {
      item['Brand'] = item['Application'];
    } else {
      const brandMatch = combinedText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|HYUNDAI|KOBELCO|HITACHI|VOLVO|JCB|CASE|DEERE)\b/i);
      if (brandMatch) {
        item['Brand'] = brandMatch[1].toUpperCase();
      }
    }
    
    // Only add if we have at least part number and description
    if (item['Master Part No'] && item['Description']) {
      items.push(item);
      seenPartNos.add(masterPartNo);
    }
  }
  
  console.log(`\n   ✅ PARSED ${items.length} items from text\n`);
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
  
  // Define CSV columns in order
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
  
  // Create CSV header
  const header = columns.map(col => `"${col}"`).join(',');
  
  // Create CSV rows
  const rows = items.map(item => {
    return columns.map(col => {
      const value = item[col] || '';
      // Escape quotes and wrap in quotes
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  
  // Combine header and rows
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
  console.log("🚀 PDF TO CSV CONVERTER");
  console.log("=".repeat(60));
  
  try {
    // Step 1: Extract text from PDF
    const text = await extractTextFromPDF();
    
    // Step 2: Parse items from text
    const items = parseItemsFromText(text);
    
    if (items.length === 0) {
      console.error("\n❌ No items extracted from PDF!");
      process.exit(1);
    }
    
    // Step 3: Convert to CSV
    const csv = convertToCSV(items);
    
    // Step 4: Save CSV file
    saveCSV(csv, CSV_PATH);
    
    // Summary
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

// Run main function
main().catch(console.error);

