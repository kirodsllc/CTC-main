/**
 * Script to extract items from PDF, convert to Excel, and import into the app.
 * Run: node import-items-from-pdf.js
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;
const PDF_PATH = path.join(__dirname, "CTC Item Lists.pdf");

/**
 * Extract text from PDF
 */
async function extractPDFText(pdfPath) {
  console.log(`📄 Extracting data from PDF: ${pdfPath}`);
  
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  
  console.log(`✅ Extracted text from PDF (${data.numpages} pages)`);
  return data.text;
}

/**
 * Parse text into structured data
 * This is a basic parser - you may need to adjust based on your PDF structure
 */
function parseTextToItems(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const items = [];
  
  // Try to detect table structure
  // Look for patterns like: Part No | Brand | Description | etc.
  let headers = null;
  let headerLineIndex = -1;
  
  // Find header row (usually contains keywords like "Part", "Brand", "Description", etc.)
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('part') && (line.includes('brand') || line.includes('description'))) {
      headers = lines[i].split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h);
      headerLineIndex = i;
      break;
    }
  }
  
  // If no clear headers, try to parse as structured data
  if (!headers) {
    console.log("⚠️  No clear headers found. Attempting to parse all lines as items...");
    
    // Try to extract items based on common patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines and page numbers
      if (!line || line.match(/^\d+$/) || line.toLowerCase().includes('page')) {
        continue;
      }
      
      // Try to split by multiple spaces or tabs
      const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 2) {
        const item = {
          part_no: parts[0] || `ITEM_${items.length + 1}`,
          description: parts.slice(1).join(' ') || parts[0] || '',
          brand_name: parts[1] || '',
        };
        
        // Try to extract more fields
        if (parts.length >= 3) {
          item.brand_name = parts[1] || '';
          item.description = parts.slice(2).join(' ') || '';
        }
        
        items.push(item);
      }
    }
  } else {
    console.log(`✅ Found headers: ${headers.join(', ')}`);
    
    // Parse data rows
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines and page numbers
      if (!line || line.match(/^\d+$/) || line.toLowerCase().includes('page')) {
        continue;
      }
      
      // Split by multiple spaces or tabs
      const values = line.split(/\s{2,}|\t/).map(v => v.trim()).filter(v => v);
      
      if (values.length >= 1) {
        const item = {};
        
        // Map values to headers
        headers.forEach((header, idx) => {
          const headerLower = header.toLowerCase();
          const value = values[idx] || '';
          
          if (headerLower.includes('part')) {
            item.part_no = value;
          } else if (headerLower.includes('brand')) {
            item.brand_name = value;
          } else if (headerLower.includes('description') || headerLower.includes('desc')) {
            item.description = value;
          } else if (headerLower.includes('category')) {
            item.category = value;
          } else if (headerLower.includes('subcategory') || headerLower.includes('sub')) {
            item.subcategory = value;
          } else if (headerLower.includes('application') || headerLower.includes('app')) {
            item.application = value;
          } else if (headerLower.includes('uom') || headerLower.includes('unit')) {
            item.uom = value;
          } else if (headerLower.includes('cost') || headerLower.includes('price')) {
            item.cost = value;
          } else if (headerLower.includes('price')) {
            item.price_a = value;
          }
        });
        
        // Ensure part_no exists
        if (!item.part_no && item.description) {
          item.part_no = item.description.substring(0, 20) || `ITEM_${items.length + 1}`;
        }
        
        if (item.part_no || item.description) {
          items.push(item);
        }
      }
    }
  }
  
  // Normalize items
  return items.map((item, idx) => ({
    part_no: item.part_no || item.description || `ITEM_${idx + 1}`,
    brand_name: item.brand_name || '',
    description: item.description || item.part_no || '',
    category: item.category || '',
    subcategory: item.subcategory || '',
    application: item.application || '',
    uom: item.uom || 'pcs',
    cost: item.cost || '',
    price_a: item.price_a || '',
    status: 'active',
  }));
}

/**
 * Save data to Excel
 */
async function saveToExcel(items, excelPath) {
  console.log(`📊 Saving to Excel: ${excelPath}`);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');
  
  // Add headers
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
  
  // Add data
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
  
  await workbook.xlsx.writeFile(excelPath);
  console.log(`✅ Saved ${items.length} rows to Excel`);
  return true;
}

/**
 * Import items to the app
 */
async function importItemsToApp(items) {
  console.log(`\n📤 Importing ${items.length} items to the app...`);
  
  // Check if backend is running
  try {
    const fetch = (await import('node-fetch')).default;
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
  
  const fetch = (await import('node-fetch')).default;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    
    try {
      // Prepare API payload
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
      
      // Add optional numeric fields
      if (item.cost) {
        try {
          payload.cost = parseFloat(String(item.cost).replace(/,/g, ''));
        } catch (e) {
          // Ignore invalid cost
        }
      }
      
      if (item.price_a) {
        try {
          payload.price_a = parseFloat(String(item.price_a).replace(/,/g, ''));
        } catch (e) {
          // Ignore invalid price
        }
      }
      
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key];
        }
      });
      
      // Make API call
      const response = await fetch(PARTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        const errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${response.status} - ${errorText.substring(0, 100)}`;
        errors.push(errorMsg);
        console.log(`  ❌ Error importing item ${idx + 1}: ${response.status}`);
      }
    } catch (error) {
      errorCount++;
      const errorMsg = `Item ${idx + 1} (${item.part_no || 'N/A'}): ${error.message.substring(0, 100)}`;
      errors.push(errorMsg);
      console.log(`  ❌ Exception importing item ${idx + 1}: ${error.message.substring(0, 100)}`);
    }
    
    // Small delay to avoid overwhelming the server
    if ((idx + 1) % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ Import Summary:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  First 10 errors:`);
    errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
  }
  
  return { success: successCount, errors: errorCount };
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("CTC Item Lists - PDF to App Import");
  console.log("=".repeat(60));
  
  try {
    // Step 1: Extract from PDF
    const pdfText = await extractPDFText(PDF_PATH);
    
    // Save raw text for debugging
    fs.writeFileSync('pdf_extracted_text.txt', pdfText, 'utf-8');
    console.log("✅ Saved raw text to pdf_extracted_text.txt");
    
    // Step 2: Parse text to items
    console.log("\n🔄 Parsing text to items...");
    const items = parseTextToItems(pdfText);
    console.log(`✅ Parsed ${items.length} items`);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found in PDF!");
      console.log("   Please check pdf_extracted_text.txt to see the extracted text.");
      console.log("   You may need to manually adjust the parsing logic.");
      return;
    }
    
    // Step 3: Save to Excel
    const excelPath = path.join(__dirname, "CTC Item Lists.xlsx");
    await saveToExcel(items, excelPath);
    
    // Step 4: Import to app
    console.log("\n" + "=".repeat(60));
    console.log("Ready to import items to the app.");
    console.log(`Total items: ${items.length}`);
    console.log("=".repeat(60));
    
    // Auto-import (you can change this to prompt for confirmation)
    const shouldImport = process.argv.includes('--auto-import') || process.argv.includes('-y');
    
    if (shouldImport) {
      await importItemsToApp(items);
    } else {
      console.log("\n⚠️  To import items, run with --auto-import flag:");
      console.log("   node import-items-from-pdf.js --auto-import");
      console.log("\n   Or review the Excel file first: CTC Item Lists.xlsx");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);
