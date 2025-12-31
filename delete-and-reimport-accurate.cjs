/**
 * DELETE ALL PARTS AND RE-IMPORT FROM PDF WITH ACCURATE VERIFICATION
 * Step by step, one by one, with verification
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;

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
 * STEP 1: Delete ALL parts from database
 */
async function deleteAllParts() {
  console.log("\n🗑️  STEP 1: DELETING ALL EXISTING PARTS...");
  console.log("=" .repeat(60));
  
  try {
    let totalDeleted = 0;
    let page = 1;
    const limit = 1000;
    
    while (true) {
      const response = await fetch(`${API_BASE_URL}/parts?limit=${limit}&page=${page}`);
      if (!response.ok) {
        console.log(`   ⚠️  No more parts to delete (status: ${response.status})`);
        break;
      }
      
      const data = await response.json();
      const parts = data.data || data || [];
      
      if (parts.length === 0) {
        console.log(`   ✅ No more parts found`);
        break;
      }
      
      console.log(`   📄 Page ${page}: Found ${parts.length} parts, deleting...`);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        try {
          const deleteResponse = await fetch(`${API_BASE_URL}/parts/${part.id}`, {
            method: 'DELETE',
          });
          
          if (deleteResponse.ok) {
            totalDeleted++;
            if (totalDeleted % 100 === 0) {
              process.stdout.write(`   ✅ Deleted ${totalDeleted}...\r`);
            }
          } else {
            const errorData = await deleteResponse.json().catch(() => ({}));
            if (errorData.error && errorData.error.includes('kit')) {
              console.log(`\n   ⚠️  Part ${part.part_no} is used in kit, skipping...`);
            }
          }
        } catch (error) {
          // Continue on error
        }
      }
      
      if (parts.length < limit) break;
      page++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n   ✅ TOTAL DELETED: ${totalDeleted} parts`);
    
    // Verify deletion
    const verifyResponse = await fetch(`${API_BASE_URL}/parts?limit=1`);
    const verifyData = await verifyResponse.json();
    const remainingParts = verifyData.data || verifyData || [];
    
    if (remainingParts.length === 0) {
      console.log(`   ✅ VERIFICATION: Database is empty, ready for import\n`);
    } else {
      console.log(`   ⚠️  WARNING: ${remainingParts.length} parts still remain\n`);
    }
    
    return totalDeleted;
  } catch (error) {
    console.error(`   ❌ Error deleting parts: ${error.message}`);
    throw error;
  }
}

/**
 * STEP 2: Read extracted text from file (or extract from PDF if needed)
 */
async function extractTextFromPDF(pdfPath) {
  console.log("\n📄 STEP 2: READING EXTRACTED TEXT FROM PDF...");
  console.log("=" .repeat(60));
  
  try {
    // Try to use existing extracted text file first
    const textPath = path.join(__dirname, 'pdf_extracted_text.txt');
    if (fs.existsSync(textPath)) {
      console.log(`   📄 Using existing extracted text file...`);
      const text = fs.readFileSync(textPath, 'utf-8');
      console.log(`   ✅ Read ${text.length} characters from existing file\n`);
      return text;
    }
    
    // If no text file, try to read from PDF (requires pdfjs-dist)
    console.log(`   ⚠️  No extracted text file found. Trying to extract from PDF...`);
    console.log(`   💡 If this fails, run the extraction script first to create pdf_extracted_text.txt`);
    
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    const pdfBytes = fs.readFileSync(pdfPath);
    
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
    fs.writeFileSync(textPath, fullText);
    
    console.log(`   ✅ Extracted text from ${pdf.numPages} pages`);
    console.log(`   📊 Text length: ${fullText.length} characters`);
    console.log(`   💾 Saved to ${textPath}\n`);
    
    return fullText;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    console.error(`   💡 Please ensure pdf_extracted_text.txt exists or install pdfjs-dist`);
    throw error;
  }
}

/**
 * STEP 3: Parse items from text using the proven extraction logic
 */
function parseItemsFromText(text) {
  console.log("\n🔍 STEP 3: PARSING ITEMS FROM TEXT (ONE BY ONE)...");
  console.log("=" .repeat(60));
  
  // Use the proven extraction logic from complete-extract-import.cjs
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 10);
  const items = [];
  const seenPartNos = new Set();
  
  // First, collect all part numbers
  const allPartNumbers = new Set();
  
  for (const line of lines) {
    if (line.match(/^(Page|of|\d+)$/i) || line.length < 10) continue;
    
    const partNoMatches = line.matchAll(/\b([0-9]{6,7}|[0-9]{5}-[0-9]{5}|[0-9]{3}-[0-9]{2}-[0-9]{5}|[A-Z0-9\-]{4,15})\b/g);
    
    for (const match of partNoMatches) {
      const partNo = match[1];
      if (partNo.includes('.') || partNo.match(/^\d{1,3}$/)) continue;
      allPartNumbers.add(partNo);
    }
  }
  
  console.log(`   📊 Found ${allPartNumbers.size} unique part numbers`);
  
  // Extract data for each part number
  let processed = 0;
  for (const masterPartNo of allPartNumbers) {
    if (seenPartNos.has(masterPartNo)) continue;
    
    processed++;
    if (processed % 500 === 0) {
      console.log(`   ⏳ Processing item ${processed} of ${allPartNumbers.size}...`);
    }
    
    const item = {
      master_part_no: masterPartNo,
      part_no: masterPartNo,
      origin: '',
      description: '',
      application: '',
      grade: '',
      order_level: '',
      weight: '',
      main_category: '',
      sub_category: '',
      size: '',
      brand: '',
      cost: '',
      price_a: '',
      price_b: '',
      status: 'active',
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
      item.origin = originMatch[1].toUpperCase();
    }
    
    // Extract Grade
    const gradeMatch = combinedText.match(/\b([ABC])\b/);
    if (gradeMatch) {
      item.grade = gradeMatch[1];
    }
    
    // Extract Application
    const appMatch = combinedText.match(/\b(CATERPILLER|KOMATSU|CUMMINS|SEAL-CAT|SEAL-KOM)\b/i);
    if (appMatch) {
      item.application = appMatch[1].toUpperCase();
    }
    
    // Extract Main Category
    const mainCatMatch = combinedText.match(/\b(ENGINE-PARTS|TRANSMISSION-PARTS|VEHICLE-PARTS|GASKET-KIT|PUMPS|UNDER-CARRIAGE|G\.E\.T|HYDRAULIC_FILTER|SEAL-[A-Z]+|BEARINGS|GASKET|FILTER)\b/i);
    if (mainCatMatch) {
      item.main_category = mainCatMatch[1].replace(/_/g, ' ').replace(/-/g, ' ').trim();
    }
    
    // Extract Sub Category
    const subCatMatch = combinedText.match(/\b(BEARINGS|SEAL-[A-Z]+|GASKET|FILTER|SEAL-ASSLY|SEAL-OIL|SEAL-PACKING|SEAL-RING|SEAL-CRANKSHAFT|SEAL-O-RING)\b/i);
    if (subCatMatch && (!item.main_category || !item.main_category.includes(subCatMatch[1]))) {
      item.sub_category = subCatMatch[1].replace(/-/g, ' ').trim();
    }
    
    // Extract Description
    const descPattern = new RegExp(`${masterPartNo}\\s+([A-Z][A-Z\\s\\(\\)0-9]{10,80})`, 'i');
    const descMatch = combinedText.match(descPattern);
    if (descMatch) {
      item.description = descMatch[1].trim().substring(0, 200);
    } else {
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
          item.description = descWords.slice(0, 15).join(' ').trim().substring(0, 200);
        }
      }
    }
    
    // Extract numbers for cost, prices, weight
    const numbers = combinedText.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g);
    if (numbers) {
      const nums = numbers.map(n => parseFloat(n.replace(/,/g, '')));
      
      const costIndex = nums.findIndex(n => n >= 50 && n < 1000000);
      if (costIndex >= 0) {
        item.cost = numbers[costIndex].replace(/,/g, '');
      }
      
      const priceAIndex = nums.findIndex((n, i) => i > costIndex && n > 100 && n < 1000000);
      if (priceAIndex >= 0) {
        item.price_a = numbers[priceAIndex].replace(/,/g, '');
      }
      
      const priceBIndex = nums.findIndex((n, i) => i > priceAIndex && n > 100 && n < 1000000);
      if (priceBIndex >= 0) {
        item.price_b = numbers[priceBIndex].replace(/,/g, '');
      }
      
      const weightMatch = combinedText.match(/\b(\d+\.\d+)\b/);
      if (weightMatch) {
        item.weight = weightMatch[1];
      }
    }
    
    // Extract Size
    const sizeMatch = combinedText.match(/\b(\d+X\d+X\d+|\d+X\d+MM?)\b/i);
    if (sizeMatch) {
      item.size = sizeMatch[1];
    }
    
    // Extract Brand (from application if available)
    if (item.application && !item.brand) {
      item.brand = item.application;
    }
    
    // Only add if we have at least part number and description
    if (item.master_part_no && item.description) {
      items.push(item);
      seenPartNos.add(masterPartNo);
    }
  }
  
  console.log(`\n   ✅ PARSED ${items.length} items from text`);
  return items;
}

/**
 * STEP 4: Import items ONE BY ONE with verification
 */
async function importItemsWithVerification(items) {
  console.log("\n📤 STEP 4: IMPORTING ITEMS ONE BY ONE WITH VERIFICATION...");
  console.log("=" .repeat(60));
  
  // Check backend
  try {
    const testResponse = await fetch(`${API_BASE_URL}/parts?limit=1`);
    if (!testResponse.ok) {
      throw new Error(`Backend not responding. Status: ${testResponse.status}`);
    }
  } catch (error) {
    console.error(`   ❌ Cannot connect to backend at ${API_BASE_URL}`);
    console.error(`   Error: ${error.message}`);
    return { success: 0, errors: items.length, verified: 0 };
  }
  
  let successCount = 0;
  let errorCount = 0;
  let verifiedCount = 0;
  const errors = [];
  
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    
    if ((idx + 1) % 100 === 0) {
      console.log(`   ⏳ Progress: ${idx + 1}/${items.length} (${successCount} success, ${errorCount} errors)`);
    }
    
    try {
      // Map fields accurately according to user specification
      const payload = {
        master_part_no: item.master_part_no || '',
        part_no: item.part_no || item.master_part_no || '',
        brand_name: item.brand || '',
        description: item.description || item.part_no || '',
        category_name: item.main_category || '',
        subcategory_name: item.sub_category || '',
        application_name: item.application || '',
        origin: item.origin || '',
        grade: item.grade || '',
        reorder_level: item.order_level ? parseInt(item.order_level) : 0,
        weight: item.weight ? parseFloat(item.weight) : null,
        cost: item.cost ? parseFloat(String(item.cost).replace(/,/g, '')) : null,
        price_a: item.price_a ? parseFloat(String(item.price_a).replace(/,/g, '')) : null,
        price_b: item.price_b ? parseFloat(String(item.price_b).replace(/,/g, '')) : null,
        size: item.size || '',
        status: 'active',
        uom: 'pcs',
      };
      
      // Import item
      const response = await fetch(PARTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        errorCount++;
        errors.push({
          item: idx + 1,
          part_no: item.master_part_no,
          error: errorData.error || `HTTP ${response.status}`,
        });
        continue;
      }
      
      const result = await response.json();
      const createdPart = result.data || result;
      
      // VERIFY: Check if item was created correctly
      if (createdPart && createdPart.id) {
        const verifyResponse = await fetch(`${API_BASE_URL}/parts/${createdPart.id}`);
        if (verifyResponse.ok) {
          const verifiedPart = await verifyResponse.json();
          const verified = verifiedPart.data || verifiedPart;
          
          // Verify key fields match
          const masterPartMatch = verified.master_part_no === payload.master_part_no;
          const partNoMatch = verified.part_no === payload.part_no;
          const descMatch = verified.description === payload.description;
          
          if (masterPartMatch && partNoMatch && descMatch) {
            verifiedCount++;
            successCount++;
          } else {
            errorCount++;
            errors.push({
              item: idx + 1,
              part_no: item.master_part_no,
              error: 'Verification failed - data mismatch',
            });
          }
        } else {
          successCount++; // Created but couldn't verify
        }
      } else {
        successCount++; // Created but no ID returned
      }
      
    } catch (error) {
      errorCount++;
      errors.push({
        item: idx + 1,
        part_no: item.master_part_no,
        error: error.message,
      });
    }
    
    // Small delay to avoid overwhelming the server
    if ((idx + 1) % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n   ✅ IMPORT COMPLETE:`);
  console.log(`      Success: ${successCount}`);
  console.log(`      Verified: ${verifiedCount}`);
  console.log(`      Errors: ${errorCount}`);
  
  if (errors.length > 0 && errors.length <= 20) {
    console.log(`\n   ⚠️  ERRORS:`);
    errors.forEach(err => {
      console.log(`      Item ${err.item} (${err.part_no}): ${err.error}`);
    });
  }
  
  return { success: successCount, errors: errorCount, verified: verifiedCount };
}

