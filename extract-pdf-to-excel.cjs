/**
 * Extract PDF to Excel using pdfjs-dist
 * Run: node extract-pdf-to-excel.cjs
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function extractPDF() {
  try {
    // Dynamic import for ES module
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfjs = pdfjsLib.default;
    
    const pdfPath = path.join(__dirname, "CTC Item Lists.pdf");
    console.log(`📄 Extracting data from PDF: ${pdfPath}`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const loadingTask = pdfjs.getDocument({ data: dataBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`✅ PDF loaded: ${pdf.numPages} pages`);
    
    let allText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      allText += pageText + '\n';
      console.log(`  Processed page ${pageNum}/${pdf.numPages}`);
    }
    
    // Save raw text
    fs.writeFileSync('pdf_extracted_text.txt', allText, 'utf-8');
    console.log("✅ Saved raw text to pdf_extracted_text.txt");
    
    // Parse text to items
    const items = parseTextToItems(allText);
    console.log(`✅ Parsed ${items.length} items`);
    
    // Save to Excel
    if (items.length > 0) {
      const excelPath = path.join(__dirname, "CTC Item Lists.xlsx");
      await saveToExcel(items, excelPath);
      console.log(`✅ Excel file created: ${excelPath}`);
    }
    
    return items;
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

function parseTextToItems(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const items = [];
  
  // Try to detect table structure
  let headers = null;
  let headerLineIndex = -1;
  
  // Find header row
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('part') && (line.includes('brand') || line.includes('description'))) {
      headers = lines[i].split(/\s{2,}|\t/).map(h => h.trim()).filter(h => h);
      headerLineIndex = i;
      break;
    }
  }
  
  // Parse data
  if (!headers) {
    console.log("⚠️  No clear headers found. Parsing all lines as items...");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.match(/^\d+$/) || line.toLowerCase().includes('page')) {
        continue;
      }
      
      const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 2) {
        const item = {
          part_no: parts[0] || `ITEM_${items.length + 1}`,
          description: parts.slice(1).join(' ') || parts[0] || '',
          brand_name: parts[1] || '',
        };
        
        if (parts.length >= 3) {
          item.brand_name = parts[1] || '';
          item.description = parts.slice(2).join(' ') || '';
        }
        
        items.push(item);
      }
    }
  } else {
    console.log(`✅ Found headers: ${headers.join(', ')}`);
    
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.match(/^\d+$/) || line.toLowerCase().includes('page')) {
        continue;
      }
      
      const values = line.split(/\s{2,}|\t/).map(v => v.trim()).filter(v => v);
      
      if (values.length >= 1) {
        const item = {};
        
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
          } else if (headerLower.includes('cost')) {
            item.cost = value;
          } else if (headerLower.includes('price')) {
            item.price_a = value;
          }
        });
        
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

async function saveToExcel(items, excelPath) {
  console.log(`📊 Saving to Excel: ${excelPath}`);
  
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
  console.log(`✅ Saved ${items.length} rows to Excel`);
}

// Run
extractPDF().then(() => {
  console.log("\n✅ PDF extraction complete!");
  console.log("   Now run: node import-items-simple.cjs --auto-import");
}).catch(console.error);

