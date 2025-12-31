/**
 * Extract PDF and import all items - Run this to do everything
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;
const PDF_PATH = path.join(__dirname, "CTC Item Lists.pdf");

// Try to extract text from PDF using multiple methods
async function extractPDFText() {
  console.log("📄 Extracting text from PDF...");
  
  // Method 1: Try pdf2json
  try {
    const pdf2json = require('pdf2json');
    return new Promise((resolve, reject) => {
      const pdfParser = new pdf2json(null, 1);
      
      pdfParser.on("pdfParser_dataError", errData => {
        reject(new Error(errData.parserError));
      });
      
      pdfParser.on("pdfParser_dataReady", pdfData => {
        let text = '';
        pdfData.Pages.forEach(page => {
          page.Texts.forEach(textItem => {
            if (textItem.R) {
              textItem.R.forEach(r => {
                text += decodeURIComponent(r.T) + ' ';
              });
            }
          });
          text += '\n';
        });
        resolve(text);
      });
      
      pdfParser.loadPDF(PDF_PATH);
    });
  } catch (error) {
    console.log("  Method 1 failed, trying alternative...");
  }
  
  // Method 2: Try basic text extraction
  try {
    const dataBuffer = fs.readFileSync(PDF_PATH);
    // Simple regex to extract readable text (basic approach)
    const text = dataBuffer.toString('latin1');
    // Extract text between common PDF text markers
    const textMatches = text.match(/\([^)]+\)/g) || [];
    return textMatches.map(m => m.slice(1, -1)).join(' ');
  } catch (error) {
    throw new Error(`Failed to extract PDF: ${error.message}`);
  }
}

function parseTextToItems(text) {
  console.log("🔄 Parsing text to items...");
  const lines = text.split(/\n|\r/).map(line => line.trim()).filter(line => line && line.length > 2);
  const items = [];
  
  // Look for structured data patterns
  let currentItem = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers and headers
    if (line.match(/^\d+$/) || line.toLowerCase().includes('page') || line.length < 3) {
      continue;
    }
    
    // Try to detect item patterns
    // Common patterns: Part numbers, descriptions, etc.
    const words = line.split(/\s+/).filter(w => w);
    
    if (words.length >= 2) {
      // Check if line looks like a part number (alphanumeric, possibly with dashes)
      const partNoPattern = /^[A-Z0-9\-]+$/i;
      const firstWord = words[0];
      
      if (partNoPattern.test(firstWord) || firstWord.length >= 3) {
        // This might be a new item
        if (currentItem && (currentItem.part_no || currentItem.description)) {
          items.push(currentItem);
        }
        
        currentItem = {
          part_no: firstWord,
          description: words.slice(1).join(' ') || firstWord,
          brand_name: '',
          category: '',
          subcategory: '',
          application: '',
          uom: 'pcs',
          cost: '',
          price_a: '',
          status: 'active',
        };
      } else if (currentItem) {
        // Continue building current item
        currentItem.description += ' ' + line;
      } else {
        // New item without clear part number
        currentItem = {
          part_no: `ITEM_${items.length + 1}`,
          description: line,
          brand_name: '',
          category: '',
          subcategory: '',
          application: '',
          uom: 'pcs',
          cost: '',
          price_a: '',
          status: 'active',
        };
      }
    }
  }
  
  // Add last item
  if (currentItem && (currentItem.part_no || currentItem.description)) {
    items.push(currentItem);
  }
  
  // Clean up descriptions
  items.forEach(item => {
    item.description = item.description.trim().substring(0, 200);
    if (!item.part_no || item.part_no.startsWith('ITEM_')) {
      // Try to extract part number from description
      const descWords = item.description.split(/\s+/);
      if (descWords.length > 0 && /^[A-Z0-9\-]+$/i.test(descWords[0])) {
        item.part_no = descWords[0];
        item.description = descWords.slice(1).join(' ') || item.description;
      }
    }
  });
  
  // Remove duplicates based on part_no
  const seen = new Set();
  const uniqueItems = items.filter(item => {
    if (seen.has(item.part_no)) {
      return false;
    }
    seen.add(item.part_no);
    return true;
  });
  
  return uniqueItems;
}

async function saveToExcel(items, excelPath) {
  console.log(`📊 Saving ${items.length} items to Excel...`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');
  
  worksheet.columns = [
    { header: 'Part No', key: 'part_no', width: 20 },
    { header: 'Brand', key: 'brand_name', width: 15 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Subcategory', key: 'subcategory', width: 15 },
    { header: 'Application', key: 'application', width: 15 },
    { header: 'UOM', key: 'uom', width: 10 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Price A', key: 'price_a', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
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
  console.log(`✅ Excel file created: ${excelPath}`);
}

async function importItemsToApp(items) {
  console.log(`\n📤 Importing ${items.length} items to the app...`);
  
  const fetch = (await import('node-fetch')).default;
  
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
  
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    
    try {
      const payload = {
        part_no: item.part_no || `ITEM_${idx + 1}`,
        brand_name: item.brand_name || '',
        description: item.description || item.part_no || '',
        category_id: item.category || '',
        subcategory_id: item.subcategory || '',
        application_id: item.application || '',
        uom: item.uom || 'pcs',
        status: item.status || 'active',
      };
      
      if (item.cost) {
        try {
          payload.cost = parseFloat(String(item.cost).replace(/,/g, ''));
        } catch (e) {}
      }
      
      if (item.price_a) {
        try {
          payload.price_a = parseFloat(String(item.price_a).replace(/,/g, ''));
        } catch (e) {}
      }
      
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });
      
      const response = await fetch(PARTS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok || response.status === 201) {
        successCount++;
        if ((idx + 1) % 10 === 0) {
          console.log(`  ✅ Imported ${idx + 1}/${items.length} items...`);
        }
      } else {
        errorCount++;
        const errorText = await response.text();
        errors.push(`Item ${idx + 1}: ${response.status}`);
        if (errorCount <= 5) {
          console.log(`  ❌ Error item ${idx + 1}: ${response.status}`);
        }
      }
    } catch (error) {
      errorCount++;
      errors.push(`Item ${idx + 1}: ${error.message}`);
      if (errorCount <= 5) {
        console.log(`  ❌ Exception item ${idx + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    
    if ((idx + 1) % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n✅ Import Complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { success: successCount, errors: errorCount };
}

async function main() {
  console.log("=".repeat(60));
  console.log("CTC Item Lists - Extract & Import");
  console.log("=".repeat(60));
  
  try {
    // Step 1: Extract PDF
    const pdfText = await extractPDFText();
    fs.writeFileSync('pdf_extracted_text.txt', pdfText, 'utf-8');
    console.log("✅ Text extracted, saved to pdf_extracted_text.txt");
    
    // Step 2: Parse to items
    const items = parseTextToItems(pdfText);
    console.log(`✅ Parsed ${items.length} unique items`);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found. Check pdf_extracted_text.txt");
      return;
    }
    
    // Step 3: Save to Excel
    const excelPath = path.join(__dirname, "CTC Item Lists.xlsx");
    await saveToExcel(items, excelPath);
    
    // Step 4: Import to app
    await importItemsToApp(items);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ All done! Items imported to the app.");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);

