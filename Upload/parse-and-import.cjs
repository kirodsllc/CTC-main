/**
 * Parse extracted PDF text and import all items
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const API_BASE_URL = "http://localhost:3001/api";
const PARTS_ENDPOINT = `${API_BASE_URL}/parts`;

function parsePDFText(text) {
  console.log("🔄 Parsing PDF text to extract items...");
  
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 2);
  const items = [];
  const seenPartNos = new Set();
  
  // Look for part number patterns (alphanumeric codes, often 6-7 digits or alphanumeric)
  const partNoPattern = /\b([A-Z0-9\-]{4,15})\b/g;
  
  // Extract all potential part numbers and their contexts
  let currentContext = {
    partNo: null,
    description: '',
    price: null,
    cost: null,
    brand: '',
    category: '',
    application: '',
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip page numbers and headers
    if (line.match(/^(Page|of|\d+)$/i) || line.length < 3) continue;
    
    // Look for part numbers (typically 6-7 digit codes or alphanumeric)
    const partMatches = line.match(/\b([0-9]{6,7}|[A-Z0-9\-]{6,12})\b/g);
    
    if (partMatches) {
      for (const match of partMatches) {
        // Skip if it's clearly a price or other number
        if (match.includes('.') || parseInt(match) > 9999999) continue;
        
        // Check if this looks like a part number
        if (/^[0-9]{6,7}$/.test(match) || /^[A-Z0-9\-]{6,12}$/i.test(match)) {
          // Extract description from surrounding text
          const words = line.split(/\s+/);
          const partIndex = words.findIndex(w => w.includes(match));
          
          if (partIndex >= 0) {
            // Get description (text after part number)
            const descParts = words.slice(partIndex + 1).filter(w => 
              !w.match(/^\d+\.?\d*$/) && // Not a number
              !w.match(/^[A-Z]{1,3}$/) && // Not a short code
              w.length > 2
            );
            
            const description = descParts.slice(0, 10).join(' ').trim();
            
            if (description && !seenPartNos.has(match)) {
              items.push({
                part_no: match,
                description: description || match,
                brand_name: '',
                category: '',
                subcategory: '',
                application: '',
                uom: 'pcs',
                cost: '',
                price_a: '',
                status: 'active',
              });
              seenPartNos.add(match);
            }
          }
        }
      }
    }
    
    // Also look for descriptions that might indicate items
    if (line.length > 20 && !line.match(/^\d+/) && !line.match(/^[A-Z\s]{1,20}$/)) {
      // This might be a description line
      const words = line.split(/\s+/);
      if (words.length >= 3 && words[0].length > 2) {
        // Check if first word could be a part number
        const firstWord = words[0];
        if (/^[A-Z0-9\-]{4,12}$/i.test(firstWord) && !seenPartNos.has(firstWord)) {
          const description = words.slice(1).join(' ').substring(0, 200);
          if (description.length > 5) {
            items.push({
              part_no: firstWord,
              description: description,
              brand_name: '',
              category: '',
              subcategory: '',
              application: '',
              uom: 'pcs',
              cost: '',
              price_a: '',
              status: 'active',
            });
            seenPartNos.add(firstWord);
          }
        }
      }
    }
  }
  
  // Try to extract additional info from context
  // Look for CATERPILLER, KOMATSU, etc. as brands
  const brandPattern = /(CATERPILLER|KOMATSU|CUMMINS|CAT|ITR|R|WG|CTC)/gi;
  const categoryPattern = /(ENGINE-PARTS|TRANSMISSION-PARTS|VEHICLE-PARTS|GASKET-KIT|PUMPS|UNDER-CARRIAGE|G\.E\.T)/gi;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const searchText = text.substring(Math.max(0, text.indexOf(item.part_no) - 500), 
                                     Math.min(text.length, text.indexOf(item.part_no) + 500));
    
    // Extract brand
    const brandMatch = searchText.match(brandPattern);
    if (brandMatch) {
      const brand = brandMatch[0].toUpperCase();
      if (brand !== 'CAT' && brand !== 'R' && brand !== 'WG' && brand !== 'ITR' && brand !== 'CTC') {
        item.brand_name = brand;
      }
    }
    
    // Extract category
    const catMatch = searchText.match(categoryPattern);
    if (catMatch) {
      item.category = catMatch[0].replace(/-/g, ' ').trim();
    }
    
    // Extract application (CATERPILLER, KOMATSU, etc.)
    const appMatch = searchText.match(/(CATERPILLER|KOMATSU|CUMMINS)/gi);
    if (appMatch) {
      item.application = appMatch[0].toUpperCase();
    }
  }
  
  console.log(`✅ Extracted ${items.length} unique items`);
  return items;
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
  
  // Use built-in fetch (Node 18+) or require node-fetch
  let fetch;
  try {
    fetch = globalThis.fetch || (await import('node-fetch')).default;
  } catch (e) {
    // Fallback to http module if fetch not available
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
  
  // Check backend
  try {
    const testResponse = await fetch(`${API_BASE_URL}/parts?limit=1`);
    if (!testResponse.ok) {
      throw new Error(`Backend not responding. Status: ${testResponse.status}`);
    }
  } catch (error) {
    console.error(`❌ Cannot connect to backend at ${API_BASE_URL}`);
    console.error(`   Error: ${error.message}`);
    return { success: 0, errors: items.length };
  }
  
  let successCount = 0;
  let errorCount = 0;
  
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
        if ((idx + 1) % 50 === 0) {
          console.log(`  ✅ Imported ${idx + 1}/${items.length} items...`);
        }
      } else {
        errorCount++;
        if (errorCount <= 10) {
          const errorText = await response.text();
          console.log(`  ❌ Error item ${idx + 1} (${item.part_no}): ${response.status}`);
        }
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 10) {
        console.log(`  ❌ Exception item ${idx + 1}: ${error.message.substring(0, 50)}`);
      }
    }
    
    if ((idx + 1) % 100 === 0) {
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
  console.log("CTC Item Lists - Parse & Import");
  console.log("=".repeat(60));
  
  const textPath = path.join(__dirname, "pdf_extracted_text.txt");
  
  if (!fs.existsSync(textPath)) {
    console.error(`❌ Extracted text file not found: ${textPath}`);
    console.error("   Please run extract-and-import.cjs first");
    return;
  }
  
  try {
    // Read extracted text
    const text = fs.readFileSync(textPath, 'utf-8');
    console.log(`✅ Read ${text.length} characters from extracted text`);
    
    // Parse to items
    const items = parsePDFText(text);
    
    if (items.length === 0) {
      console.log("\n⚠️  No items found. Check the extracted text file.");
      return;
    }
    
    // Save to Excel
    const excelPath = path.join(__dirname, "CTC Item Lists.xlsx");
    await saveToExcel(items, excelPath);
    
    // Import to app
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