/**
 * MAIN FUNCTION
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 DELETE AND RE-IMPORT FROM PDF - ACCURATE VERSION");
  console.log("=".repeat(60));
  
  const pdfPath = path.join(__dirname, 'CTC Item Lists.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`\n❌ PDF file not found: ${pdfPath}`);
    process.exit(1);
  }
  
  try {
    // STEP 1: Delete all parts
    await deleteAllParts();
    
    // STEP 2: Extract text from PDF
    const text = await extractTextFromPDF(pdfPath);
    
    // Save extracted text for debugging
    fs.writeFileSync('pdf_extracted_text_accurate.txt', text);
    console.log(`   💾 Saved extracted text to pdf_extracted_text_accurate.txt\n`);
    
    // STEP 3: Parse items
    const items = parseItemsFromText(text);
    
    if (items.length === 0) {
      console.error(`\n❌ No items extracted from PDF!`);
      process.exit(1);
    }
    
    // Save to Excel for verification
    const excelPath = 'CTC Item Lists - Accurate Import.xlsx';
    await saveToExcel(items, excelPath);
    
    // STEP 4: Import with verification
    const result = await importItemsWithVerification(items);
    
    // FINAL SUMMARY
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(60));
    console.log(`   Total Items Extracted: ${items.length}`);
    console.log(`   Successfully Imported: ${result.success}`);
    console.log(`   Verified Correctly: ${result.verified}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Excel File: ${excelPath}`);
    console.log("=".repeat(60) + "\n");
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper function to save to Excel
async function saveToExcel(items, excelPath) {
  console.log(`\n📊 Saving ${items.length} items to Excel for verification...`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');
  
  worksheet.columns = [
    { header: 'Master Part No', key: 'master_part_no', width: 20 },
    { header: 'Part No', key: 'part_no', width: 20 },
    { header: 'Origin', key: 'origin', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Application', key: 'application', width: 15 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Order Level', key: 'order_level', width: 12 },
    { header: 'Weight', key: 'weight', width: 12 },
    { header: 'Main Category', key: 'main_category', width: 20 },
    { header: 'Sub Category', key: 'sub_category', width: 20 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'Brand', key: 'brand', width: 15 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Price A', key: 'price_a', width: 12 },
    { header: 'Price B', key: 'price_b', width: 12 },
  ];
  
  items.forEach(item => {
    worksheet.addRow(item);
  });
  
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  await workbook.xlsx.writeFile(excelPath);
  console.log(`   ✅ Excel file created: ${excelPath}\n`);
}

// Run main function
main().catch(console.error);

